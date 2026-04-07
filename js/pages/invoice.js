// ============================================
// js/pages/invoice.js — Invoice Page Module
// ============================================

import store from '../store.js';
import { formatCurrency, formatDate, getInitials, escapeHtml, parseNumber, getToday, addDays } from '../utils.js';
import {
  renderPageHeader, renderBreadcrumbs, renderStatCards, renderDataTable,
  showToast, showSuccess, showError, confirmDialog, openModal,
  createFormGroup, getFormData,
} from '../components.js';

// ── Module-scoped state ────────────────────────────────

let _lineItems = [];
let _statusFilter = 'all';
let _tableApi = null;
let _statCardsApi = null;
let _unsubscribers = [];

// ── Helpers ────────────────────────────────────────────

function getSettings() { return store.getSettings(); }

function getStatusBadge(status) {
  const map = {
    draft:    { label: 'Draft',    cls: 'badge-neutral' },
    sent:     { label: 'Sent',     cls: 'badge-info' },
    paid:     { label: 'Paid',     cls: 'badge-success' },
    partial:  { label: 'Partial',  cls: 'badge-warning' },
    overdue:  { label: 'Overdue',  cls: 'badge-danger' },
    cancelled:{ label: 'Cancelled',cls: 'badge-danger' },
  };
  const entry = map[status] || { label: status, cls: 'badge-neutral' };
  return `<span class="badge ${entry.cls}">${entry.label}</span>`;
}

function getTableData() {
  const invoices = store.getInvoices() || [];
  const customers = store.getCustomers() || [];
  const settings = getSettings();
  const sym = settings.currencySymbol || '$';

  let data = invoices.map(inv => {
    const customer = customers.find(c => c.id === inv.customerId);
    const customerName = customer ? customer.name : (inv.customerName || 'Unknown');
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName,
      _sortDate: inv.date || '',
      date: inv.date,
      dueDate: inv.dueDate,
      totalAmount: inv.totalAmount || 0,
      status: inv.status || 'draft',
      _sym: sym,
    };
  });

  if (_statusFilter !== 'all') {
    data = data.filter(d => d.status === _statusFilter);
  }

  return data;
}

function calcLineTotals() {
  const subtotal = _lineItems.reduce((s, li) => s + ((li.quantity || 0) * (li.price || 0)), 0);
  const taxRate = getSettings().taxRate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount;
  return { subtotal, taxRate, taxAmount, grandTotal };
}

