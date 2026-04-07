// ============================================
// js/pages/customer.js — Customer Page Module
// ============================================

import store from '../store.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getInitials,
  escapeHtml,
  generateColorFromString,
} from '../utils.js';
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
  validateForm,
  renderEmptyState,
} from '../components.js';

export function renderCustomer(container) {
  const unsubscribers = [];
  let tableApi = null;

  unsubscribers.push(store.subscribe('customers:changed', () => render(container)));

  function render(container) {
    const customers = store.getCustomers();
    const totalCustomers = customers.length;
    const totalReceivables = customers.reduce((sum, c) => sum + (c.balance || 0), 0);

    container.innerHTML = '';

    // Breadcrumbs
    const breadcrumbEl = document.createElement('div');
    breadcrumbEl.id = 'customer-breadcrumb';
    container.appendChild(breadcrumbEl);
    renderBreadcrumbs(breadcrumbEl, [{ label: 'Customers' }]);

    // Header
    const headerEl = document.createElement('div');
    headerEl.id = 'customer-header';
    container.appendChild(headerEl);
    renderPageHeader(headerEl, {
      title: 'Customers',
      description: 'Manage your customer database and track receivables',
      icon: '👥',
      actions: `<button class="btn btn-primary" id="customer-add-btn" style="
        padding: 8px 18px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        font-size: 14px; font-weight: 500; cursor: pointer;
        transition: background 150ms;
      ">+ Add Customer</button>`,
    });

    // Stat Cards
    const statsEl = document.createElement('div');
    statsEl.id = 'customer-stats';
    container.appendChild(statsEl);
    renderStatCards(statsEl, [
      {
        title: 'Total Customers',
        value: String(totalCustomers),
        icon: '👥',
        color: 'blue',
      },
      {
        title: 'Total Receivables',
        value: formatCurrency(totalReceivables),
        icon: '💰',
        color: 'amber',
      },
    ]);

    // Data Table Container
    const tableEl = document.createElement('div');
    tableEl.id = 'customer-table';
    container.appendChild(tableEl);

    if (customers.length === 0) {
      renderEmptyState(tableEl, {
        icon: '👥',
        title: 'No customers yet',
        description: 'Add your first customer to start tracking sales',
        actionLabel: '+ Add Customer',
        onAction: () => openAddModal(),
      });
      bindAddButton();
      return;
    }

    // Define table columns
    const columns = [
      {
        key: 'name',
        label: 'Name',
        render: (value, row) => {
          const color = generateColorFromString(row.name);
          const initials = getInitials(row.name);
          return `<div class="flex items-center gap-3">
            <div class="avatar" style="background:${color.bg};color:${color.text};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0">${initials}</div>
            <span class="font-medium">${escapeHtml(value)}</span>
          </div>`;
        },
      },
      {
        key: 'email',
        label: 'Email',
        hidden: 'mobile',
        render: (value) => escapeHtml(value || '—'),
      },
      {
        key: 'phone',
        label: 'Phone',
        hidden: 'mobile',
        render: (value) => escapeHtml(value || '—'),
      },
      {
        key: 'balance',
        label: 'Balance',
        render: (value) => {
          const bal = Number(value) || 0;
          if (bal > 0) {
            return `<span style="color:#ef4444;font-weight:600;">${formatCurrency(bal)}</span>`;
          }
          return `<span style="color:#10b981;font-weight:500;">${formatCurrency(0)}</span>`;
        },
      },
    ];

    tableApi = renderDataTable(tableEl, {
      columns,
      data: customers,
      searchable: true,
      searchPlaceholder: 'Search customers...',
      pageSize: 10,
      emptyMessage: 'No customers found',
      emptyIcon: '👥',
      actions: (row) => {
        return `<div style="display:flex;gap:4px;justify-content:flex-end;">
          <button class="action-btn-edit" data-id="${escapeHtml(row.id)}" style="
            padding:5px 10px;border-radius:6px;border:1px solid var(--border-color,#d1d5db);
            background:var(--bg-primary,#fff);color:var(--text-primary,#374151);font-size:12px;
            cursor:pointer;transition:background 150ms;
          ">Edit</button>
          <button class="action-btn-ledger" data-id="${escapeHtml(row.id)}" style="
            padding:5px 10px;border-radius:6px;border:1px solid var(--border-color,#d1d5db);
            background:var(--bg-primary,#fff);color:var(--text-primary,#374151);font-size:12px;
            cursor:pointer;transition:background 150ms;
          ">View Ledger</button>
          <button class="action-btn-delete" data-id="${escapeHtml(row.id)}" style="
            padding:5px 10px;border-radius:6px;border:1px solid #fecaca;
            background:#fef2f2;color:#ef4444;font-size:12px;
            cursor:pointer;transition:background 150ms;
          ">Delete</button>
        </div>`;
      },
    });

    bindEvents();
  }

  // ===== Modal Helpers =====

  function getFormContent(customer = null) {
    const isEdit = !!customer;
    const nameValue = customer ? escapeHtml(customer.name) : '';
    const emailValue = customer ? escapeHtml(customer.email || '') : '';
    const phoneValue = customer ? escapeHtml(customer.phone || '') : '';
    const addressValue = customer ? escapeHtml(customer.address || '') : '';
    const balanceValue = customer ? (Number(customer.balance) || 0) : 0;

    return `
      <form id="customer-form" novalidate>
        ${createFormGroup(
          'Customer Name <span style="color:#ef4444">*</span>',
          `<input type="text" name="name" id="cust-name" value="${nameValue}" required placeholder="e.g. John Doe" style="
            width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
            border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;
            transition:border-color 150ms,box-shadow 150ms;
          " />`,
          'cust-name'
        )}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          ${createFormGroup(
            'Email',
            `<input type="email" name="email" id="cust-email" value="${emailValue}" placeholder="john@example.com" style="
              width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
              border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;
              transition:border-color 150ms,box-shadow 150ms;
            " />`,
            'cust-email'
          )}
          ${createFormGroup(
            'Phone',
            `<input type="tel" name="phone" id="cust-phone" value="${phoneValue}" placeholder="+1 234 567 8900" style="
              width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
              border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;
              transition:border-color 150ms,box-shadow 150ms;
            " />`,
            'cust-phone'
          )}
        </div>
        ${createFormGroup(
          'Address',
          `<textarea name="address" id="cust-address" rows="3" placeholder="Street address, city, state, zip..." style="
            width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
            border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;
            resize:vertical;min-height:60px;transition:border-color 150ms,box-shadow 150ms;
          ">${addressValue}</textarea>`,
          'cust-address'
        )}
        ${createFormGroup(
          'Initial Balance',
          `<input type="number" name="balance" id="cust-balance" value="${balanceValue}" step="0.01" style="
            width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
            border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;
            transition:border-color 150ms,box-shadow 150ms;
          " />`,
          'cust-balance'
        )}
      </form>
    `;
  }

  function openAddModal() {
    const modal = openModal({
      title: 'Add Customer',
      size: 'md',
      content: getFormContent(),
      footer: `
        <button class="modal-cancel-btn" style="
          padding:8px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);
          background:var(--bg-primary,#fff);color:var(--text-primary,#374151);
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
        ">Cancel</button>
        <button class="modal-save-btn" style="
          padding:8px 20px;border-radius:8px;border:none;
          background:var(--accent-blue,#3b82f6);color:white;
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
        ">Create Customer</button>
      `,
    });

    const modalEl = modal.getElement();
    const cancelBtn = modalEl.querySelector('.modal-cancel-btn');
    const saveBtn = modalEl.querySelector('.modal-save-btn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const form = document.getElementById('customer-form');
        if (!form) return;

        const data = getFormData(form);
        if (!data.name || !data.name.trim()) {
          showError('Customer name is required');
          const nameInput = document.getElementById('cust-name');
          if (nameInput) {
            nameInput.style.borderColor = '#ef4444';
            nameInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
            nameInput.focus();
          }
          return;
        }

        store.addCustomer({
          name: data.name.trim(),
          email: (data.email || '').trim(),
          phone: (data.phone || '').trim(),
          address: (data.address || '').trim(),
          balance: Number(data.balance) || 0,
        });

        showSuccess('Customer created successfully');
        modal.close();
        render(container);
      });
    }
  }

  function openEditModal(customerId) {
    const customer = store.getCustomerById(customerId);
    if (!customer) {
      showError('Customer not found');
      return;
    }

    const modal = openModal({
      title: 'Edit Customer',
      size: 'md',
      content: getFormContent(customer),
      footer: `
        <button class="modal-cancel-btn" style="
          padding:8px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);
          background:var(--bg-primary,#fff);color:var(--text-primary,#374151);
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
        ">Cancel</button>
        <button class="modal-save-btn" style="
          padding:8px 20px;border-radius:8px;border:none;
          background:var(--accent-blue,#3b82f6);color:white;
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
        ">Update Customer</button>
      `,
    });

    const modalEl = modal.getElement();
    const cancelBtn = modalEl.querySelector('.modal-cancel-btn');
    const saveBtn = modalEl.querySelector('.modal-save-btn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const form = document.getElementById('customer-form');
        if (!form) return;

        const data = getFormData(form);
        if (!data.name || !data.name.trim()) {
          showError('Customer name is required');
          const nameInput = document.getElementById('cust-name');
          if (nameInput) {
            nameInput.style.borderColor = '#ef4444';
            nameInput.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.1)';
            nameInput.focus();
          }
          return;
        }

        store.updateCustomer(customerId, {
          name: data.name.trim(),
          email: (data.email || '').trim(),
          phone: (data.phone || '').trim(),
          address: (data.address || '').trim(),
          balance: Number(data.balance) || 0,
        });

        showSuccess('Customer updated successfully');
        modal.close();
        render(container);
      });
    }
  }

  async function deleteCustomer(customerId) {
    const customer = store.getCustomerById(customerId);
    if (!customer) return;

    const confirmed = await confirmDialog({
      title: 'Delete Customer',
      message: `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });

    if (confirmed) {
      store.deleteCustomer(customerId);
      showSuccess('Customer deleted successfully');
    }
  }

  // ===== Event Binding =====

  function bindAddButton() {
    const addBtn = document.getElementById('customer-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openAddModal());
    }

    // Also bind empty state action button
    const emptyBtn = document.querySelector('#customer-table button');
    if (emptyBtn && !emptyBtn.id) {
      emptyBtn.addEventListener('click', () => openAddModal());
    }
  }

  function bindEvents() {
    // Add button
    const addBtn = document.getElementById('customer-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openAddModal());
    }

    // Table action buttons using event delegation
    const tableEl = document.getElementById('customer-table');
    if (tableEl) {
      tableEl.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.action-btn-edit');
        if (editBtn) {
          const id = editBtn.dataset.id;
          if (id) openEditModal(id);
          return;
        }

        const ledgerBtn = e.target.closest('.action-btn-ledger');
        if (ledgerBtn) {
          window.location.hash = '#accounting';
          return;
        }

        const deleteBtn = e.target.closest('.action-btn-delete');
        if (deleteBtn) {
          const id = deleteBtn.dataset.id;
          if (id) deleteCustomer(id);
          return;
        }
      });
    }
  }

  // Initial render
  render(container);

  // Return cleanup function
  return () => {
    unsubscribers.forEach(fn => fn());
    if (tableApi && tableApi.destroy) tableApi.destroy();
  };
}
