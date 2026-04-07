// ============================================
// js/pages/purchase.js — Purchase Page Module
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
    pending:   { label: 'Pending',   cls: 'badge-warning' },
    received:  { label: 'Received',  cls: 'badge-success' },
    partial:   { label: 'Partial',   cls: 'badge-info' },
    cancelled: { label: 'Cancelled', cls: 'badge-danger' },
  };
  const entry = map[status] || { label: status, cls: 'badge-neutral' };
  return `<span class="badge ${entry.cls}">${entry.label}</span>`;
}

function getTableData() {
  const purchases = store.getPurchases() || [];
  const suppliers = store.getSuppliers() || [];
  const settings = getSettings();
  const sym = settings.currencySymbol || '$';

  let data = purchases.map(po => {
    const supplier = suppliers.find(s => s.id === po.supplierId);
    const supplierName = supplier ? supplier.name : (po.supplierName || 'Unknown');
    return {
      id: po.id,
      purchaseNumber: po.purchaseNumber,
      supplierName,
      _sortDate: po.date || '',
      date: po.date,
      dueDate: po.dueDate,
      totalAmount: po.totalAmount || 0,
      status: po.status || 'pending',
      _sym: sym,
    };
  });

  if (_statusFilter !== 'all') {
    data = data.filter(d => d.status === _statusFilter);
  }

  return data;
}

function calcLineTotals() {
  const total = _lineItems.reduce((s, li) => s + ((li.quantity || 0) * (li.costPrice || 0)), 0);
  return { total };
}