function buildLineItemRow(item, idx) {
  const products = store.getProducts() || [];
  const productOptions = products.map(p =>
    `<option value="${escapeHtml(p.id)}" ${item.productId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  const rowTotal = (item.quantity || 0) * (item.price || 0);
  const sym = getSettings().currencySymbol || '$';

  return `
    <div class="invoice-line-row" data-idx="${idx}" style="display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;">
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Product</label>
        <select class="inv-line-product" data-idx="${idx}" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
          <option value="">Select product</option>
          ${productOptions}
        </select>
      </div>
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Qty</label>
        <input type="number" class="inv-line-qty" data-idx="${idx}" value="${item.quantity || 1}" min="1" step="1" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
      </div>
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Price</label>
        <input type="number" class="inv-line-price" data-idx="${idx}" value="${item.price || ''}" min="0" step="0.01" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
      </div>
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Total</label>
        <input type="text" class="inv-line-total" data-idx="${idx}" value="${formatCurrency(rowTotal, sym)}" readonly style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-secondary,#f9fafb);color:var(--text-primary,#111);font-weight:600;">
      </div>
      <button type="button" class="inv-line-remove" data-idx="${idx}" title="Remove item" style="padding:7px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#ef4444;cursor:pointer;font-size:13px;font-weight:700;line-height:1;margin-bottom:0;">✕</button>
    </div>`;
}

function buildTotalsHtml() {
  const { subtotal, taxRate, taxAmount, grandTotal } = calcLineTotals();
  const sym = getSettings().currencySymbol || '$';
  return `
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color,#e5e7eb);">
      <div style="display:flex;justify-content:space-between;gap:32px;font-size:14px;">
        <span style="color:var(--text-muted,#6b7280);">Subtotal:</span>
        <span>${formatCurrency(subtotal, sym)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:32px;font-size:14px;">
        <span style="color:var(--text-muted,#6b7280);">Tax (${taxRate}%):</span>
        <span>${formatCurrency(taxAmount, sym)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;gap:32px;font-size:20px;font-weight:700;padding-top:4px;">
        <span>Grand Total:</span>
        <span>${formatCurrency(grandTotal, sym)}</span>
      </div>
    </div>`;
}

function refreshLineItemsUI(modalEl) {
  const listEl = modalEl.querySelector('#inv-line-items-list');
  const totalsEl = modalEl.querySelector('#inv-totals-area');
  if (listEl) {
    listEl.innerHTML = _lineItems.map((li, i) => buildLineItemRow(li, i)).join('');
  }
  if (totalsEl) {
    totalsEl.innerHTML = buildTotalsHtml();
  }
  attachLineItemListeners(modalEl);
}

function attachLineItemListeners(modalEl) {
  modalEl.querySelectorAll('.inv-line-product').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const productId = e.target.value;
      _lineItems[idx].productId = productId;
      if (productId) {
        const product = store.getProductById(productId);
        if (product) {
          _lineItems[idx].price = product.sellingPrice || 0;
          _lineItems[idx].productName = product.name || '';
        }
      } else {
        _lineItems[idx].price = 0;
        _lineItems[idx].productName = '';
      }
      refreshLineItemsUI(modalEl);
    });
  });

  modalEl.querySelectorAll('.inv-line-qty').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      _lineItems[idx].quantity = parseNumber(e.target.value) || 0;
      // Just update the total cell, not full refresh
      const totalEl = modalEl.querySelector(`.inv-line-total[data-idx="${idx}"]`);
      if (totalEl) {
        const sym = getSettings().currencySymbol || '$';
        totalEl.value = formatCurrency(_lineItems[idx].quantity * _lineItems[idx].price, sym);
      }
      const totalsEl = modalEl.querySelector('#inv-totals-area');
      if (totalsEl) totalsEl.innerHTML = buildTotalsHtml();
    });
  });

  modalEl.querySelectorAll('.inv-line-price').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      _lineItems[idx].price = parseNumber(e.target.value) || 0;
      const totalEl = modalEl.querySelector(`.inv-line-total[data-idx="${idx}"]`);
      if (totalEl) {
        const sym = getSettings().currencySymbol || '$';
        totalEl.value = formatCurrency(_lineItems[idx].quantity * _lineItems[idx].price, sym);
      }
      const totalsEl = modalEl.querySelector('#inv-totals-area');
      if (totalsEl) totalsEl.innerHTML = buildTotalsHtml();
    });
  });

  modalEl.querySelectorAll('.inv-line-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      _lineItems.splice(idx, 1);
      refreshLineItemsUI(modalEl);
    });
  });
}

// ── Build stat cards data ─────────────────────────────

function buildStatCards() {
  const invoices = store.getInvoices() || [];
  const sym = getSettings().currencySymbol || '$';
  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const outstanding = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (i.totalAmount || 0), 0);

  return [
    { title: 'Total Invoices', value: String(totalInvoices), icon: '📄', color: 'blue' },
    { title: 'Total Amount', value: formatCurrency(totalAmount, sym), icon: '💰', color: 'green' },
    { title: 'Outstanding', value: formatCurrency(outstanding, sym), icon: '⏳', color: 'amber' },
  ];
}

// ── Refresh entire page ────────────────────────────────

function refreshPage(container) {
  // Stat cards
  if (_statCardsApi) _statCardsApi.update(buildStatCards());

  // Table
  if (_tableApi) _tableApi.refresh(getTableData());
}

// ── Modals ─────────────────────────────────────────────

function openCreateInvoiceModal() {
  _lineItems = [{ productId: '', productName: '', quantity: 1, price: 0 }];
  const customers = store.getCustomers() || [];
  const today = getToday();
  const dueDate = addDays(today, 30);

  const customerOptions = customers.map(c =>
    `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`
  ).join('');

  const content = `
    <form id="inv-form">
      ${createFormGroup('Customer <span style="color:#ef4444;">*</span>', `<select name="customerId" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);"><option value="">Select customer</option>${customerOptions}</select>`, 'inv-customer')}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${createFormGroup('Date <span style="color:#ef4444;">*</span>', `<input type="date" name="date" value="${today}" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'inv-date')}
        ${createFormGroup('Due Date <span style="color:#ef4444;">*</span>', `<input type="date" name="dueDate" value="${dueDate}" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'inv-due-date')}
      </div>

      <div style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label style="font-size:13px;font-weight:600;color:var(--text-primary,#374151);">Line Items</label>
        </div>
        <div id="inv-line-items-list" style="max-height:300px;overflow-y:auto;">
          ${_lineItems.map((li, i) => buildLineItemRow(li, i)).join('')}
        </div>
        <button type="button" id="inv-add-item" style="margin-top:8px;padding:7px 14px;border:1px dashed var(--border-color,#d1d5db);border-radius:6px;background:var(--bg-primary,#fff);color:var(--accent-blue,#3b82f6);cursor:pointer;font-size:13px;font-weight:500;transition:background 150ms;">+ Add Item</button>
      </div>

      <div id="inv-totals-area">
        ${buildTotalsHtml()}
      </div>

      ${createFormGroup('Notes', `<textarea name="notes" rows="2" placeholder="Optional notes..." style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);resize:vertical;"></textarea>`, 'inv-notes')}
    </form>
  `;

  const footer = `
    <button type="button" id="inv-cancel-btn" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
    <button type="button" id="inv-save-btn" style="padding:9px 24px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px;font-weight:600;transition:background 150ms;">Create Invoice</button>
  `;

  const modal = openModal({ title: 'New Invoice', size: 'lg', content, footer });

  const modalEl = modal.getElement();

  // Auto-set customer name on selection
  const customerSelect = modalEl.querySelector('select[name="customerId"]');
  if (customerSelect) {
    customerSelect.addEventListener('change', () => { /* name set on save */ });
  }

  // Add item button
  modalEl.querySelector('#inv-add-item').addEventListener('click', () => {
    _lineItems.push({ productId: '', productName: '', quantity: 1, price: 0 });
    refreshLineItemsUI(modalEl);
  });

  // Cancel
  modalEl.querySelector('#inv-cancel-btn').addEventListener('click', () => modal.close());

  // Save
  modalEl.querySelector('#inv-save-btn').addEventListener('click', () => {
    const form = modalEl.querySelector('#inv-form');
    const data = getFormData(form);

    if (!data.customerId) {
      showError('Please select a customer.');
      return;
    }

    const validItems = _lineItems.filter(li => li.productId && li.quantity > 0);
    if (validItems.length === 0) {
      showError('Please add at least one valid line item.');
      return;
    }

    const customer = store.getCustomerById(data.customerId);
    const items = validItems.map(li => ({
      productId: li.productId,
      productName: li.productName || (store.getProductById(li.productId) || {}).name || '',
      quantity: li.quantity,
      price: li.price,
    }));

    store.addInvoice({
      customerId: data.customerId,
      customerName: customer ? customer.name : '',
      date: data.date,
      dueDate: data.dueDate,
      items,
      notes: data.notes || '',
      status: 'draft',
    });

    modal.close();
    showSuccess('Invoice created successfully');
  });
}

function openEditInvoiceModal(invoice) {
  if (!invoice || invoice.status !== 'draft') {
    showError('Only draft invoices can be edited.');
    return;
  }

  _lineItems = (invoice.items || []).map(li => ({
    productId: li.productId || '',
    productName: li.productName || '',
    quantity: li.quantity || 0,
    price: li.price || 0,
  }));

  if (_lineItems.length === 0) _lineItems.push({ productId: '', productName: '', quantity: 1, price: 0 });

  const customers = store.getCustomers() || [];
  const customerOptions = customers.map(c =>
    `<option value="${escapeHtml(c.id)}" ${invoice.customerId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  const content = `
    <form id="inv-form">
      <input type="hidden" name="invoiceId" value="${escapeHtml(invoice.id)}">
      ${createFormGroup('Customer <span style="color:#ef4444;">*</span>', `<select name="customerId" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);"><option value="">Select customer</option>${customerOptions}</select>`, 'inv-customer')}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${createFormGroup('Date <span style="color:#ef4444;">*</span>', `<input type="date" name="date" value="${escapeHtml(invoice.date || '')}" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'inv-date')}
        ${createFormGroup('Due Date <span style="color:#ef4444;">*</span>', `<input type="date" name="dueDate" value="${escapeHtml(invoice.dueDate || '')}" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'inv-due-date')}
      </div>

      <div style="margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary,#374151);margin-bottom:8px;">Line Items</label>
        <div id="inv-line-items-list" style="max-height:300px;overflow-y:auto;">
          ${_lineItems.map((li, i) => buildLineItemRow(li, i)).join('')}
        </div>
        <button type="button" id="inv-add-item" style="margin-top:8px;padding:7px 14px;border:1px dashed var(--border-color,#d1d5db);border-radius:6px;background:var(--bg-primary,#fff);color:var(--accent-blue,#3b82f6);cursor:pointer;font-size:13px;font-weight:500;">+ Add Item</button>
      </div>

      <div id="inv-totals-area">
        ${buildTotalsHtml()}
      </div>

      ${createFormGroup('Notes', `<textarea name="notes" rows="2" placeholder="Optional notes..." style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);resize:vertical;">${escapeHtml(invoice.notes || '')}</textarea>`, 'inv-notes')}
    </form>
  `;

  const footer = `
    <button type="button" id="inv-cancel-btn" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
    <button type="button" id="inv-save-btn" style="padding:9px 24px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px;font-weight:600;transition:background 150ms;">Update Invoice</button>
  `;

  const modal = openModal({ title: 'Edit Invoice', size: 'lg', content, footer });
  const modalEl = modal.getElement();

  modalEl.querySelector('#inv-add-item').addEventListener('click', () => {
    _lineItems.push({ productId: '', productName: '', quantity: 1, price: 0 });
    refreshLineItemsUI(modalEl);
  });

  modalEl.querySelector('#inv-cancel-btn').addEventListener('click', () => modal.close());

  modalEl.querySelector('#inv-save-btn').addEventListener('click', () => {
    const form = modalEl.querySelector('#inv-form');
    const data = getFormData(form);

    if (!data.customerId) {
      showError('Please select a customer.');
      return;
    }

    const validItems = _lineItems.filter(li => li.productId && li.quantity > 0);
    if (validItems.length === 0) {
      showError('Please add at least one valid line item.');
      return;
    }

    const customer = store.getCustomerById(data.customerId);
    const items = validItems.map(li => ({
      productId: li.productId,
      productName: li.productName || (store.getProductById(li.productId) || {}).name || '',
      quantity: li.quantity,
      price: li.price,
    }));

    store.updateInvoice(invoice.id, {
      customerId: data.customerId,
      customerName: customer ? customer.name : '',
      date: data.date,
      dueDate: data.dueDate,
      items,
      notes: data.notes || '',
    });

    modal.close();
    showSuccess('Invoice updated successfully');
  });
}

function openViewInvoiceModal(invoice) {
  if (!invoice) return;
  const settings = getSettings();
  const sym = settings.currencySymbol || '$';
  const customer = store.getCustomerById(invoice.customerId);
  const customerName = customer ? customer.name : (invoice.customerName || 'Unknown');
  const customerEmail = customer ? customer.email || '' : '';
  const customerPhone = customer ? customer.phone || '' : '';
  const customerAddress = customer ? customer.address || '' : '';

  const itemsRows = (invoice.items || []).map((item, idx) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);color:var(--text-muted,#6b7280);font-size:13px;">${idx + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-weight:500;font-size:13px;">${escapeHtml(item.productName || '-')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-size:13px;text-align:right;">${formatCurrency(item.price || 0, sym)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-weight:600;font-size:13px;text-align:right;">${formatCurrency(item.total || 0, sym)}</td>
    </tr>
  `).join('');

  const taxRate = settings.taxRate || 0;
  const subtotal = invoice.subtotal || 0;
  const taxAmount = invoice.taxAmount || 0;
  const grandTotal = invoice.totalAmount || 0;
  const canMarkPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  const footer = canMarkPaid
    ? `<button type="button" id="inv-view-close" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Close</button>
       <button type="button" id="inv-mark-paid-btn" style="padding:9px 24px;border-radius:8px;border:none;background:#10b981;color:white;cursor:pointer;font-size:14px;font-weight:600;">✓ Mark as Paid</button>`
    : `<button type="button" id="inv-view-close" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Close</button>`;

  const content = `
    <div>
      <!-- Company info -->
      <div style="margin-bottom:20px;">
        <div style="font-size:18px;font-weight:700;">${escapeHtml(settings.companyName || 'SuFa Inventory')}</div>
        ${settings.companyAddress ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);margin-top:2px;">${escapeHtml(settings.companyAddress)}</div>` : ''}
        ${settings.companyPhone ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(settings.companyPhone)}</div>` : ''}
        ${settings.companyEmail ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(settings.companyEmail)}</div>` : ''}
      </div>

      <!-- Invoice header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:20px;">
        <div>
          <div style="font-size:14px;color:var(--text-muted,#6b7280);">Invoice#</div>
          <div style="font-size:18px;font-weight:700;">${escapeHtml(invoice.invoiceNumber || '')}</div>
          <div style="margin-top:4px;">${getStatusBadge(invoice.status)}</div>
        </div>
        <div style="text-align:right;font-size:13px;">
          <div><strong>Date:</strong> ${formatDate(invoice.date)}</div>
          <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
        </div>
      </div>

      <!-- Customer -->
      <div style="background:var(--bg-secondary,#f9fafb);border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:11px;color:var(--text-muted,#6b7280);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Bill To</div>
        <div style="font-weight:600;font-size:14px;">${escapeHtml(customerName)}</div>
        ${customerEmail ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(customerEmail)}</div>` : ''}
        ${customerPhone ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(customerPhone)}</div>` : ''}
        ${customerAddress ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(customerAddress)}</div>` : ''}
      </div>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:var(--bg-secondary,#f9fafb);">
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Product</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Total</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;">
        <div style="width:260px;">
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color,#f3f4f6);font-size:14px;">
            <span style="color:var(--text-muted,#6b7280);">Subtotal</span>
            <span>${formatCurrency(subtotal, sym)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-color,#f3f4f6);font-size:14px;">
            <span style="color:var(--text-muted,#6b7280);">Tax (${taxRate}%)</span>
            <span>${formatCurrency(taxAmount, sym)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:18px;font-weight:700;">
            <span>Grand Total</span>
            <span>${formatCurrency(grandTotal, sym)}</span>
          </div>
        </div>
      </div>

      ${invoice.notes ? `
        <div style="margin-top:16px;padding:12px;background:var(--bg-secondary,#f9fafb);border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted,#6b7280);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Notes</div>
          <div style="font-size:13px;line-height:1.5;">${escapeHtml(invoice.notes)}</div>
        </div>
      ` : ''}
    </div>
  `;

  const modal = openModal({ title: `Invoice ${invoice.invoiceNumber || ''}`, size: 'lg', content, footer });
  const modalEl = modal.getElement();

  modalEl.querySelector('#inv-view-close').addEventListener('click', () => modal.close());

  if (canMarkPaid) {
    const paidBtn = modalEl.querySelector('#inv-mark-paid-btn');
    if (paidBtn) {
      paidBtn.addEventListener('click', () => {
        modal.close();
        confirmDialog({
          title: 'Mark as Paid',
          message: `Mark Invoice #${invoice.invoiceNumber} as paid?`,
          confirmText: 'Mark Paid',
          variant: 'primary',
        }).then(confirmed => {
          if (confirmed) {
            store.markInvoicePaid(invoice.id);
            showSuccess('Invoice marked as paid');
          }
        });
      });
    }
  }
}

