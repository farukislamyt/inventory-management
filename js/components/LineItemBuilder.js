// ============================================
// js/components/LineItemBuilder.js — Line Items Management
// Shared logic for invoices and purchases
// ============================================

import { formatCurrency, escapeHtml } from '../utils.js';
import store from '../store.js';

/**
 * LineItemBuilder: Unified line items management for invoices and purchases
 * Eliminates duplication between invoice.js and purchase.js
 *
 * Usage:
 *   const builder = new LineItemBuilder({ type: 'invoice' })
 *   builder.addItem({ productId, productName, quantity, price })
 *   const totals = builder.getTotals()
 *   builder.attachListeners(containerElement)
 */
export class LineItemBuilder {
  constructor(options = {}) {
    this.type = options.type || 'invoice'; // 'invoice' or 'purchase'
    this.items = [];
    this.onItemsChange = options.onItemsChange || null;

    // Field names differ between invoice (price) and purchase (costPrice)
    this.priceField = this.type === 'invoice' ? 'price' : 'costPrice';
    this.containerSelector = options.containerSelector || '#line-items-list';
    this.totalsSelector = options.totalsSelector || '#totals-area';
  }

  /**
   * Add a new line item
   */
  addItem(item = {}) {
    const newItem = {
      productId: item.productId || '',
      productName: item.productName || '',
      quantity: parseFloat(item.quantity) || 1,
      [this.priceField]: parseFloat(item[this.priceField]) || 0,
    };
    this.items.push(newItem);
    this._notifyChange();
    return this;
  }

  /**
   * Update a line item by index
   */
  updateItem(index, updates) {
    if (index >= 0 && index < this.items.length) {
      this.items[index] = { ...this.items[index], ...updates };
      this._notifyChange();
    }
    return this;
  }

  /**
   * Remove a line item by index
   */
  removeItem(index) {
    if (index >= 0 && index < this.items.length) {
      this.items.splice(index, 1);
      this._notifyChange();
    }
    return this;
  }

  /**
   * Get all line items
   */
  getItems() {
    return [...this.items];
  }

  /**
   * Clear all line items
   */
  clear() {
    this.items = [];
    this._notifyChange();
    return this;
  }

