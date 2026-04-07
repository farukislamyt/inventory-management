// ============================================
// js/pages/report.js — Reports Page
// ============================================

import store from '../store.js';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  escapeHtml,
  parseNumber,
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
} from '../components.js';

// ============================================
// Helpers
// ============================================

function getDateRange(months = 6) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  const pad = (n) => String(n).padStart(2, '0');
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function sumField(arr, field) {
  return arr.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
}

// ============================================
// Page Render
// ============================================

export function render(container) {
  const cleanupFns = [];

  container.innerHTML = '';

  // Create sub-elements
  const headerEl = document.createElement('div');
  headerEl.id = 'report-page-header';
  container.appendChild(headerEl);

  const breadcrumbsEl = document.createElement('div');
  breadcrumbsEl.id = 'report-breadcrumbs';
  container.appendChild(breadcrumbsEl);

  const tabBar = document.createElement('div');
  tabBar.id = 'report-tab-bar';
  tabBar.style.cssText = 'display:flex;gap:4px;border-bottom:2px solid var(--border-color,#e5e7eb);margin-bottom:24px;';
  container.appendChild(tabBar);

  const tabContentEl = document.createElement('div');
  tabContentEl.id = 'report-tab-content';
  container.appendChild(tabContentEl);

  // State
  let activeTab = 'inventory';
  let activeTable = null;
  let activeChart1 = null;
  let activeChart2 = null;

  // ---- Render header ----
  renderPageHeader(headerEl, {
    title: 'Reports',
    description: 'Inventory, sales, purchases, and accounts reports',
    icon: '📈',
  });

  // ---- Render breadcrumbs ----
  renderBreadcrumbs(breadcrumbsEl, [{ label: 'Reports' }]);

  // ---- Render tab bar ----
  function renderTabs() {
    tabBar.innerHTML = '';
    const tabs = [
      { key: 'inventory', label: 'Inventory' },
      { key: 'sales', label: 'Sales' },
      { key: 'purchases', label: 'Purchases' },
      { key: 'accounts', label: 'Accounts' },
    ];

    tabs.forEach(tab => {
      const btn = document.createElement('button');
      btn.textContent = tab.label;
      btn.dataset.tab = tab.key;
      btn.style.cssText = `
        padding: 10px 20px; font-size: 14px; font-weight: 500; cursor: pointer;
        border: none; background: none;
        border-bottom: 2px solid transparent; margin-bottom: -2px;
        transition: all 150ms;
        color: ${activeTab === tab.key ? 'var(--accent-blue, #3b82f6)' : 'var(--text-muted, #6b7280)'};
        border-bottom-color: ${activeTab === tab.key ? 'var(--accent-blue, #3b82f6)' : 'transparent'};
        font-weight: ${activeTab === tab.key ? '600' : '500'};
      `;

      btn.addEventListener('click', () => {
        if (activeTab === tab.key) return;
        activeTab = tab.key;
        renderTabs();
        renderActiveTab();
      });

      tabBar.appendChild(btn);
    });
  }

  // ---- Render active tab ----
  function renderActiveTab() {
    if (activeTable) { try { activeTable.destroy(); } catch (e) { /* noop */ } activeTable = null; }
    if (activeChart1) { try { activeChart1.destroy(); } catch (e) { /* noop */ } activeChart1 = null; }
    if (activeChart2) { try { activeChart2.destroy(); } catch (e) { /* noop */ } activeChart2 = null; }
    tabContentEl.innerHTML = '';

    switch (activeTab) {
      case 'inventory': renderInventoryTab(); break;
      case 'sales': renderSalesTab(); break;
      case 'purchases': renderPurchasesTab(); break;
      case 'accounts': renderAccountsTab(); break;
    }
  }

  // ============================================
  // Tab 1: Inventory Report
  // ============================================
  function renderInventoryTab() {
    const products = store.getProducts();
    const categories = store.getCategories();
    const symbol = store.getSettings().currencySymbol || '$';

    // Summary header
    const totalItems = products.length;
    const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.costPrice || 0)), 0);

    const summaryEl = document.createElement('div');
    summaryEl.style.cssText = 'display:flex;gap:24px;padding:16px 20px;margin-bottom:20px;background:var(--bg-secondary,#f9fafb);border-radius:10px;border:1px solid var(--border-color,#e5e7eb);flex-wrap:wrap;';
    summaryEl.innerHTML = `
      <div style="font-size:14px;color:var(--text-muted,#6b7280);">
        Total Items: <strong style="color:var(--text-primary,#111);">${totalItems}</strong>
      </div>
      <div style="font-size:14px;color:var(--text-muted,#6b7280);">
        Total Value: <strong style="color:var(--text-primary,#111);">${formatCurrency(totalValue, symbol)}</strong>
      </div>
    `;
    tabContentEl.appendChild(summaryEl);

    // Charts Container
    const chartsContainer = document.createElement('div');
    chartsContainer.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;';
    tabContentEl.appendChild(chartsContainer);

    const chartCard1 = document.createElement('div');
    chartCard1.style.cssText = 'background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:16px;height:300px;';
    chartCard1.innerHTML = '<h3 style="font-size:14px;margin-bottom:12px;color:var(--text-muted,#6b7280);font-weight:600;">Products by Category</h3><div style="position:relative;height:240px;"><canvas id="inv-chart-cat"></canvas></div>';
    chartsContainer.appendChild(chartCard1);

    const chartCard2 = document.createElement('div');
    chartCard2.style.cssText = 'background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:16px;height:300px;';
    chartCard2.innerHTML = '<h3 style="font-size:14px;margin-bottom:12px;color:var(--text-muted,#6b7280);font-weight:600;">Inventory Value by Category</h3><div style="position:relative;height:240px;"><canvas id="inv-chart-val"></canvas></div>';
    chartsContainer.appendChild(chartCard2);

    // Table
    const tableContainer = document.createElement('div');
    tabContentEl.appendChild(tableContainer);

    const data = products.map(p => {
      const category = store.getCategoryById(p.categoryId);
      const categoryName = category ? category.name : 'Uncategorized';
      const qty = p.quantity || 0;
      const costPrice = p.costPrice || 0;
      const sellingPrice = p.sellingPrice || 0;
      const totalVal = qty * costPrice;
      const margin = sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice * 100) : 0;

      return {
        _name: p.name,
        _category: categoryName,
        _quantity: qty,
        _costPrice: costPrice,
        _sellingPrice: sellingPrice,
        _totalValue: totalVal,
        _margin: margin,
      };
    });

    activeTable = renderDataTable(tableContainer, {
      columns: [
        { key: '_name', label: 'Product Name' },
        { key: '_category', label: 'Category' },
        { key: '_quantity', label: 'Quantity' },
        { key: '_costPrice', label: 'Cost Price', render: (val) => formatCurrency(val, symbol) },
        { key: '_sellingPrice', label: 'Selling Price', render: (val) => formatCurrency(val, symbol) },
        { key: '_totalValue', label: 'Total Value', render: (val) => `<strong>${formatCurrency(val, symbol)}</strong>` },
        {
          key: '_margin',
          label: 'Profit Margin %',
          render: (val) => {
            const color = val > 0 ? '#10b981' : (val < 0 ? '#ef4444' : 'var(--text-muted, #6b7280)');
            return `<span style="color:${color};font-weight:600;">${val.toFixed(1)}%</span>`;
          },
        },
      ],
      data,
      searchPlaceholder: 'Search products...',
      pageSize: 15,
      emptyMessage: 'No products in inventory',
      emptyIcon: '📦',
    });

    // Render Charts
    setTimeout(() => {
      const catCounts = {};
      const catValues = {};
      data.forEach(d => {
        catCounts[d._category] = (catCounts[d._category] || 0) + 1;
        catValues[d._category] = (catValues[d._category] || 0) + d._totalValue;
      });

      const labels = Object.keys(catCounts);
      const bgColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];
      
      const theme = document.documentElement.getAttribute('data-theme');
      const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
      const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

      const ctx1 = document.getElementById('inv-chart-cat');
      if (ctx1 && window.Chart) {
        if (activeChart1) activeChart1.destroy();
        activeChart1 = new window.Chart(ctx1, {
          type: 'doughnut',
          data: {
            labels,
            datasets: [{ data: Object.values(catCounts), backgroundColor: bgColors, borderWidth: 0 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor } } } }
        });
      }

      const ctx2 = document.getElementById('inv-chart-val');
      if (ctx2 && window.Chart) {
        if (activeChart2) activeChart2.destroy();
        activeChart2 = new window.Chart(ctx2, {
          type: 'bar',
          data: {
            labels,
            datasets: [{ label: 'Value ' + symbol, data: Object.values(catValues), backgroundColor: '#3b82f6', borderRadius: 4 }]
          },
          options: { 
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false }, ticks: { color: textColor } },
              y: { grid: { color: gridColor }, ticks: { color: textColor } }
            }
          }
        });
      }
    }, 50);
  }

  // ============================================
  // Tab 2: Sales Report
  // ============================================
  function renderSalesTab() {
    const symbol = store.getSettings().currencySymbol || '$';
    const defaultRange = getDateRange(6);

    tabContentEl.innerHTML = '';

    // Date range filter
    const filterCard = document.createElement('div');
    filterCard.style.cssText = 'margin-bottom:20px;padding:16px 20px;background:var(--bg-secondary,#f9fafb);border-radius:10px;border:1px solid var(--border-color,#e5e7eb);';
    filterCard.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;">
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:6px;">From</label>
          <input type="date" id="sales-from" value="${defaultRange.start}" style="
            padding:8px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
            font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);
          "/>
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:6px;">To</label>
          <input type="date" id="sales-to" value="${defaultRange.end}" style="
            padding:8px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
            font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);
          "/>
        </div>
        <button id="sales-filter-btn" style="
          padding:8px 20px;border-radius:8px;border:none;
          background:var(--accent-blue,#3b82f6);color:white;
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
          align-self:flex-end;
        ">Filter</button>
        <button id="sales-clear-btn" style="
          padding:8px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);
          background:var(--bg-primary,#fff);color:var(--text-primary,#374151);
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
          align-self:flex-end;
        ">Clear</button>
      </div>
    `;
    tabContentEl.appendChild(filterCard);

    // Summary cards
    const summaryEl = document.createElement('div');
    summaryEl.id = 'sales-summary';
    tabContentEl.appendChild(summaryEl);

    // Table
    const tableContainer = document.createElement('div');
    tableContainer.id = 'sales-table';
    tabContentEl.appendChild(tableContainer);

    function getFilteredInvoices() {
      const invoices = store.getInvoices();
      const fromInput = filterCard.querySelector('#sales-from');
      const toInput = filterCard.querySelector('#sales-to');
      const from = fromInput ? fromInput.value : '';
      const to = toInput ? toInput.value : '';

      return invoices.filter(inv => {
        const date = inv.date || '';
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      });
    }

    function renderSalesData() {
      const filtered = getFilteredInvoices();

      // Summary
      const totalSales = filtered.length;
      const totalAmount = sumField(filtered, 'totalAmount');
      const totalPaid = sumField(filtered.filter(i => i.status === 'paid'), 'totalAmount');
      const outstanding = sumField(filtered.filter(i => i.status !== 'paid' && i.status !== 'cancelled'), 'totalAmount');

      const cards = [
        { title: 'Total Sales', value: String(totalSales), icon: '🧾', color: 'blue' },
        { title: 'Total Amount', value: formatCurrency(totalAmount, symbol), icon: '💰', color: 'green' },
        { title: 'Total Paid', value: formatCurrency(totalPaid, symbol), icon: '✅', color: 'green' },
        { title: 'Outstanding', value: formatCurrency(outstanding, symbol), icon: '⏳', color: outstanding > 0 ? 'red' : 'green' },
      ];

      if (activeTable) { try { activeTable.destroy(); } catch (e) { /* noop */ } }

      // Use a temporary stat cards render
      summaryEl.innerHTML = '';
      renderStatCards(summaryEl, cards);

      // Add charts container dynamically if not present
      let salesChartsContainer = document.getElementById('sales-charts-container');
      if (!salesChartsContainer) {
        salesChartsContainer = document.createElement('div');
        salesChartsContainer.id = 'sales-charts-container';
        salesChartsContainer.style.cssText = 'background:var(--bg-primary,#fff);border:1px solid var(--border-color,#e5e7eb);border-radius:10px;padding:16px;height:300px;margin-bottom:20px;margin-top:20px;';
        salesChartsContainer.innerHTML = '<h3 style="font-size:14px;margin-bottom:12px;color:var(--text-muted,#6b7280);font-weight:600;">Sales Over Time</h3><div style="position:relative;height:240px;"><canvas id="sales-chart"></canvas></div>';
        tabContentEl.insertBefore(salesChartsContainer, tableContainer);
      }

      // Table data
      const data = filtered.map(inv => {
        const customer = store.getCustomerById(inv.customerId);
        const customerName = customer ? customer.name : (inv.customerName || 'Unknown');
        return {
          _invoiceNumber: inv.invoiceNumber || '',
          _customer: customerName,
          _date: inv.date || '',
          _totalAmount: inv.totalAmount || 0,
          _status: inv.status || '',
        };
      });

      activeTable = renderDataTable(tableContainer, {
        columns: [
          { key: '_invoiceNumber', label: 'Invoice #' },
          { key: '_customer', label: 'Customer' },
          { key: '_date', label: 'Date', render: (val) => formatDate(val) },
          { key: '_totalAmount', label: 'Amount', render: (val) => formatCurrency(val, symbol) },
          {
            key: '_status',
            label: 'Status',
            render: (val) => `<span class="${getStatusBadgeClass(val)}">${escapeHtml(val.charAt(0).toUpperCase() + val.slice(1))}</span>`,
          },
        ],
        data,
        searchPlaceholder: 'Search invoices...',
        pageSize: 15,
        emptyMessage: 'No invoices found for the selected date range',
        emptyIcon: '🧾',
      });

      // Render Chart
      setTimeout(() => {
        const dateValues = {};
        filtered.forEach(f => {
          const d = f.date || 'Unknown';
          dateValues[d] = (dateValues[d] || 0) + (f.totalAmount || 0);
        });

        const sortedDates = Object.keys(dateValues).sort();
        const salesData = sortedDates.map(d => dateValues[d]);

        const theme = document.documentElement.getAttribute('data-theme');
        const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
        const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';

        const ctx = document.getElementById('sales-chart');
        if (ctx && window.Chart) {
          if (activeChart1) activeChart1.destroy();
          activeChart1 = new window.Chart(ctx, {
            type: 'line',
            data: {
              labels: sortedDates.map(d => formatDate(d)),
              datasets: [{
                label: 'Sales ' + symbol,
                data: salesData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
              }]
            },
            options: { 
              responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, ticks: { color: textColor } },
                y: { grid: { color: gridColor }, ticks: { color: textColor }, beginAtZero: true }
              }
            }
          });
        }
      }, 50);
    }

    renderSalesData();

    // Wire buttons
    const filterBtn = filterCard.querySelector('#sales-filter-btn');
    const clearBtn = filterCard.querySelector('#sales-clear-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', renderSalesData);
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const fromInput = filterCard.querySelector('#sales-from');
        const toInput = filterCard.querySelector('#sales-to');
        if (fromInput) fromInput.value = defaultRange.start;
        if (toInput) toInput.value = defaultRange.end;
        renderSalesData();
      });
    }
  }

  // ============================================
  // Tab 3: Purchases Report
  // ============================================
  function renderPurchasesTab() {
    const symbol = store.getSettings().currencySymbol || '$';
    const defaultRange = getDateRange(6);

    tabContentEl.innerHTML = '';

    // Date range filter
    const filterCard = document.createElement('div');
    filterCard.style.cssText = 'margin-bottom:20px;padding:16px 20px;background:var(--bg-secondary,#f9fafb);border-radius:10px;border:1px solid var(--border-color,#e5e7eb);';
    filterCard.innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;">
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:6px;">From</label>
          <input type="date" id="purchases-from" value="${defaultRange.start}" style="
            padding:8px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
            font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);
          "/>
        </div>
        <div>
          <label style="display:block;font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);margin-bottom:6px;">To</label>
          <input type="date" id="purchases-to" value="${defaultRange.end}" style="
            padding:8px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
            font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);
          "/>
        </div>
        <button id="purchases-filter-btn" style="
          padding:8px 20px;border-radius:8px;border:none;
          background:var(--accent-blue,#3b82f6);color:white;
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
          align-self:flex-end;
        ">Filter</button>
        <button id="purchases-clear-btn" style="
          padding:8px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);
          background:var(--bg-primary,#fff);color:var(--text-primary,#374151);
          cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
          align-self:flex-end;
        ">Clear</button>
      </div>
    `;
    tabContentEl.appendChild(filterCard);

    // Summary cards
    const summaryEl = document.createElement('div');
    summaryEl.id = 'purchases-summary';
    tabContentEl.appendChild(summaryEl);

    // Table
    const tableContainer = document.createElement('div');
    tableContainer.id = 'purchases-table';
    tabContentEl.appendChild(tableContainer);

    function getFilteredPurchases() {
      const purchases = store.getPurchases();
      const fromInput = filterCard.querySelector('#purchases-from');
      const toInput = filterCard.querySelector('#purchases-to');
      const from = fromInput ? fromInput.value : '';
      const to = toInput ? toInput.value : '';

      return purchases.filter(p => {
        const date = p.date || '';
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      });
    }

    function renderPurchasesData() {
      const filtered = getFilteredPurchases();

      const totalPurchases = filtered.length;
      const totalAmount = sumField(filtered, 'totalAmount');
      const totalReceived = sumField(filtered.filter(p => p.status === 'received'), 'totalAmount');
      const pending = sumField(filtered.filter(p => p.status === 'pending' || p.status === 'partial'), 'totalAmount');

      const cards = [
        { title: 'Total Purchases', value: String(totalPurchases), icon: '🛒', color: 'blue' },
        { title: 'Total Amount', value: formatCurrency(totalAmount, symbol), icon: '💰', color: 'green' },
        { title: 'Total Received', value: formatCurrency(totalReceived, symbol), icon: '✅', color: 'green' },
        { title: 'Pending', value: formatCurrency(pending, symbol), icon: '⏳', color: pending > 0 ? 'amber' : 'green' },
      ];

      if (activeTable) { try { activeTable.destroy(); } catch (e) { /* noop */ } }

      summaryEl.innerHTML = '';
      renderStatCards(summaryEl, cards);

      const data = filtered.map(po => {
        const supplier = store.getSupplierById(po.supplierId);
        const supplierName = supplier ? supplier.name : (po.supplierName || 'Unknown');
        return {
          _purchaseNumber: po.purchaseNumber || '',
          _supplier: supplierName,
          _date: po.date || '',
          _totalAmount: po.totalAmount || 0,
          _status: po.status || '',
        };
      });

      activeTable = renderDataTable(tableContainer, {
        columns: [
          { key: '_purchaseNumber', label: 'PO #' },
          { key: '_supplier', label: 'Supplier' },
          { key: '_date', label: 'Date', render: (val) => formatDate(val) },
          { key: '_totalAmount', label: 'Amount', render: (val) => formatCurrency(val, symbol) },
          {
            key: '_status',
            label: 'Status',
            render: (val) => `<span class="${getStatusBadgeClass(val)}">${escapeHtml(val.charAt(0).toUpperCase() + val.slice(1))}</span>`,
          },
        ],
        data,
        searchPlaceholder: 'Search purchases...',
        pageSize: 15,
        emptyMessage: 'No purchases found for the selected date range',
        emptyIcon: '🛒',
      });
    }

    renderPurchasesData();

    const filterBtn = filterCard.querySelector('#purchases-filter-btn');
    const clearBtn = filterCard.querySelector('#purchases-clear-btn');
    if (filterBtn) filterBtn.addEventListener('click', renderPurchasesData);
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const fromInput = filterCard.querySelector('#purchases-from');
        const toInput = filterCard.querySelector('#purchases-to');
        if (fromInput) fromInput.value = defaultRange.start;
        if (toInput) toInput.value = defaultRange.end;
        renderPurchasesData();
      });
    }
  }

  // ============================================
  // Tab 4: Accounts Report
  // ============================================
  function renderAccountsTab() {
    const symbol = store.getSettings().currencySymbol || '$';

    const invoices = store.getInvoices();
    const purchases = store.getPurchases();
    const customers = store.getCustomers();
    const suppliers = store.getSuppliers();
    const transactions = store.getTransactions();

    tabContentEl.innerHTML = '';

    // Grid layout for two tables side by side
    const grid = document.createElement('div');
    grid.className = 'grid-2';
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;';

    // ---- Customer Balances ----
    const customerSection = document.createElement('div');
    customerSection.style.cssText = 'border:1px solid var(--border-color,#e5e7eb);border-radius:10px;overflow:hidden;';

    const customerHeader = document.createElement('div');
    customerHeader.style.cssText = 'padding:14px 20px;border-bottom:1px solid var(--border-color,#e5e7eb);font-size:15px;font-weight:700;color:var(--text-primary,#111);background:var(--bg-secondary,#f9fafb);';
    customerHeader.textContent = 'Customer Balances';
    customerSection.appendChild(customerHeader);

    const customerTableContainer = document.createElement('div');
    customerTableContainer.style.cssText = 'padding:0;';
    customerSection.appendChild(customerTableContainer);

    // Build customer balance data
    let custTotalInvoiced = 0;
    let custTotalPaid = 0;
    let custTotalOutstanding = 0;

    const customerData = customers.map(c => {
      // Sum all invoices for this customer
      const custInvoices = invoices.filter(i => i.customerId === c.id);
      const totalInvoiced = sumField(custInvoices, 'totalAmount');

      // Sum payment_in transactions for this customer
      const custPayments = transactions.filter(t => t.accountId === c.id && t.type === 'payment_in');
      const totalPaid = sumField(custPayments, 'amount');

      const outstanding = totalInvoiced - totalPaid;

      custTotalInvoiced += totalInvoiced;
      custTotalPaid += totalPaid;
      custTotalOutstanding += outstanding;

      return {
        _name: c.name,
        _totalInvoiced: totalInvoiced,
        _totalPaid: totalPaid,
        _outstanding: outstanding,
      };
    });

    // Build HTML table manually (to support footer row)
    function renderCustomerTable() {
      customerTableContainer.innerHTML = '';

      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;';

      // Header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="background:var(--bg-secondary,#f9fafb);">
          <th style="padding:10px 16px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Name</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Invoiced</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Paid</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Outstanding</th>
          <th style="padding:10px 16px;text-align:center;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Status</th>
        </tr>
      `;

      // Body
      const tbody = document.createElement('tbody');
      customerData.forEach(c => {
        const outColor = c._outstanding > 0 ? '#ef4444' : '#10b981';
        const statusBadge = c._outstanding > 0
          ? '<span class="badge badge-warning">Outstanding</span>'
          : '<span class="badge badge-success">Clear</span>';

        tbody.innerHTML += `
          <tr style="border-bottom:1px solid var(--border-color,#f3f4f6);">
            <td style="padding:10px 16px;font-weight:500;">${escapeHtml(c._name)}</td>
            <td style="padding:10px 16px;text-align:right;">${formatCurrency(c._totalInvoiced, symbol)}</td>
            <td style="padding:10px 16px;text-align:right;">${formatCurrency(c._totalPaid, symbol)}</td>
            <td style="padding:10px 16px;text-align:right;color:${outColor};font-weight:600;">${formatCurrency(c._outstanding, symbol)}</td>
            <td style="padding:10px 16px;text-align:center;">${statusBadge}</td>
          </tr>
        `;
      });

      // Footer totals
      const outTotalColor = custTotalOutstanding > 0 ? '#ef4444' : '#10b981';
      tbody.innerHTML += `
        <tr style="font-weight:700;border-top:2px solid var(--border-color,#e5e7eb);">
          <td style="padding:10px 16px;">Totals</td>
          <td style="padding:10px 16px;text-align:right;">${formatCurrency(custTotalInvoiced, symbol)}</td>
          <td style="padding:10px 16px;text-align:right;">${formatCurrency(custTotalPaid, symbol)}</td>
          <td style="padding:10px 16px;text-align:right;color:${outTotalColor};">${formatCurrency(custTotalOutstanding, symbol)}</td>
          <td></td>
        </tr>
      `;

      if (customers.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted,#9ca3af);">No customers found</td></tr>
        `;
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      customerTableContainer.appendChild(table);
    }

    renderCustomerTable();
    grid.appendChild(customerSection);

    // ---- Supplier Balances ----
    const supplierSection = document.createElement('div');
    supplierSection.style.cssText = 'border:1px solid var(--border-color,#e5e7eb);border-radius:10px;overflow:hidden;';

    const supplierHeader = document.createElement('div');
    supplierHeader.style.cssText = 'padding:14px 20px;border-bottom:1px solid var(--border-color,#e5e7eb);font-size:15px;font-weight:700;color:var(--text-primary,#111);background:var(--bg-secondary,#f9fafb);';
    supplierHeader.textContent = 'Supplier Balances';
    supplierSection.appendChild(supplierHeader);

    const supplierTableContainer = document.createElement('div');
    supplierTableContainer.style.cssText = 'padding:0;';
    supplierSection.appendChild(supplierTableContainer);

    // Build supplier balance data
    let suppTotalPurchased = 0;
    let suppTotalReceived = 0;
    let suppTotalOutstanding = 0;

    const supplierData = suppliers.map(s => {
      const suppPurchases = purchases.filter(p => p.supplierId === s.id);
      const totalPurchased = sumField(suppPurchases, 'totalAmount');

      // Sum payment_out transactions for this supplier
      const suppPayments = transactions.filter(t => t.accountId === s.id && t.type === 'payment_out');
      const totalReceived = sumField(suppPayments, 'amount');

      const outstanding = totalPurchased - totalReceived;

      suppTotalPurchased += totalPurchased;
      suppTotalReceived += totalReceived;
      suppTotalOutstanding += outstanding;

      return {
        _name: s.name,
        _totalPurchased: totalPurchased,
        _totalReceived: totalReceived,
        _outstanding: outstanding,
      };
    });

    function renderSupplierTable() {
      supplierTableContainer.innerHTML = '';

      const table = document.createElement('table');
      table.style.cssText = 'width:100%;border-collapse:collapse;font-size:14px;';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="background:var(--bg-secondary,#f9fafb);">
          <th style="padding:10px 16px;text-align:left;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Name</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Purchased</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Received</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Outstanding</th>
          <th style="padding:10px 16px;text-align:center;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted,#6b7280);border-bottom:2px solid var(--border-color,#e5e7eb);">Status</th>
        </tr>
      `;

      const tbody = document.createElement('tbody');
      supplierData.forEach(s => {
        const outColor = s._outstanding > 0 ? '#ef4444' : '#10b981';
        const statusBadge = s._outstanding > 0
          ? '<span class="badge badge-warning">Outstanding</span>'
          : '<span class="badge badge-success">Clear</span>';

        tbody.innerHTML += `
          <tr style="border-bottom:1px solid var(--border-color,#f3f4f6);">
            <td style="padding:10px 16px;font-weight:500;">${escapeHtml(s._name)}</td>
            <td style="padding:10px 16px;text-align:right;">${formatCurrency(s._totalPurchased, symbol)}</td>
            <td style="padding:10px 16px;text-align:right;">${formatCurrency(s._totalReceived, symbol)}</td>
            <td style="padding:10px 16px;text-align:right;color:${outColor};font-weight:600;">${formatCurrency(s._outstanding, symbol)}</td>
            <td style="padding:10px 16px;text-align:center;">${statusBadge}</td>
          </tr>
        `;
      });

      const outTotalColor = suppTotalOutstanding > 0 ? '#ef4444' : '#10b981';
      tbody.innerHTML += `
        <tr style="font-weight:700;border-top:2px solid var(--border-color,#e5e7eb);">
          <td style="padding:10px 16px;">Totals</td>
          <td style="padding:10px 16px;text-align:right;">${formatCurrency(suppTotalPurchased, symbol)}</td>
          <td style="padding:10px 16px;text-align:right;">${formatCurrency(suppTotalReceived, symbol)}</td>
          <td style="padding:10px 16px;text-align:right;color:${outTotalColor};">${formatCurrency(suppTotalOutstanding, symbol)}</td>
          <td></td>
        </tr>
      `;

      if (suppliers.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted,#9ca3af);">No suppliers found</td></tr>
        `;
      }

      table.appendChild(thead);
      table.appendChild(tbody);
      supplierTableContainer.appendChild(table);
    }

    renderSupplierTable();
    grid.appendChild(supplierSection);

    tabContentEl.appendChild(grid);
  }

  // ---- Initial render ----
  renderTabs();
  renderActiveTab();

  // ---- Subscribe to all relevant events ----
  const events = [
    'products:changed',
    'categories:changed',
    'invoices:changed',
    'purchases:changed',
    'customers:changed',
    'suppliers:changed',
    'transactions:changed',
  ];

  events.forEach(event => {
    const unsub = store.subscribe(event, () => {
      renderActiveTab();
    });
    cleanupFns.push(unsub);
  });

  // ---- Cleanup function ----
  return function cleanup() {
    cleanupFns.forEach(fn => {
      try { fn(); } catch (e) { /* noop */ }
    });
    cleanupFns.length = 0;
    if (activeTable) { try { activeTable.destroy(); } catch (e) { /* noop */ } }
    container.innerHTML = '';
  };
}

export { render as renderReport };