function deleteInvoice(invoice) {
  if (!invoice) return;
  confirmDialog({
    title: 'Delete Invoice',
    message: `Delete Invoice #${invoice.invoiceNumber}? This will restore stock quantities.`,
    confirmText: 'Delete',
    variant: 'danger',
  }).then(confirmed => {
    if (confirmed) {
      store.deleteInvoice(invoice.id);
      showSuccess('Invoice deleted');
    }
  });
}

function markInvoicePaid(invoice) {
  if (!invoice) return;
  confirmDialog({
    title: 'Mark as Paid',
    message: `Mark Invoice #${invoice.invoiceNumber} as paid?`,
    confirmText: 'Mark Paid',
    variant: 'primary',
  }).then(confirmed => {
    if (confirmed) {
      store.markInvoicePaid(invoice.id);
      showSuccess('Invoice marked as paid');
    }
  });
}

// ── Main render ────────────────────────────────────────

export function render(container) {
  if (!container) return () => {};

  // DOM structure
  const headerEl = document.createElement('div');
  const breadcrumbEl = document.createElement('div');
  const statsEl = document.createElement('div');
  const filterEl = document.createElement('div');
  const tableEl = document.createElement('div');

  container.appendChild(headerEl);
  container.appendChild(breadcrumbEl);
  container.appendChild(statsEl);
  container.appendChild(filterEl);
  container.appendChild(tableEl);

  // Page header
  renderPageHeader(headerEl, {
    title: 'Invoices',
    description: 'Manage sales invoices and track payments',
    icon: '📄',
    actions: `<button id="inv-new-btn" style="padding:9px 18px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;transition:background 150ms;">+ New Invoice</button>`,
  });

  // Breadcrumbs
  renderBreadcrumbs(breadcrumbEl, [{ label: 'Invoices' }]);

  // Stat cards
  _statCardsApi = renderStatCards(statsEl, buildStatCards());

  // Status filter
  filterEl.innerHTML = `
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <label style="font-size:13px;font-weight:600;color:var(--text-primary,#374151);">Filter by Status:</label>
      <select id="inv-status-filter" style="padding:8px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);min-width:150px;">
        <option value="all">All</option>
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="paid">Paid</option>
        <option value="partial">Partial</option>
        <option value="overdue">Overdue</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  `;

  filterEl.querySelector('#inv-status-filter').addEventListener('change', (e) => {
    _statusFilter = e.target.value;
    if (_tableApi) _tableApi.refresh(getTableData());
  });

  // New invoice button
  const newBtn = headerEl.querySelector('#inv-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', openCreateInvoiceModal);
  }

  // Hover effect for the button
  if (newBtn) {
    newBtn.addEventListener('mouseenter', () => { newBtn.style.background = '#2563eb'; });
    newBtn.addEventListener('mouseleave', () => { newBtn.style.background = '#3b82f6'; });
  }

  // Data table
  const sym = getSettings().currencySymbol || '$';

  _tableApi = renderDataTable(tableEl, {
    columns: [
      { key: 'invoiceNumber', label: 'Invoice#', render: (val) => `<strong>${escapeHtml(val)}</strong>` },
      { key: 'customerName', label: 'Customer', render: (val) => {
        const initials = getInitials(val);
        return `<div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#1e40af;flex-shrink:0;">${escapeHtml(initials)}</div>
          <span>${escapeHtml(val)}</span>
        </div>`;
      }},
      { key: '_sortDate', label: 'Date', render: (val, row) => formatDate(row.date) },
      { key: 'dueDate', label: 'Due Date', hidden: true, render: (val) => formatDate(val) },
      { key: 'totalAmount', label: 'Amount', render: (val, row) => formatCurrency(val, row._sym) },
      { key: 'status', label: 'Status', sortable: false, render: (val) => getStatusBadge(val) },
    ],
    data: getTableData(),
    actions: (row) => {
      const inv = store.getInvoiceById(row.id);
      if (!inv) return '';
      const isPaid = inv.status === 'paid';
      const isDraft = inv.status === 'draft';
      return `
        <button class="inv-action-view" data-id="${row.id}" title="View" style="padding:4px 8px;border:none;background:var(--bg-secondary,#f3f4f6);border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">👁️</button>
        ${isDraft ? `<button class="inv-action-edit" data-id="${row.id}" title="Edit" style="padding:4px 8px;border:none;background:var(--bg-secondary,#f3f4f6);border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">✏️</button>` : ''}
        ${!isPaid && inv.status !== 'cancelled' ? `<button class="inv-action-paid" data-id="${row.id}" title="Mark Paid" style="padding:4px 8px;border:none;background:#dcfce7;border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">✅</button>` : ''}
        <button class="inv-action-delete" data-id="${row.id}" title="Delete" style="padding:4px 8px;border:none;background:#fef2f2;border-radius:4px;cursor:pointer;font-size:13px;color:#ef4444;">🗑️</button>
      `;
    },
    searchPlaceholder: 'Search invoices...',
    emptyMessage: 'No invoices found',
    emptyIcon: '📄',
    pageSize: 10,
  });

  // Wire up action buttons via delegation
  tableEl.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.inv-action-view');
    const editBtn = e.target.closest('.inv-action-edit');
    const paidBtn = e.target.closest('.inv-action-paid');
    const deleteBtn = e.target.closest('.inv-action-delete');

    if (viewBtn) {
      const inv = store.getInvoiceById(viewBtn.dataset.id);
      if (inv) openViewInvoiceModal(inv);
    } else if (editBtn) {
      const inv = store.getInvoiceById(editBtn.dataset.id);
      if (inv) openEditInvoiceModal(inv);
    } else if (paidBtn) {
      const inv = store.getInvoiceById(paidBtn.dataset.id);
      if (inv) markInvoicePaid(inv);
    } else if (deleteBtn) {
      const inv = store.getInvoiceById(deleteBtn.dataset.id);
      if (inv) deleteInvoice(inv);
    }
  });

  // ── Store subscriptions ────────────────────────────────
  const unsub1 = store.subscribe('invoices:changed', () => refreshPage(container));
  const unsub2 = store.subscribe('customers:changed', () => refreshPage(container));
  const unsub3 = store.subscribe('products:changed', () => refreshPage(container));
  const unsub4 = store.subscribe('settings:changed', () => refreshPage(container));
  _unsubscribers = [unsub1, unsub2, unsub3, unsub4];

  // Reset module state
  _statusFilter = 'all';
  _lineItems = [];

  // Cleanup function
  return function cleanup() {
    _unsubscribers.forEach(fn => fn());
    _unsubscribers = [];
    if (_tableApi) { _tableApi.destroy(); _tableApi = null; }
    _statCardsApi = null;
    container.innerHTML = '';
  };
}

export { render as renderInvoice };