function buildLineItemRow(item, idx) {
  const products = store.getProducts() || [];
  const productOptions = products.map(p =>
    `<option value="${escapeHtml(p.id)}" ${item.productId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  const rowTotal = (item.quantity || 0) * (item.costPrice || 0);
  const sym = getSettings().currencySymbol || '$';

  return `
    <div class="po-line-row" data-idx="${idx}" style="display:grid;grid-template-columns:2.5fr 1fr 1fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px;">
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Product</label>
        <select class="po-line-product" data-idx="${idx}" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
          <option value="">Select product</option>
          ${productOptions}
        </select>
      </div>
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Qty</label>
        <input type="number" class="po-line-qty" data-idx="${idx}" value="${item.quantity || 1}" min="1" step="1" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
      </div>
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Cost Price</label>
        <input type="number" class="po-line-cost" data-idx="${idx}" value="${item.costPrice || ''}" min="0" step="0.01" style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">
      </div>
      <div class="form-group" style="margin:0;">
        <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:3px;">Total</label>
        <input type="text" class="po-line-total" data-idx="${idx}" value="${formatCurrency(rowTotal, sym)}" readonly style="width:100%;padding:7px 10px;border:1px solid var(--border-color,#d1d5db);border-radius:6px;font-size:13px;background:var(--bg-secondary,#f9fafb);color:var(--text-primary,#111);font-weight:600;">
      </div>
      <button type="button" class="po-line-remove" data-idx="${idx}" title="Remove item" style="padding:7px 10px;border:1px solid #fca5a5;border-radius:6px;background:#fef2f2;color:#ef4444;cursor:pointer;font-size:13px;font-weight:700;line-height:1;margin-bottom:0;">✕</button>
    </div>`;
}

function buildTotalsHtml() {
  const { total } = calcLineTotals();
  const sym = getSettings().currencySymbol || '$';
  return `
    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color,#e5e7eb);">
      <div style="display:flex;justify-content:space-between;gap:32px;font-size:20px;font-weight:700;">
        <span>Total Amount:</span>
        <span>${formatCurrency(total, sym)}</span>
      </div>
    </div>`;
}

function refreshLineItemsUI(modalEl) {
  const listEl = modalEl.querySelector('#po-line-items-list');
  const totalsEl = modalEl.querySelector('#po-totals-area');
  if (listEl) {
    listEl.innerHTML = _lineItems.map((li, i) => buildLineItemRow(li, i)).join('');
  }
  if (totalsEl) {
    totalsEl.innerHTML = buildTotalsHtml();
  }
  attachLineItemListeners(modalEl);
}

function attachLineItemListeners(modalEl) {
  modalEl.querySelectorAll('.po-line-product').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const productId = e.target.value;
      _lineItems[idx].productId = productId;
      if (productId) {
        const product = store.getProductById(productId);
        if (product) {
          _lineItems[idx].costPrice = product.costPrice || 0;
          _lineItems[idx].productName = product.name || '';
        }
      } else {
        _lineItems[idx].costPrice = 0;
        _lineItems[idx].productName = '';
      }
      refreshLineItemsUI(modalEl);
    });
  });

  modalEl.querySelectorAll('.po-line-qty').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      _lineItems[idx].quantity = parseNumber(e.target.value) || 0;
      const totalEl = modalEl.querySelector(`.po-line-total[data-idx="${idx}"]`);
      if (totalEl) {
        const sym = getSettings().currencySymbol || '$';
        totalEl.value = formatCurrency(_lineItems[idx].quantity * _lineItems[idx].costPrice, sym);
      }
      const totalsEl = modalEl.querySelector('#po-totals-area');
      if (totalsEl) totalsEl.innerHTML = buildTotalsHtml();
    });
  });

  modalEl.querySelectorAll('.po-line-cost').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      _lineItems[idx].costPrice = parseNumber(e.target.value) || 0;
      const totalEl = modalEl.querySelector(`.po-line-total[data-idx="${idx}"]`);
      if (totalEl) {
        const sym = getSettings().currencySymbol || '$';
        totalEl.value = formatCurrency(_lineItems[idx].quantity * _lineItems[idx].costPrice, sym);
      }
      const totalsEl = modalEl.querySelector('#po-totals-area');
      if (totalsEl) totalsEl.innerHTML = buildTotalsHtml();
    });
  });

  modalEl.querySelectorAll('.po-line-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      _lineItems.splice(idx, 1);
      refreshLineItemsUI(modalEl);
    });
  });
}

// ── Build stat cards data ─────────────────────────────

function buildStatCards() {
  const purchases = store.getPurchases() || [];
  const sym = getSettings().currencySymbol || '$';
  const totalPurchases = purchases.length;
  const totalAmount = purchases.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const pending = purchases.filter(p => p.status === 'pending' || p.status === 'partial').length;

  return [
    { title: 'Total Purchases', value: String(totalPurchases), icon: '🛒', color: 'blue' },
    { title: 'Total Amount', value: formatCurrency(totalAmount, sym), icon: '💰', color: 'green' },
    { title: 'Pending', value: String(pending), icon: '⏳', color: 'amber' },
  ];
}

// ── Refresh entire page ────────────────────────────────

function refreshPage(container) {
  if (_statCardsApi) _statCardsApi.update(buildStatCards());
  if (_tableApi) _tableApi.refresh(getTableData());
}

// ── Modals ─────────────────────────────────────────────

function openCreatePurchaseModal() {
  _lineItems = [{ productId: '', productName: '', quantity: 1, costPrice: 0 }];
  const suppliers = store.getSuppliers() || [];
  const today = getToday();
  const dueDate = addDays(today, 30);

  const supplierOptions = suppliers.map(s =>
    `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`
  ).join('');

  const content = `
    <form id="po-form">
      ${createFormGroup('Supplier <span style="color:#ef4444;">*</span>', `<select name="supplierId" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);"><option value="">Select supplier</option>${supplierOptions}</select>`, 'po-supplier')}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${createFormGroup('Date <span style="color:#ef4444;">*</span>', `<input type="date" name="date" value="${today}" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'po-date')}
        ${createFormGroup('Due Date', `<input type="date" name="dueDate" value="${dueDate}" style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'po-due-date')}
      </div>

      <div style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <label style="font-size:13px;font-weight:600;color:var(--text-primary,#374151);">Line Items</label>
        </div>
        <div id="po-line-items-list" style="max-height:300px;overflow-y:auto;">
          ${_lineItems.map((li, i) => buildLineItemRow(li, i)).join('')}
        </div>
        <button type="button" id="po-add-item" style="margin-top:8px;padding:7px 14px;border:1px dashed var(--border-color,#d1d5db);border-radius:6px;background:var(--bg-primary,#fff);color:var(--accent-blue,#3b82f6);cursor:pointer;font-size:13px;font-weight:500;transition:background 150ms;">+ Add Item</button>
      </div>

      <div id="po-totals-area">
        ${buildTotalsHtml()}
      </div>

      ${createFormGroup('Notes', `<textarea name="notes" rows="2" placeholder="Optional notes..." style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);resize:vertical;"></textarea>`, 'po-notes')}
    </form>
  `;

  const footer = `
    <button type="button" id="po-cancel-btn" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
    <button type="button" id="po-save-btn" style="padding:9px 24px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px;font-weight:600;transition:background 150ms;">Create Purchase</button>
  `;

  const modal = openModal({ title: 'New Purchase Order', size: 'lg', content, footer });
  const modalEl = modal.getElement();

  modalEl.querySelector('#po-add-item').addEventListener('click', () => {
    _lineItems.push({ productId: '', productName: '', quantity: 1, costPrice: 0 });
    refreshLineItemsUI(modalEl);
  });

  modalEl.querySelector('#po-cancel-btn').addEventListener('click', () => modal.close());

  modalEl.querySelector('#po-save-btn').addEventListener('click', () => {
    const form = modalEl.querySelector('#po-form');
    const data = getFormData(form);

    if (!data.supplierId) {
      showError('Please select a supplier.');
      return;
    }

    const validItems = _lineItems.filter(li => li.productId && li.quantity > 0);
    if (validItems.length === 0) {
      showError('Please add at least one valid line item.');
      return;
    }

    const supplier = store.getSupplierById(data.supplierId);
    const items = validItems.map(li => ({
      productId: li.productId,
      productName: li.productName || (store.getProductById(li.productId) || {}).name || '',
      quantity: li.quantity,
      costPrice: li.costPrice,
    }));

    store.addPurchase({
      supplierId: data.supplierId,
      supplierName: supplier ? supplier.name : '',
      date: data.date,
      dueDate: data.dueDate,
      items,
      notes: data.notes || '',
      status: 'pending',
    });

    modal.close();
    showSuccess('Purchase created successfully');
  });
}

function openEditPurchaseModal(purchase) {
  if (!purchase || purchase.status !== 'pending') {
    showError('Only pending purchases can be edited.');
    return;
  }

  _lineItems = (purchase.items || []).map(li => ({
    productId: li.productId || '',
    productName: li.productName || '',
    quantity: li.quantity || 0,
    costPrice: li.costPrice || 0,
  }));

  if (_lineItems.length === 0) _lineItems.push({ productId: '', productName: '', quantity: 1, costPrice: 0 });

  const suppliers = store.getSuppliers() || [];
  const supplierOptions = suppliers.map(s =>
    `<option value="${escapeHtml(s.id)}" ${purchase.supplierId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');

  const content = `
    <form id="po-form">
      <input type="hidden" name="purchaseId" value="${escapeHtml(purchase.id)}">
      ${createFormGroup('Supplier <span style="color:#ef4444;">*</span>', `<select name="supplierId" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);"><option value="">Select supplier</option>${supplierOptions}</select>`, 'po-supplier')}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        ${createFormGroup('Date <span style="color:#ef4444;">*</span>', `<input type="date" name="date" value="${escapeHtml(purchase.date || '')}" required style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'po-date')}
        ${createFormGroup('Due Date', `<input type="date" name="dueDate" value="${escapeHtml(purchase.dueDate || '')}" style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);">`, 'po-due-date')}
      </div>

      <div style="margin-top:16px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary,#374151);margin-bottom:8px;">Line Items</label>
        <div id="po-line-items-list" style="max-height:300px;overflow-y:auto;">
          ${_lineItems.map((li, i) => buildLineItemRow(li, i)).join('')}
        </div>
        <button type="button" id="po-add-item" style="margin-top:8px;padding:7px 14px;border:1px dashed var(--border-color,#d1d5db);border-radius:6px;background:var(--bg-primary,#fff);color:var(--accent-blue,#3b82f6);cursor:pointer;font-size:13px;font-weight:500;">+ Add Item</button>
      </div>

      <div id="po-totals-area">
        ${buildTotalsHtml()}
      </div>

      ${createFormGroup('Notes', `<textarea name="notes" rows="2" placeholder="Optional notes..." style="width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);resize:vertical;">${escapeHtml(purchase.notes || '')}</textarea>`, 'po-notes')}
    </form>
  `;

  const footer = `
    <button type="button" id="po-cancel-btn" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Cancel</button>
    <button type="button" id="po-save-btn" style="padding:9px 24px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px;font-weight:600;transition:background 150ms;">Update Purchase</button>
  `;

  const modal = openModal({ title: 'Edit Purchase Order', size: 'lg', content, footer });
  const modalEl = modal.getElement();

  modalEl.querySelector('#po-add-item').addEventListener('click', () => {
    _lineItems.push({ productId: '', productName: '', quantity: 1, costPrice: 0 });
    refreshLineItemsUI(modalEl);
  });

  modalEl.querySelector('#po-cancel-btn').addEventListener('click', () => modal.close());

  modalEl.querySelector('#po-save-btn').addEventListener('click', () => {
    const form = modalEl.querySelector('#po-form');
    const data = getFormData(form);

    if (!data.supplierId) {
      showError('Please select a supplier.');
      return;
    }

    const validItems = _lineItems.filter(li => li.productId && li.quantity > 0);
    if (validItems.length === 0) {
      showError('Please add at least one valid line item.');
      return;
    }

    const supplier = store.getSupplierById(data.supplierId);
    const items = validItems.map(li => ({
      productId: li.productId,
      productName: li.productName || (store.getProductById(li.productId) || {}).name || '',
      quantity: li.quantity,
      costPrice: li.costPrice,
    }));

    store.updatePurchase(purchase.id, {
      supplierId: data.supplierId,
      supplierName: supplier ? supplier.name : '',
      date: data.date,
      dueDate: data.dueDate,
      items,
      notes: data.notes || '',
    });

    modal.close();
    showSuccess('Purchase updated successfully');
  });
}

function openViewPurchaseModal(purchase) {
  if (!purchase) return;
  const settings = getSettings();
  const sym = settings.currencySymbol || '$';
  const supplier = store.getSupplierById(purchase.supplierId);
  const supplierName = supplier ? supplier.name : (purchase.supplierName || 'Unknown');
  const supplierEmail = supplier ? supplier.email || '' : '';
  const supplierPhone = supplier ? supplier.phone || '' : '';
  const supplierAddress = supplier ? supplier.address || '' : '';

  const itemsRows = (purchase.items || []).map((item, idx) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);color:var(--text-muted,#6b7280);font-size:13px;">${idx + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-weight:500;font-size:13px;">${escapeHtml(item.productName || '-')}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-size:13px;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-size:13px;text-align:right;">${formatCurrency(item.costPrice || 0, sym)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid var(--border-color,#f3f4f6);font-weight:600;font-size:13px;text-align:right;">${formatCurrency(item.total || 0, sym)}</td>
    </tr>
  `).join('');

  const totalAmount = purchase.totalAmount || 0;
  const canReceive = purchase.status === 'pending' || purchase.status === 'partial';

  const footer = canReceive
    ? `<button type="button" id="po-view-close" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Close</button>
       <button type="button" id="po-receive-btn" style="padding:9px 24px;border-radius:8px;border:none;background:#10b981;color:white;cursor:pointer;font-size:14px;font-weight:600;">📥 Mark as Received</button>`
    : `<button type="button" id="po-view-close" style="padding:9px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);background:var(--bg-primary,#fff);color:var(--text-primary,#374151);cursor:pointer;font-size:14px;font-weight:500;">Close</button>`;

  const content = `
    <div>
      <!-- PO header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:20px;">
        <div>
          <div style="font-size:14px;color:var(--text-muted,#6b7280);">Purchase Order</div>
          <div style="font-size:18px;font-weight:700;">${escapeHtml(purchase.purchaseNumber || '')}</div>
          <div style="margin-top:4px;">${getStatusBadge(purchase.status)}</div>
        </div>
        <div style="text-align:right;font-size:13px;">
          <div><strong>Date:</strong> ${formatDate(purchase.date)}</div>
          <div><strong>Due Date:</strong> ${formatDate(purchase.dueDate)}</div>
        </div>
      </div>

      <!-- Supplier info -->
      <div style="background:var(--bg-secondary,#f9fafb);border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-size:11px;color:var(--text-muted,#6b7280);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Supplier</div>
        <div style="font-weight:600;font-size:14px;">${escapeHtml(supplierName)}</div>
        ${supplierEmail ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(supplierEmail)}</div>` : ''}
        ${supplierPhone ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(supplierPhone)}</div>` : ''}
        ${supplierAddress ? `<div style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(supplierAddress)}</div>` : ''}
      </div>

      <!-- Items table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:var(--bg-secondary,#f9fafb);">
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">#</th>
            <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Product</th>
            <th style="padding:10px 12px;text-align:center;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Cost Price</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Total</th>
          </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>

      <!-- Total -->
      <div style="display:flex;justify-content:flex-end;">
        <div style="width:260px;">
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:18px;font-weight:700;">
            <span>Total Amount</span>
            <span>${formatCurrency(totalAmount, sym)}</span>
          </div>
        </div>
      </div>

      ${purchase.notes ? `
        <div style="margin-top:16px;padding:12px;background:var(--bg-secondary,#f9fafb);border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted,#6b7280);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Notes</div>
          <div style="font-size:13px;line-height:1.5;">${escapeHtml(purchase.notes)}</div>
        </div>
      ` : ''}
    </div>
  `;

  const modal = openModal({ title: `Purchase ${purchase.purchaseNumber || ''}`, size: 'lg', content, footer });
  const modalEl = modal.getElement();

  modalEl.querySelector('#po-view-close').addEventListener('click', () => modal.close());

  if (canReceive) {
    const receiveBtn = modalEl.querySelector('#po-receive-btn');
    if (receiveBtn) {
      receiveBtn.addEventListener('click', () => {
        modal.close();
        confirmDialog({
          title: 'Mark as Received',
          message: `Mark Purchase #${purchase.purchaseNumber} as received? Stock quantities will be updated.`,
          confirmText: 'Mark Received',
          variant: 'primary',
        }).then(confirmed => {
          if (confirmed) {
            store.receivePurchase(purchase.id);
            showSuccess('Purchase received. Stock updated.');
          }
        });
      });
    }
  }
}