  /**
   * Calculate totals (subtotal, tax, grand total)
   */
  getTotals() {
    const settings = store.getSettings();
    const subtotal = this.items.reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item[this.priceField] || 0)),
      0
    );

    // Tax only applies to invoices
    const taxRate = this.type === 'invoice' ? (settings.taxRate || 0) : 0;
    const taxAmount = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }

  /**
   * Get line item total price
   */
  getItemTotal(index) {
    if (index < 0 || index >= this.items.length) return 0;
    const item = this.items[index];
    return (item.quantity || 0) * (item[this.priceField] || 0);
  }

  /**
   * Build HTML for a single line item row
   */
  buildLineItemRow(item, index) {
    const products = store.getProducts() || [];
    const productOptions = products
      .map(p =>
        `<option value="${escapeHtml(p.id)}" ${item.productId === p.id ? 'selected' : ''}>
          ${escapeHtml(p.name)}
        </option>`
      )
      .join('');

    const rowTotal = this.getItemTotal(index);
    const settings = store.getSettings();
    const sym = settings.currencySymbol || '$';

    // Different labels for invoice vs purchase
    const priceLabel = this.type === 'invoice' ? 'Price' : 'Cost Price';

    return `
      <div class="line-item-row" data-idx="${index}" style="display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;">
        <div class="form-group" style="margin:0;">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Product</label>
          <select class="line-item-product" data-idx="${index}" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
            <option value="">Select product</option>
            ${productOptions}
          </select>
        </div>
        <div class="form-group" style="margin:0;">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Qty</label>
          <input type="number" class="line-item-qty" data-idx="${index}" value="${item.quantity || 1}" min="1" step="1" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">${priceLabel}</label>
          <input type="number" class="line-item-price" data-idx="${index}" value="${item[this.priceField] || ''}" min="0" step="0.01" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Total</label>
          <input type="text" class="line-item-total" data-idx="${index}" value="${formatCurrency(rowTotal, sym)}" readonly style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-secondary,#f9fafb);color:var(--text-primary,#111);font-weight:600;">
        </div>
        <button type="button" class="line-item-remove" data-idx="${index}" title="Remove item" style="padding:7px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#ef4444;cursor:pointer;font-size:13px;font-weight:700;line-height:1;margin-bottom:0;">✕</button>
      </div>`;
  }

  /**
   * Build HTML for the totals section
   */
  buildTotalsHtml() {
    const { subtotal, taxRate, taxAmount, grandTotal } = this.getTotals();
    const settings = store.getSettings();
    const sym = settings.currencySymbol || '$';

    // Show tax only for invoices
    const taxHtml =
      this.type === 'invoice'
        ? `
      <div style="display:flex;justify-content:space-between;gap:32px;font-size:14px;">
        <span style="color:var(--text-muted,#6b7280);">Tax (${taxRate}%):</span>
        <span>${formatCurrency(taxAmount, sym)}</span>
      </div>`
        : '';

    return `
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color,#e5e7eb);">
        <div style="display:flex;justify-content:space-between;gap:32px;font-size:14px;">
          <span style="color:var(--text-muted,#6b7280);">Subtotal:</span>
          <span>${formatCurrency(subtotal, sym)}</span>
        </div>
        ${taxHtml}
        <div style="display:flex;justify-content:space-between;gap:32px;font-size:20px;font-weight:700;padding-top:4px;">
          <span>Grand Total:</span>
          <span>${formatCurrency(grandTotal, sym)}</span>
        </div>
      </div>`;
  }

  /**
   * Build HTML for all line items and totals
   */
  buildAllHtml() {
    const itemsHtml = this.items.map((item, i) => this.buildLineItemRow(item, i)).join('');
    const totalsHtml = this.buildTotalsHtml();
    return `${itemsHtml}${totalsHtml}`;
  }

  /**
   * Render line items into a container
   */
  render(containerElement) {
    if (!containerElement) return;

    const listEl = containerElement.querySelector(this.containerSelector);
    const totalsEl = containerElement.querySelector(this.totalsSelector);

    if (listEl) {
      listEl.innerHTML = this.items.map((item, i) => this.buildLineItemRow(item, i)).join('');
    }
    if (totalsEl) {
      totalsEl.innerHTML = this.buildTotalsHtml();
    }

    this.attachListeners(containerElement);
    return this;
  }

  /**
   * Attach event listeners for line item interactions
   */
  attachListeners(containerElement) {
    // Product selection
    containerElement.querySelectorAll('.line-item-product').forEach(select => {
      select.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const productId = e.target.value;
        this.updateItem(idx, { productId });

        if (productId) {
          const product = store.getProductById(productId);
          if (product) {
            const price =
              this.type === 'invoice' ? product.sellingPrice : product.costPrice;
            this.updateItem(idx, { [this.priceField]: price || 0 });
          }
        }

        this.render(containerElement);
      });
    });

    // Quantity change
    containerElement.querySelectorAll('.line-item-qty').forEach(input => {
      input.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const qty = parseFloat(e.target.value) || 0;
        this.updateItem(idx, { quantity: Math.max(1, qty) });
      });
    });

    // Price change
    containerElement.querySelectorAll('.line-item-price').forEach(input => {
      input.addEventListener('change', e => {
        const idx = parseInt(e.target.dataset.idx, 10);
        const price = parseFloat(e.target.value) || 0;
        this.updateItem(idx, { [this.priceField]: Math.max(0, price) });
      });
    });

    // Remove item
    containerElement.querySelectorAll('.line-item-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const idx = parseInt(e.target.dataset.idx, 10);
        this.removeItem(idx);
        this.render(containerElement);
      });
    });

    return this;
  }

  /**
   * Set callback for when items change
   */
  onChange(callback) {
    this.onItemsChange = callback;
    return this;
  }

  /**
   * Internal: notify of changes
   */
  _notifyChange() {
    if (this.onItemsChange) {
      this.onItemsChange(this.items, this.getTotals());
    }
  }
}

/**
 * Export data formatted for store operations
 */
export function formatLineItemsForStore(lineItems, type) {
  const priceField = type === 'invoice' ? 'price' : 'costPrice';
  return lineItems.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    [priceField]: item[priceField],
  }));
}
