// ============================================
// js/pages/supplier.js — Supplier Page Module
// ============================================

import store from '../store.js';
import { formatCurrency, getInitials, escapeHtml, parseNumber } from '../utils.js';
import {
  renderPageHeader,
  renderBreadcrumbs,
  renderStatCards,
  renderDataTable,
  showToast,
  showSuccess,
  showError,
  confirmDialog,
  openModal,
  createFormGroup,
  getFormData,
  setFormData,
  renderEmptyState,
} from '../components.js';

const AVATAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const inputStyle = `
  width: 100%; padding: 8px 12px;
  border: 1px solid var(--border-color, #d1d5db); border-radius: 8px;
  font-size: 14px; background: var(--bg-primary, #fff);
  color: var(--text-primary, #111); outline: none;
  transition: border-color 150ms, box-shadow 150ms;
  box-sizing: border-box;
`;

const inputFocusStyle = `
  onfocus="this.style.borderColor='var(--accent-blue,#3b82f6)';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'"
  onblur="this.style.borderColor='var(--border-color,#d1d5db)';this.style.boxShadow='none'"
`;

const formRowStyle = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;';

// ===== Main Render =====

export function renderSupplier(container) {
  const unsubscribers = [];
  unsubscribers.push(store.subscribe('suppliers:changed', () => render(container)));

  let tableApi = null;

  function render(container) {
    const suppliers = store.getSuppliers();
    const settings = store.getSettings();
    const { currencySymbol } = settings;
    const sym = currencySymbol || '$';

    // Stats
    const totalSuppliers = suppliers.length;
    const totalPayables = suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);

    // Build page
    container.innerHTML = '';

    const headerEl = document.createElement('div');
    container.appendChild(headerEl);

    renderPageHeader(headerEl, {
      title: 'Suppliers',
      description: 'Manage your supplier contacts and payables',
      icon: '🏪',
      badge: { text: `${totalSuppliers} suppliers`, variant: 'info' },
      actions: `<button id="supplier-add-btn" style="
        padding: 8px 18px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
        transition: background 150ms;
      " onmouseenter="this.style.background='#2563eb'" onmouseleave="this.style.background='var(--accent-blue,#3b82f6)'"
      >+ Add Supplier</button>`,
    });

    renderBreadcrumbs(headerEl, [{ label: 'Suppliers' }]);

    // Stat cards
    const statsEl = document.createElement('div');
    statsEl.id = 'supplier-stats';
    container.appendChild(statsEl);

    renderStatCards(statsEl, [
      { title: 'Total Suppliers', value: totalSuppliers, icon: '🏪', color: 'blue' },
      { title: 'Total Payables', value: formatCurrency(totalPayables, sym), icon: '💸', color: 'red' },
    ]);

    // Table container
    const tableContainer = document.createElement('div');
    tableContainer.id = 'supplier-table-container';
    container.appendChild(tableContainer);

    // Table data with avatar color computed
    const tableData = suppliers.map((s, idx) => ({
      ...s,
      _avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
      _initials: getInitials(s.name),
    }));

    const columns = [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (val, row) => `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="
              width: 36px; height: 36px; border-radius: 50%;
              background: ${row._avatarColor}; color: white;
              display: flex; align-items: center; justify-content: center;
              font-size: 13px; font-weight: 600; flex-shrink: 0;
            ">${escapeHtml(row._initials)}</div>
            <span style="font-weight: 500;">${escapeHtml(val)}</span>
          </div>
        `,
      },
      { key: 'email', label: 'Email', sortable: true, hidden: true },
      { key: 'phone', label: 'Phone', sortable: true, hidden: true },
      {
        key: 'balance',
        label: 'Balance',
        sortable: true,
        render: (val) => {
          const num = Number(val) || 0;
          if (num > 0) {
            return `<span style="color: #ef4444; font-weight: 600;">${formatCurrency(num, sym)}</span>`;
          }
          return `<span style="color: var(--text-muted, #6b7280);">${formatCurrency(num, sym)}</span>`;
        },
      },
    ];

    if (tableApi) {
      tableApi.destroy();
      tableApi = null;
    }

    tableApi = renderDataTable(tableContainer, {
      columns,
      data: tableData,
      pageSize: 10,
      searchPlaceholder: 'Search suppliers by name, email, or phone...',
      emptyMessage: 'No suppliers found',
      emptyIcon: '🏪',
      actions: (row) => `
        <button class="supplier-edit-btn" data-id="${escapeHtml(row.id)}" style="
          padding: 4px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
          background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
          cursor: pointer; font-size: 13px; margin-right: 4px; transition: background 150ms;
        " onmouseenter="this.style.background='var(--bg-hover,#f3f4f6)'" onmouseleave="this.style.background='var(--bg-primary,#fff)'"
        >Edit</button>
        <button class="supplier-ledger-btn" data-id="${escapeHtml(row.id)}" style="
          padding: 4px 10px; border: 1px solid #dbeafe; border-radius: 6px;
          background: #eff6ff; color: #1e40af;
          cursor: pointer; font-size: 13px; margin-right: 4px; transition: background 150ms;
        " onmouseenter="this.style.background='#dbeafe'" onmouseleave="this.style.background='#eff6ff'"
        >Ledger</button>
        <button class="supplier-delete-btn" data-id="${escapeHtml(row.id)}" style="
          padding: 4px 10px; border: 1px solid #fecaca; border-radius: 6px;
          background: #fff; color: #ef4444;
          cursor: pointer; font-size: 13px; transition: background 150ms;
        " onmouseenter="this.style.background='#fef2f2'" onmouseleave="this.style.background='#fff'"
        >Delete</button>
      `,
    });

    // Bind edit buttons
    tableContainer.querySelectorAll('.supplier-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const supplier = store.getSupplierById(btn.dataset.id);
        if (supplier) openSupplierModal(supplier);
      });
    });

    // Bind ledger buttons — navigate to accounting page
    tableContainer.querySelectorAll('.supplier-ledger-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.navigate) {
          window.navigate('accounting');
        } else {
          window.location.hash = '#accounting';
        }
      });
    });

    // Bind delete buttons
    tableContainer.querySelectorAll('.supplier-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSupplier(btn.dataset.id);
      });
    });

    // Add supplier button
    const addBtn = container.querySelector('#supplier-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openSupplierModal(null));
    }
  }

  // ===== Add / Edit Modal =====

  function openSupplierModal(supplier = null) {
    const isEdit = !!supplier;
    const title = isEdit ? 'Edit Supplier' : 'Add Supplier';
    const saveLabel = isEdit ? 'Update Supplier' : 'Create Supplier';

    const content = `
      <form id="supplier-form" style="display: flex; flex-direction: column; gap: 16px;">
        ${createFormGroup('Supplier Name *', `<input type="text" name="name" value="${escapeHtml(supplier ? supplier.name : '')}" required placeholder="e.g. Acme Supplies" style="${inputStyle}" ${inputFocusStyle} />`, 'supplier-name')}
        <div style="${formRowStyle}">
          ${createFormGroup('Email', `<input type="email" name="email" value="${escapeHtml(supplier ? supplier.email || '' : '')}" placeholder="supplier@example.com" style="${inputStyle}" ${inputFocusStyle} />`, 'supplier-email')}
          ${createFormGroup('Phone', `<input type="tel" name="phone" value="${escapeHtml(supplier ? supplier.phone || '' : '')}" placeholder="+1 234 567 8900" style="${inputStyle}" ${inputFocusStyle} />`, 'supplier-phone')}
        </div>
        ${createFormGroup('Address', `<textarea name="address" rows="3" placeholder="Street address, city, state, zip..." style="${inputStyle} resize: vertical;">${escapeHtml(supplier ? supplier.address || '' : '')}</textarea>`, 'supplier-address')}
        ${createFormGroup('Initial Balance', `<input type="number" name="balance" value="${supplier ? supplier.balance : 0}" step="0.01" data-type="number" placeholder="0.00" style="${inputStyle}" ${inputFocusStyle} />`, 'supplier-balance')}
      </form>
    `;

    const footer = `
      <button id="supplier-cancel-btn" style="
        padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
        cursor: pointer; font-size: 14px; font-weight: 500;
      ">Cancel</button>
      <button id="supplier-save-btn" style="
        padding: 8px 20px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
      ">${escapeHtml(saveLabel)}</button>
    `;

    const modal = openModal({ title, content, footer, size: 'md' });
    const modalEl = modal.getElement();

    const saveBtn = modalEl.querySelector('#supplier-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const form = modalEl.querySelector('#supplier-form');
        if (!form) return;

        const formData = getFormData(form);
        const name = (formData.name || '').trim();

        // Validation
        if (!name) {
          showError('Supplier name is required');
          return;
        }

        const supplierData = {
          name,
          email: (formData.email || '').trim(),
          phone: (formData.phone || '').trim(),
          address: (formData.address || '').trim(),
          balance: Number(formData.balance) || 0,
        };

        try {
          if (isEdit) {
            store.updateSupplier(supplier.id, supplierData);
            showSuccess('Supplier updated successfully');
          } else {
            store.addSupplier(supplierData);
            showSuccess('Supplier created successfully');
          }
          modal.close();
        } catch (err) {
          showError(err.message || 'Failed to save supplier');
        }
      });
    }

    const cancelBtn = modalEl.querySelector('#supplier-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }
  }

  // ===== Delete =====

  function deleteSupplier(id) {
    const supplier = store.getSupplierById(id);
    if (!supplier) return;

    confirmDialog({
      title: 'Delete Supplier',
      message: `Are you sure you want to delete "${escapeHtml(supplier.name)}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        store.deleteSupplier(id);
        showSuccess('Supplier deleted successfully');
      },
    });
  }

  // Initial render
  render(container);

  // Return cleanup
  return () => {
    if (tableApi) {
      tableApi.destroy();
      tableApi = null;
    }
    unsubscribers.forEach(fn => fn());
  };
}
