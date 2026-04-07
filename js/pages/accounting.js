// ============================================
// js/pages/accounting.js — Accounting Page Module
// ============================================

import store from '../store.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getInitials,
  escapeHtml,
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

// ===== Type formatting helpers =====

const TYPE_LABELS = {
  sale: 'Sale',
  purchase: 'Purchase',
  payment_in: 'Payment In',
  payment_out: 'Payment Out',
  adjustment: 'Adjustment',
};

const TYPE_BADGES = {
  sale: 'badge-info',
  purchase: 'badge-warning',
  payment_in: 'badge-success',
  payment_out: 'badge-danger',
  adjustment: 'badge-neutral',
};

function formatType(type) {
  return TYPE_LABELS[type] || type || 'Unknown';
}

function getTypeBadgeClass(type) {
  return `badge ${TYPE_BADGES[type] || 'badge-neutral'}`;
}

// ===== Main render function =====

export function renderAccounting(container) {
  const unsubscribers = [];
  let currentTab = 'all';
  let tableApi = null;

  // Track selected ledger accounts
  let selectedCustomerId = '';
  let selectedSupplierId = '';

  // Subscribe to store changes
  unsubscribers.push(store.subscribe('transactions:changed', () => renderTabContent()));
  unsubscribers.push(store.subscribe('customers:changed', () => {
    renderTabContent();
  }));
  unsubscribers.push(store.subscribe('suppliers:changed', () => {
    renderTabContent();
  }));
  unsubscribers.push(store.subscribe('invoices:changed', () => renderTabContent()));
  unsubscribers.push(store.subscribe('purchases:changed', () => renderTabContent()));

  // ===== Page layout (rendered once) =====

  function renderPage() {
    container.innerHTML = '';

    // Breadcrumbs
    const breadcrumbEl = document.createElement('div');
    breadcrumbEl.id = 'accounting-breadcrumb';
    container.appendChild(breadcrumbEl);
    renderBreadcrumbs(breadcrumbEl, [{ label: 'Accounting' }]);

    // Header
    const headerEl = document.createElement('div');
    headerEl.id = 'accounting-header';
    container.appendChild(headerEl);
    renderPageHeader(headerEl, {
      title: 'Accounting',
      description: 'Track transactions, customer and supplier ledgers',
      icon: '📊',
    });

    // Tabs
    const tabsWrapper = document.createElement('div');
    tabsWrapper.id = 'accounting-tabs';
    tabsWrapper.innerHTML = `
      <div class="tabs" id="accounting-tabs-nav" style="
        display: flex; gap: 4px; border-bottom: 2px solid var(--border-color, #e5e7eb);
        margin-bottom: 24px;
      ">
        <button class="tab active" data-tab="all" style="
          padding: 10px 18px; font-size: 14px; font-weight: 500;
          color: var(--text-primary, #111); background: none;
          border: none; border-bottom: 2px solid var(--accent-blue, #3b82f6);
          cursor: pointer; transition: color 150ms, border-color 150ms;
          margin-bottom: -2px;
        ">All Transactions</button>
        <button class="tab" data-tab="customer" style="
          padding: 10px 18px; font-size: 14px; font-weight: 500;
          color: var(--text-muted, #6b7280); background: none;
          border: none; border-bottom: 2px solid transparent;
          cursor: pointer; transition: color 150ms, border-color 150ms;
          margin-bottom: -2px;
        ">Customer Ledger</button>
        <button class="tab" data-tab="supplier" style="
          padding: 10px 18px; font-size: 14px; font-weight: 500;
          color: var(--text-muted, #6b7280); background: none;
          border: none; border-bottom: 2px solid transparent;
          cursor: pointer; transition: color 150ms, border-color 150ms;
          margin-bottom: -2px;
        ">Supplier Ledger</button>
      </div>
    `;
    container.appendChild(tabsWrapper);

    // Tab content area
    const tabContentEl = document.createElement('div');
    tabContentEl.id = 'tab-content';
    tabContentEl.className = 'mt-6';
    container.appendChild(tabContentEl);

    // Bind tab clicks
    const tabsNav = document.getElementById('accounting-tabs-nav');
    if (tabsNav) {
      tabsNav.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab');
        if (!tabBtn) return;

        const tab = tabBtn.dataset.tab;
        if (!tab) return;

        // Update active tab styling
        tabsNav.querySelectorAll('.tab').forEach(btn => {
          btn.style.color = 'var(--text-muted, #6b7280)';
          btn.style.borderBottomColor = 'transparent';
          btn.classList.remove('active');
        });
        tabBtn.style.color = 'var(--text-primary, #111)';
        tabBtn.style.borderBottomColor = 'var(--accent-blue, #3b82f6)';
        tabBtn.classList.add('active');

        currentTab = tab;
        renderTabContent();
      });
    }
  }

  // ===== Tab content rendering =====

  function renderTabContent() {
    const tabContentEl = document.getElementById('tab-content');
    if (!tabContentEl) return;

    // Clean up existing table
    if (tableApi && tableApi.destroy) {
      tableApi.destroy();
      tableApi = null;
    }

    switch (currentTab) {
      case 'all':
        renderAllTransactions(tabContentEl);
        break;
      case 'customer':
        renderCustomerLedger(tabContentEl);
        break;
      case 'supplier':
        renderSupplierLedger(tabContentEl);
        break;
    }
  }

  // ===== Tab 1: All Transactions =====

  function renderAllTransactions(el) {
    const transactions = store.getTransactions();

    // Calculate summaries
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'payment_in') {
        totalIncome += amt;
      } else if (tx.type === 'purchase' || tx.type === 'payment_out') {
        totalExpenses += amt;
      } else if (tx.type === 'sale') {
        totalExpenses += amt; // Sales are credit to customer, expense perspective
      }
      // adjustments are neutral
    });

    const netBalance = totalIncome - totalExpenses;
    const netColor = netBalance >= 0 ? '#10b981' : '#ef4444';

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="
            display:inline-flex;align-items:center;gap:8px;padding:10px 16px;
            background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;
          ">
            <span style="font-size:12px;color:#374151;font-weight:500;">Total Income</span>
            <span style="font-size:16px;font-weight:700;color:#10b981;">${formatCurrency(totalIncome)}</span>
          </div>
          <div style="
            display:inline-flex;align-items:center;gap:8px;padding:10px 16px;
            background:#fef2f2;border:1px solid #fecaca;border-radius:10px;
          ">
            <span style="font-size:12px;color:#374151;font-weight:500;">Total Expenses</span>
            <span style="font-size:16px;font-weight:700;color:#ef4444;">${formatCurrency(totalExpenses)}</span>
          </div>
          <div style="
            display:inline-flex;align-items:center;gap:8px;padding:10px 16px;
            background:${netBalance >= 0 ? '#f0fdf4' : '#fef2f2'};
            border:1px solid ${netBalance >= 0 ? '#dcfce7' : '#fecaca'};border-radius:10px;
          ">
            <span style="font-size:12px;color:#374151;font-weight:500;">Net Balance</span>
            <span style="font-size:16px;font-weight:700;color:${netColor};">${formatCurrency(Math.abs(netBalance))}</span>
          </div>
        </div>
        <div>
          <select id="txn-type-filter" style="
            padding:8px 12px;border:1px solid var(--border-color,#d1d5db);
            border-radius:8px;font-size:13px;background:var(--bg-primary,#fff);
            color:var(--text-primary,#111);outline:none;cursor:pointer;
          ">
            <option value="all">All Types</option>
            <option value="sale">Sale</option>
            <option value="purchase">Purchase</option>
            <option value="payment_in">Payment In</option>
            <option value="payment_out">Payment Out</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
      </div>
      <div id="transactions-table-container"></div>
    `;

    // Filter transactions
    const filterEl = document.getElementById('txn-type-filter');
    let filteredData = [...transactions];

    function getFilteredData() {
      let data = [...store.getTransactions()];
      if (filterEl && filterEl.value !== 'all') {
        data = data.filter(tx => tx.type === filterEl.value);
      }
      // Sort by date descending (newest first)
      data.sort((a, b) => {
        const dateA = a.date || a.createdAt || '';
        const dateB = b.date || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });
      return data;
    }

    filteredData = getFilteredData();

    const tableContainer = document.getElementById('transactions-table-container');
    if (!tableContainer) return;

    const columns = [
      {
        key: 'date',
        label: 'Date',
        sortable: true,
        render: (value) => formatDate(value || value),
      },
      {
        key: 'type',
        label: 'Type',
        render: (value) => `<span class="${getTypeBadgeClass(value)}">${formatType(value)}</span>`,
      },
      {
        key: 'description',
        label: 'Description',
        render: (value) => escapeHtml(value || '—'),
      },
      {
        key: 'accountName',
        label: 'Account',
        render: (value) => escapeHtml(value || '—'),
      },
      {
        key: 'amount',
        label: 'Amount',
        render: (value, row) => {
          const amt = Number(value) || 0;
          let colorStyle = 'color:#6b7280;'; // neutral for adjustment
          let prefix = '';
          if (row.type === 'payment_in') {
            colorStyle = 'color:#10b981;font-weight:600;';
            prefix = '+';
          } else if (row.type === 'sale' || row.type === 'purchase' || row.type === 'payment_out') {
            colorStyle = 'color:#ef4444;font-weight:600;';
            prefix = '-';
          }
          return `<span style="${colorStyle}">${prefix}${formatCurrency(amt)}</span>`;
        },
      },
      {
        key: 'referenceType',
        label: 'Reference',
        render: (value, row) => {
          if (!row.referenceType && !row.referenceId) return '<span style="color:var(--text-muted,#9ca3af);">—</span>';
          const typeLabel = row.referenceType ? String(row.referenceType).charAt(0).toUpperCase() + String(row.referenceType).slice(1) : '';
          const refId = row.referenceId ? String(row.referenceId).substring(0, 8) + '...' : '';
          return escapeHtml(`${typeLabel} ${refId}`);
        },
      },
    ];

    tableApi = renderDataTable(tableContainer, {
      columns,
      data: filteredData,
      searchable: true,
      searchPlaceholder: 'Search transactions...',
      pageSize: 10,
      emptyMessage: 'No transactions found',
      emptyIcon: '📊',
    });

    // Wire up type filter
    if (filterEl) {
      filterEl.addEventListener('change', () => {
        const newData = getFilteredData();
        if (tableApi) tableApi.refresh(newData);
      });
    }
  }

  // ===== Tab 2: Customer Ledger =====

  function renderCustomerLedger(el) {
    const customers = store.getCustomers();

    let optionsHtml = '<option value="">-- Select a Customer --</option>';
    customers.forEach(c => {
      const selected = c.id === selectedCustomerId ? 'selected' : '';
      optionsHtml += `<option value="${escapeHtml(c.id)}" ${selected}>${escapeHtml(c.name)}</option>`;
    });

    el.innerHTML = `
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--text-primary,#374151);">
          Select Customer
        </label>
        <select id="customer-ledger-select" style="
          padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
          border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);
          color:var(--text-primary,#111);outline:none;min-width:300px;cursor:pointer;
          max-width:100%;
        ">
          ${optionsHtml}
        </select>
      </div>
      <div id="customer-ledger-content"></div>
    `;

    const selectEl = document.getElementById('customer-ledger-select');
    if (selectEl) {
      selectEl.addEventListener('change', () => {
        selectedCustomerId = selectEl.value;
        renderCustomerLedgerContent();
      });
    }

    // If already selected, render immediately
    if (selectedCustomerId) {
      renderCustomerLedgerContent();
    } else {
      const contentEl = document.getElementById('customer-ledger-content');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted,#9ca3af);">
            <div style="font-size:36px;margin-bottom:8px;">📋</div>
            <div style="font-size:14px;">Select a customer to view their ledger</div>
          </div>
        `;
      }
    }
  }

  function renderCustomerLedgerContent() {
    const contentEl = document.getElementById('customer-ledger-content');
    if (!contentEl) return;

    if (!selectedCustomerId) {
      contentEl.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted,#9ca3af);">
          <div style="font-size:36px;margin-bottom:8px;">📋</div>
          <div style="font-size:14px;">Select a customer to view their ledger</div>
        </div>
      `;
      return;
    }

    const customer = store.getCustomerById(selectedCustomerId);
    if (!customer) {
      contentEl.innerHTML = `<div style="color:var(--text-muted,#9ca3af);padding:20px;">Customer not found.</div>`;
      return;
    }

    const transactions = store.getCustomerTransactions(selectedCustomerId);
    const invoices = store.getInvoices().filter(inv => inv.customerId === selectedCustomerId);

    // Calculate totals
    let totalDue = 0;
    invoices.forEach(inv => {
      totalDue += Number(inv.totalAmount) || 0;
    });

    let totalPaid = 0;
    transactions.forEach(tx => {
      if (tx.type === 'payment_in') {
        totalPaid += Number(tx.amount) || 0;
      }
    });

    const outstanding = totalDue - totalPaid;

    // Build ledger entries from transactions
    const entries = [];

    transactions.forEach(tx => {
      let debit = 0;
      let credit = 0;
      let entryType = tx.type;
      let invoiceRef = '';

      if (tx.type === 'sale') {
        debit = Number(tx.amount) || 0;
      } else if (tx.type === 'payment_in') {
        credit = Number(tx.amount) || 0;
      } else if (tx.type === 'adjustment') {
        const amt = Number(tx.amount) || 0;
        if (amt >= 0) {
          debit = amt;
        } else {
          credit = Math.abs(amt);
        }
      }

      if (tx.referenceType === 'invoice') {
        const inv = invoices.find(i => i.id === tx.referenceId);
        invoiceRef = inv ? inv.invoiceNumber : '';
      }

      entries.push({
        date: tx.date || tx.createdAt,
        type: entryType,
        description: tx.description || formatType(entryType),
        invoiceRef,
        debit,
        credit,
      });
    });

    // Sort by date ascending for running balance
    entries.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = entries.map(e => {
      runningBalance = runningBalance + e.debit - e.credit;
      return { ...e, balance: runningBalance };
    });

    // Summary cards
    const summaryHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px;">
        <div style="padding:14px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Customer</div>
          <div style="font-size:16px;font-weight:700;color:#111;">${escapeHtml(customer.name)}</div>
        </div>
        <div style="padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Total Due</div>
          <div style="font-size:16px;font-weight:700;color:#f59e0b;">${formatCurrency(totalDue)}</div>
        </div>
        <div style="padding:14px 18px;background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Total Paid</div>
          <div style="font-size:16px;font-weight:700;color:#10b981;">${formatCurrency(totalPaid)}</div>
        </div>
        <div style="padding:14px 18px;background:${outstanding > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${outstanding > 0 ? '#fecaca' : '#dcfce7'};border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Outstanding Balance</div>
          <div style="font-size:16px;font-weight:700;color:${outstanding > 0 ? '#ef4444' : '#10b981'};">${formatCurrency(Math.abs(outstanding))}</div>
        </div>
      </div>
    `;

    // Running balance table
    let tableHtml = '';
    if (entriesWithBalance.length === 0) {
      tableHtml = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted,#9ca3af);">
          <div style="font-size:36px;margin-bottom:8px;">📭</div>
          <div style="font-size:14px;">No transactions found for ${escapeHtml(customer.name)}</div>
        </div>
      `;
    } else {
      let rows = '';
      entriesWithBalance.forEach(entry => {
        const typeBadge = getTypeBadgeClass(entry.type);
        const debitHtml = entry.debit > 0
          ? `<span style="color:#f97316;font-weight:500;">${formatCurrency(entry.debit)}</span>`
          : '<span style="color:#9ca3af;">—</span>';
        const creditHtml = entry.credit > 0
          ? `<span style="color:#10b981;font-weight:500;">${formatCurrency(entry.credit)}</span>`
          : '<span style="color:#9ca3af;">—</span>';

        rows += `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${formatDate(entry.date)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;"><span class="${typeBadge}">${formatType(entry.type)}</span></td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${escapeHtml(entry.invoiceRef || '—')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${debitHtml}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${creditHtml}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:600;">${formatCurrency(entry.balance)}</td>
          </tr>
        `;
      });

      tableHtml = `
        <div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Date</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Type</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Invoice #</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Debit</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Credit</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Balance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    contentEl.innerHTML = summaryHtml + tableHtml;
  }

  // ===== Tab 3: Supplier Ledger =====

  function renderSupplierLedger(el) {
    const suppliers = store.getSuppliers();

    let optionsHtml = '<option value="">-- Select a Supplier --</option>';
    suppliers.forEach(s => {
      const selected = s.id === selectedSupplierId ? 'selected' : '';
      optionsHtml += `<option value="${escapeHtml(s.id)}" ${selected}>${escapeHtml(s.name)}</option>`;
    });

    el.innerHTML = `
      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--text-primary,#374151);">
          Select Supplier
        </label>
        <select id="supplier-ledger-select" style="
          padding:9px 12px;border:1px solid var(--border-color,#d1d5db);
          border-radius:8px;font-size:14px;background:var(--bg-primary,#fff);
          color:var(--text-primary,#111);outline:none;min-width:300px;cursor:pointer;
          max-width:100%;
        ">
          ${optionsHtml}
        </select>
      </div>
      <div id="supplier-ledger-content"></div>
    `;

    const selectEl = document.getElementById('supplier-ledger-select');
    if (selectEl) {
      selectEl.addEventListener('change', () => {
        selectedSupplierId = selectEl.value;
        renderSupplierLedgerContent();
      });
    }

    // If already selected, render immediately
    if (selectedSupplierId) {
      renderSupplierLedgerContent();
    } else {
      const contentEl = document.getElementById('supplier-ledger-content');
      if (contentEl) {
        contentEl.innerHTML = `
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted,#9ca3af);">
            <div style="font-size:36px;margin-bottom:8px;">📋</div>
            <div style="font-size:14px;">Select a supplier to view their ledger</div>
          </div>
        `;
      }
    }
  }

  function renderSupplierLedgerContent() {
    const contentEl = document.getElementById('supplier-ledger-content');
    if (!contentEl) return;

    if (!selectedSupplierId) {
      contentEl.innerHTML = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted,#9ca3af);">
          <div style="font-size:36px;margin-bottom:8px;">📋</div>
          <div style="font-size:14px;">Select a supplier to view their ledger</div>
        </div>
      `;
      return;
    }

    const supplier = store.getSupplierById(selectedSupplierId);
    if (!supplier) {
      contentEl.innerHTML = `<div style="color:var(--text-muted,#9ca3af);padding:20px;">Supplier not found.</div>`;
      return;
    }

    const transactions = store.getSupplierTransactions(selectedSupplierId);
    const purchases = store.getPurchases().filter(pur => pur.supplierId === selectedSupplierId);

    // Calculate totals
    let totalPurchased = 0;
    purchases.forEach(pur => {
      totalPurchased += Number(pur.totalAmount) || 0;
    });

    let totalPaid = 0;
    transactions.forEach(tx => {
      if (tx.type === 'payment_out') {
        totalPaid += Number(tx.amount) || 0;
      }
    });

    const outstanding = totalPurchased - totalPaid;

    // Build ledger entries from transactions
    const entries = [];

    transactions.forEach(tx => {
      let debit = 0;
      let credit = 0;
      let entryType = tx.type;
      let purchaseRef = '';

      if (tx.type === 'purchase') {
        debit = Number(tx.amount) || 0;
      } else if (tx.type === 'payment_out') {
        credit = Number(tx.amount) || 0;
      } else if (tx.type === 'adjustment') {
        const amt = Number(tx.amount) || 0;
        if (amt >= 0) {
          debit = amt;
        } else {
          credit = Math.abs(amt);
        }
      }

      if (tx.referenceType === 'purchase') {
        const pur = purchases.find(p => p.id === tx.referenceId);
        purchaseRef = pur ? pur.purchaseNumber : '';
      }

      entries.push({
        date: tx.date || tx.createdAt,
        type: entryType,
        description: tx.description || formatType(entryType),
        purchaseRef,
        debit,
        credit,
      });
    });

    // Sort by date ascending for running balance
    entries.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateA.localeCompare(dateB);
    });

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = entries.map(e => {
      runningBalance = runningBalance + e.debit - e.credit;
      return { ...e, balance: runningBalance };
    });

    // Summary cards
    const summaryHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px;">
        <div style="padding:14px 18px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Supplier</div>
          <div style="font-size:16px;font-weight:700;color:#111;">${escapeHtml(supplier.name)}</div>
        </div>
        <div style="padding:14px 18px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Total Purchased</div>
          <div style="font-size:16px;font-weight:700;color:#f59e0b;">${formatCurrency(totalPurchased)}</div>
        </div>
        <div style="padding:14px 18px;background:#f0fdf4;border:1px solid #dcfce7;border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Total Paid</div>
          <div style="font-size:16px;font-weight:700;color:#10b981;">${formatCurrency(totalPaid)}</div>
        </div>
        <div style="padding:14px 18px;background:${outstanding > 0 ? '#fef2f2' : '#f0fdf4'};border:1px solid ${outstanding > 0 ? '#fecaca' : '#dcfce7'};border-radius:10px;">
          <div style="font-size:12px;color:#6b7280;font-weight:500;margin-bottom:4px;">Outstanding Balance</div>
          <div style="font-size:16px;font-weight:700;color:${outstanding > 0 ? '#ef4444' : '#10b981'};">${formatCurrency(Math.abs(outstanding))}</div>
        </div>
      </div>
    `;

    // Running balance table
    let tableHtml = '';
    if (entriesWithBalance.length === 0) {
      tableHtml = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted,#9ca3af);">
          <div style="font-size:36px;margin-bottom:8px;">📭</div>
          <div style="font-size:14px;">No transactions found for ${escapeHtml(supplier.name)}</div>
        </div>
      `;
    } else {
      let rows = '';
      entriesWithBalance.forEach(entry => {
        const typeBadge = getTypeBadgeClass(entry.type);
        const debitHtml = entry.debit > 0
          ? `<span style="color:#f97316;font-weight:500;">${formatCurrency(entry.debit)}</span>`
          : '<span style="color:#9ca3af;">—</span>';
        const creditHtml = entry.credit > 0
          ? `<span style="color:#10b981;font-weight:500;">${formatCurrency(entry.credit)}</span>`
          : '<span style="color:#9ca3af;">—</span>';

        rows += `
          <tr>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${formatDate(entry.date)}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;"><span class="${typeBadge}">${formatType(entry.type)}</span></td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;">${escapeHtml(entry.purchaseRef || '—')}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${debitHtml}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;">${creditHtml}</td>
            <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;text-align:right;font-weight:600;">${formatCurrency(entry.balance)}</td>
          </tr>
        `;
      });

      tableHtml = `
        <div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Date</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Type</th>
                <th style="padding:12px 14px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">PO #</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Debit</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Credit</th>
                <th style="padding:12px 14px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Balance</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    contentEl.innerHTML = summaryHtml + tableHtml;
  }

  // ===== Initialize =====

  renderPage();
  renderTabContent();

  // Return cleanup function
  return () => {
    unsubscribers.forEach(fn => fn());
    if (tableApi && tableApi.destroy) tableApi.destroy();
  };
}