function deletePurchase(purchase) {
  if (!purchase) return;
  confirmDialog({
    title: 'Delete Purchase',
    message: `Delete Purchase #${purchase.purchaseNumber}? This cannot be undone.`,
    confirmText: 'Delete',
    variant: 'danger',
  }).then(confirmed => {
    if (confirmed) {
      store.deletePurchase(purchase.id);
      showSuccess('Purchase deleted');
    }
  });
}

function receivePurchase(purchase) {
  if (!purchase) return;
  confirmDialog({
    title: 'Mark as Received',
    message: `Mark Purchase #${purchase.purchaseNumber} as received? Stock quantities will be updated.`,
    confirmText: 'Mark Received',
    variant: 'primary',
  }).then(confirmed => {
    if (confirmed) {
      store.receivePurchase(purchase.id);
      showSuccess('Purchase received. Stock updated.');
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
    title: 'Purchases',
    description: 'Manage purchase orders and track receipts',
    icon: '🛒',
    actions: `<button id="po-new-btn" style="padding:9px 18px;border-radius:8px;border:none;background:#3b82f6;color:white;cursor:pointer;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;transition:background 150ms;">+ New Purchase</button>`,
  });

  // Breadcrumbs
  renderBreadcrumbs(breadcrumbEl, [{ label: 'Purchases' }]);

  // Stat cards
  _statCardsApi = renderStatCards(statsEl, buildStatCards());

  // Status filter
  filterEl.innerHTML = `
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <label style="font-size:13px;font-weight:600;color:var(--text-primary,#374151);">Filter by Status:</label>
      <select id="po-status-filter" style="padding:8px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;font-size:13px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);min-width:150px;">
        <option value="all">All</option>
        <option value="pending">Pending</option>
        <option value="partial">Partial</option>
        <option value="received">Received</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  `;

  filterEl.querySelector('#po-status-filter').addEventListener('change', (e) => {
    _statusFilter = e.target.value;
    if (_tableApi) _tableApi.refresh(getTableData());
  });

  // New purchase button
  const newBtn = headerEl.querySelector('#po-new-btn');
  if (newBtn) {
    newBtn.addEventListener('click', openCreatePurchaseModal);
    newBtn.addEventListener('mouseenter', () => { newBtn.style.background = '#2563eb'; });
    newBtn.addEventListener('mouseleave', () => { newBtn.style.background = '#3b82f6'; });
  }

  // Data table
  const sym = getSettings().currencySymbol || '$';

  _tableApi = renderDataTable(tableEl, {
    columns: [
      { key: 'purchaseNumber', label: 'PO#', render: (val) => `<strong>${escapeHtml(val)}</strong>` },
      { key: 'supplierName', label: 'Supplier', render: (val) => {
        const initials = getInitials(val);
        return `<div style="display:flex;align-items:center;gap:8px;">
          <div style="width:28px;height:28px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:#92400e;flex-shrink:0;">${escapeHtml(initials)}</div>
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
      const po = store.getPurchaseById(row.id);
      if (!po) return '';
      const isPending = po.status === 'pending';
      const isPartial = po.status === 'partial';
      const isReceived = po.status === 'received';
      const canReceive = isPending || isPartial;
      return `
        <button class="po-action-view" data-id="${row.id}" title="View" style="padding:4px 8px;border:none;background:var(--bg-secondary,#f3f4f6);border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">👁️</button>
        ${isPending ? `<button class="po-action-edit" data-id="${row.id}" title="Edit" style="padding:4px 8px;border:none;background:var(--bg-secondary,#f3f4f6);border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">✏️</button>` : ''}
        ${canReceive ? `<button class="po-action-receive" data-id="${row.id}" title="Receive" style="padding:4px 8px;border:none;background:#dcfce7;border-radius:4px;cursor:pointer;font-size:13px;margin-right:4px;">📥</button>` : ''}
        <button class="po-action-delete" data-id="${row.id}" title="Delete" style="padding:4px 8px;border:none;background:#fef2f2;border-radius:4px;cursor:pointer;font-size:13px;color:#ef4444;">🗑️</button>
      `;
    },
    searchPlaceholder: 'Search purchases...',
    emptyMessage: 'No purchases found',
    emptyIcon: '🛒',
    pageSize: 10,
  });

  // Wire up action buttons via delegation
  tableEl.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.po-action-view');
    const editBtn = e.target.closest('.po-action-edit');
    const receiveBtn = e.target.closest('.po-action-receive');
    const deleteBtn = e.target.closest('.po-action-delete');

    if (viewBtn) {
      const po = store.getPurchaseById(viewBtn.dataset.id);
      if (po) openViewPurchaseModal(po);
    } else if (editBtn) {
      const po = store.getPurchaseById(editBtn.dataset.id);
      if (po) openEditPurchaseModal(po);
    } else if (receiveBtn) {
      const po = store.getPurchaseById(receiveBtn.dataset.id);
      if (po) receivePurchase(po);
    } else if (deleteBtn) {
      const po = store.getPurchaseById(deleteBtn.dataset.id);
      if (po) deletePurchase(po);
    }
  });

  // ── Store subscriptions ────────────────────────────────
  const unsub1 = store.subscribe('purchases:changed', () => refreshPage(container));
  const unsub2 = store.subscribe('suppliers:changed', () => refreshPage(container));
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

export { render as renderPurchase };
