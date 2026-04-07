// ============================================
// js/pages/dashboard.js — Dashboard Page Module
// ============================================

import store from '../store.js';
import {
  formatCurrency, formatDate, formatDateTime, formatRelativeTime,
  getStatusBadgeClass, escapeHtml, getShortMonthNames
} from '../utils.js';
import {
  renderPageHeader, renderBreadcrumbs, renderStatCards, renderDataTable,
  renderEmptyState, renderBarChart, renderDonutChart,
  showSuccess, confirmDialog, createFormGroup
} from '../components.js';

// ============================================
// Helper: Compute last 6 months revenue data
// ============================================

function getLastSixMonthsRevenue() {
  const invoices = store.data.invoices || [];
  const now = new Date();
  const months = [];
  const monthNames = getShortMonthNames();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      key,
      label: monthNames[d.getMonth()],
    });
  }

  const data = months.map(m => {
    const total = invoices
      .filter(inv => {
        if (inv.status !== 'paid') return false;
        const invDate = new Date(inv.date || inv.createdAt);
        if (isNaN(invDate.getTime())) return false;
        return `${invDate.getFullYear()}-${String(invDate.getMonth() + 1).padStart(2, '0')}` === m.key;
      })
      .reduce((sum, inv) => sum + (inv.totalAmount || inv.total || 0), 0);
    return { label: m.label, value: Math.round(total * 100) / 100 };
  });

  return data;
}

// ============================================
// Helper: Compute stock by category data
// ============================================

function getStockByCategory() {
  const { products = [], categories = [] } = store.data;
  const catMap = {};

  products.forEach(p => {
    const catName = p.categoryId
      ? (categories.find(c => c.id === p.categoryId)?.name || 'Uncategorized')
      : 'Uncategorized';
    catMap[catName] = (catMap[catName] || 0) + 1;
  });

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  return Object.keys(catMap).map((label, idx) => ({
    label,
    value: catMap[label],
    color: colors[idx % colors.length],
  }));
}

// ============================================
// Helper: Transaction type icon map
// ============================================

const TX_TYPE_ICONS = {
  sale: '🛒',
  purchase: '🛍️',
  payment_in: '💰',
  payment_out: '💸',
  adjustment: '🔧',
  opening: '🏦',
  refund: '↩️',
};

// ============================================
// Main: renderDashboard
// ============================================

export function renderDashboard(container) {
  const unsubscribers = [];

  // Subscribe to ALL entity change events for live re-render
  unsubscribers.push(store.subscribe('products:changed', () => render(container)));
  unsubscribers.push(store.subscribe('customers:changed', () => render(container)));
  unsubscribers.push(store.subscribe('invoices:changed', () => render(container)));
  unsubscribers.push(store.subscribe('purchases:changed', () => render(container)));
  unsubscribers.push(store.subscribe('transactions:changed', () => render(container)));
  unsubscribers.push(store.subscribe('categories:changed', () => render(container)));
  unsubscribers.push(store.subscribe('suppliers:changed', () => render(container)));
  unsubscribers.push(store.subscribe('stockmovements:changed', () => render(container)));
  unsubscribers.push(store.subscribe('settings:changed', () => render(container)));
  unsubscribers.push(store.subscribe('dashboard:refresh', () => render(container)));

  // ---- Internal render function ----

  function render(container) {
    const {
      products = [],
      customers = [],
      invoices = [],
      purchases = [],
      transactions = [],
      categories = [],
    } = store.data;

    const settings = store.getSettings();
    const sym = settings.currencySymbol || '$';

    // ---- Compute stats ----

    const totalProducts = products.length;
    const totalCustomers = customers.length;
    const lowStockProducts = store.getLowStockProducts();
    const lowStockItems = lowStockProducts.length;
    const pendingInvoices = invoices.filter(
      i => i.status === 'draft' || i.status === 'sent' || i.status === 'overdue'
    ).length;

    const inventoryValue = store.getInventoryValue();
    const totalRevenue = store.getTotalRevenue();
    const totalPayables = store.getTotalPayables();
    const totalReceivables = store.getTotalReceivables();

    // ---- Compute recent data ----

    const recentInvoices = [...invoices]
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 5);

    const recentPurchases = [...purchases]
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 5);

    const recentActivity = [...transactions]
      .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
      .slice(0, 10);

    // ---- Chart data ----

    const revenueChartData = getLastSixMonthsRevenue();
    const categoryChartData = getStockByCategory();

    // ---- Build HTML ----

    const html = `
      <!-- Page Header -->
      <div id="dash-header"></div>
      <div id="dash-breadcrumbs"></div>

      <!-- Stat Cards -->
      <div id="dash-stats" style="margin-bottom: 24px;"></div>

      <!-- Charts: Revenue + Category Donut -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="dash-charts-grid">
        <div style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
        ">
          <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
            Revenue Overview (Last 6 Months)
          </h3>
          <div id="dash-revenue-chart"></div>
        </div>
        <div style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
        ">
          <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
            Stock by Category
          </h3>
          <div id="dash-category-chart"></div>
        </div>
      </div>

      <!-- Recent Invoices + Recent Purchases -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="dash-tables-grid">
        <!-- Recent Invoices -->
        <div style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          overflow: hidden;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
              Recent Invoices
            </h3>
            <a href="#invoice" class="dash-view-invoices" style="
              font-size: 13px; color: #3b82f6; text-decoration: none; font-weight: 500;
              cursor: pointer;
            ">View All &rarr;</a>
          </div>
          <div id="dash-recent-invoices"></div>
        </div>

        <!-- Recent Purchases -->
        <div style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          overflow: hidden;
        ">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
              Recent Purchases
            </h3>
            <a href="#purchase" class="dash-view-purchases" style="
              font-size: 13px; color: #3b82f6; text-decoration: none; font-weight: 500;
              cursor: pointer;
            ">View All &rarr;</a>
          </div>
          <div id="dash-recent-purchases"></div>
        </div>
      </div>

      <!-- Low Stock Alerts + Recent Activity -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;" class="dash-alerts-grid">
        <!-- Low Stock Alerts -->
        <div style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          overflow: hidden;
        ">
          <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
            ⚠️ Low Stock Alerts
          </h3>
          <div id="dash-low-stock"></div>
        </div>

        <!-- Recent Activity -->
        <div style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          overflow: hidden;
        ">
          <h3 style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
            Recent Activity
          </h3>
          <div id="dash-activity"></div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div style="
        background: var(--bg-primary, #fff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 12px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      ">
        <span style="font-size: 15px; font-weight: 600; color: var(--text-primary, #111); margin-right: 8px;">Quick Actions:</span>
        <button class="dash-quick-action" data-target="invoice" style="
          padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
          background: #3b82f6; color: white; cursor: pointer;
          font-size: 14px; font-weight: 500; transition: background 150ms;
        " onmouseenter="this.style.background='#2563eb'" onmouseleave="this.style.background='#3b82f6'">
          🧾 Create Invoice
        </button>
        <button class="dash-quick-action" data-target="product" style="
          padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
          background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
          cursor: pointer; font-size: 14px; font-weight: 500; transition: background 150ms;
        " onmouseenter="this.style.background='var(--bg-secondary,#f9fafb)'" onmouseleave="this.style.background='var(--bg-primary,#fff)'">
          📦 Add Product
        </button>
        <button class="dash-quick-action" data-target="customer" style="
          padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
          background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
          cursor: pointer; font-size: 14px; font-weight: 500; transition: background 150ms;
        " onmouseenter="this.style.background='var(--bg-secondary,#f9fafb)'" onmouseleave="this.style.background='var(--bg-primary,#fff)'">
          👤 Add Customer
        </button>
      </div>

      <style>
        @media (max-width: 768px) {
          .dash-charts-grid,
          .dash-tables-grid,
          .dash-alerts-grid {
            grid-template-columns: 1fr !important;
          }
        }
      </style>
    `;

    container.innerHTML = html;

    // ---- Render sub-components ----

    renderPageHeader(document.getElementById('dash-header'), {
      title: 'Dashboard',
      description: "SuFa Inventory — Your business overview at a glance.",
      icon: '📊',
    });

    renderBreadcrumbs(document.getElementById('dash-breadcrumbs'), [
      { label: 'Dashboard' },
    ]);

    renderStatCards(document.getElementById('dash-stats'), [
      { title: 'Total Products', value: totalProducts, icon: '📦', color: 'blue' },
      { title: 'Total Customers', value: totalCustomers, icon: '👥', color: 'purple' },
      { title: 'Low Stock Items', value: lowStockItems, icon: '⚠️', color: 'red' },
      { title: 'Pending Invoices', value: pendingInvoices, icon: '📄', color: 'amber' },
      { title: 'Inventory Value', value: formatCurrency(inventoryValue, sym), icon: '💰', color: 'green' },
      { title: 'Total Revenue', value: formatCurrency(totalRevenue, sym), icon: '💵', color: 'cyan' },
      { title: 'Total Payables', value: formatCurrency(totalPayables, sym), icon: '🏪', color: 'red' },
      { title: 'Total Receivables', value: formatCurrency(totalReceivables, sym), icon: '👤', color: 'amber' },
    ]);

    // ---- Render tables ----

    renderRecentInvoices(document.getElementById('dash-recent-invoices'), recentInvoices, sym);
    renderRecentPurchases(document.getElementById('dash-recent-purchases'), recentPurchases, sym);
    renderLowStockAlerts(document.getElementById('dash-low-stock'), lowStockProducts, settings);
    renderActivityFeed(document.getElementById('dash-activity'), recentActivity, sym);

    // ---- Render charts ----

    renderCharts(container);

    // ---- Bind events ----

    bindEvents(container);
  }

  // ---- Recent Invoices Table ----

  function renderRecentInvoices(el, invoices, sym) {
    if (!el) return;

    if (invoices.length === 0) {
      renderEmptyState(el, { icon: '📄', title: 'No invoices yet', description: 'Create your first invoice to get started.' });
      return;
    }

    const tableHtml = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color, #e5e7eb);">
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Invoice#</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Customer</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Date</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(inv => `
              <tr style="border-bottom: 1px solid var(--border-color, #f3f4f6); transition: background 150ms;"
                  onmouseenter="this.style.background='var(--bg-hover, rgba(0,0,0,0.04))'"
                  onmouseleave="this.style.background=''">
                <td style="padding: 10px 12px; font-weight: 500; color: var(--text-primary, #111);">${escapeHtml(inv.invoiceNumber || inv.id)}</td>
                <td style="padding: 10px 12px; color: var(--text-secondary, #4b5563);">${escapeHtml(inv.customerName || '—')}</td>
                <td style="padding: 10px 12px; color: var(--text-muted, #6b7280); font-size: 12px;">${formatDate(inv.date || inv.createdAt)}</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-primary, #111);">${formatCurrency(inv.totalAmount || inv.total || 0, sym)}</td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span class="badge ${getStatusBadgeClass(inv.status)}">${escapeHtml((inv.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    el.innerHTML = tableHtml;
  }

  // ---- Recent Purchases Table ----

  function renderRecentPurchases(el, purchases, sym) {
    if (!el) return;

    if (purchases.length === 0) {
      renderEmptyState(el, { icon: '🛒', title: 'No purchases yet', description: 'Create your first purchase order to get started.' });
      return;
    }

    const tableHtml = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color, #e5e7eb);">
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">PO#</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Supplier</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Date</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Amount</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${purchases.map(po => `
              <tr style="border-bottom: 1px solid var(--border-color, #f3f4f6); transition: background 150ms;"
                  onmouseenter="this.style.background='var(--bg-hover, rgba(0,0,0,0.04))'"
                  onmouseleave="this.style.background=''">
                <td style="padding: 10px 12px; font-weight: 500; color: var(--text-primary, #111);">${escapeHtml(po.purchaseNumber || po.id)}</td>
                <td style="padding: 10px 12px; color: var(--text-secondary, #4b5563);">${escapeHtml(po.supplierName || '—')}</td>
                <td style="padding: 10px 12px; color: var(--text-muted, #6b7280); font-size: 12px;">${formatDate(po.date || po.createdAt)}</td>
                <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--text-primary, #111);">${formatCurrency(po.totalAmount || po.total || 0, sym)}</td>
                <td style="padding: 10px 12px; text-align: center;">
                  <span class="badge ${getStatusBadgeClass(po.status)}">${escapeHtml((po.status || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    el.innerHTML = tableHtml;
  }

  // ---- Low Stock Alerts Table ----

  function renderLowStockAlerts(el, lowStockProducts, settings) {
    if (!el) return;
    const threshold = settings.lowStockThreshold || 10;

    if (lowStockProducts.length === 0) {
      renderEmptyState(el, { icon: '✅', title: 'All products are above threshold', description: 'No low stock alerts at this time.' });
      return;
    }

    const tableHtml = `
      <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color, #e5e7eb); position: sticky; top: 0; background: var(--bg-primary, #fff); z-index: 1;">
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">SKU</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Current Qty</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Threshold</th>
              <th style="padding: 10px 12px; text-align: center; font-weight: 600; color: var(--text-muted, #6b7280); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${lowStockProducts.map(p => {
              const qty = p.quantity || 0;
              const pThreshold = p.lowStockThreshold || threshold;
              const isOutOfStock = qty === 0;
              const statusClass = isOutOfStock ? 'badge-danger' : 'badge-warning';
              const statusText = isOutOfStock ? 'Out of Stock' : 'Low Stock';

              return `
                <tr style="border-bottom: 1px solid var(--border-color, #f3f4f6); transition: background 150ms;"
                    onmouseenter="this.style.background='var(--bg-hover, rgba(0,0,0,0.04))'"
                    onmouseleave="this.style.background=''">
                  <td style="padding: 10px 12px; font-weight: 500; color: var(--text-primary, #111);">${escapeHtml(p.name)}</td>
                  <td style="padding: 10px 12px; color: var(--text-muted, #6b7280); font-size: 12px;">${escapeHtml(p.sku || '—')}</td>
                  <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: ${isOutOfStock ? '#ef4444' : '#f59e0b'};">${qty}</td>
                  <td style="padding: 10px 12px; text-align: center; color: var(--text-muted, #6b7280);">${pThreshold}</td>
                  <td style="padding: 10px 12px; text-align: center;">
                    <span class="badge ${statusClass}">${statusText}</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    el.innerHTML = tableHtml;
  }

  // ---- Recent Activity Feed ----

  function renderActivityFeed(el, transactions, sym) {
    if (!el) return;

    if (transactions.length === 0) {
      renderEmptyState(el, { icon: '📋', title: 'No activity yet', description: 'Activity will appear here as you create transactions.' });
      return;
    }

    const incomeTypes = ['sale', 'payment_in', 'receipt'];

    const feedHtml = `
      <div style="max-height: 350px; overflow-y: auto;">
        ${transactions.map(tx => {
          const icon = TX_TYPE_ICONS[tx.type] || '📋';
          const isIncome = incomeTypes.includes(tx.type);
          const amountColor = isIncome ? '#10b981' : '#ef4444';
          const amountPrefix = isIncome ? '+' : '-';
          const amount = tx.amount || 0;

          return `
            <div style="
              display: flex; align-items: center; justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid var(--border-color, #f3f4f6);
            ">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                <span style="font-size: 20px; flex-shrink: 0;">${icon}</span>
                <div style="min-width: 0;">
                  <p style="margin: 0; font-size: 13px; font-weight: 500; color: var(--text-primary, #111); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${escapeHtml(tx.description || tx.type)}
                  </p>
                  <p style="margin: 2px 0 0; font-size: 11px; color: var(--text-muted, #6b7280);">
                    ${(tx.type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </p>
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
                ${amount > 0 ? `<p style="margin: 0; font-size: 13px; font-weight: 600; color: ${amountColor};">${amountPrefix}${formatCurrency(amount, sym)}</p>` : ''}
                <p style="margin: 2px 0 0; font-size: 11px; color: var(--text-muted, #6b7280);">
                  ${formatRelativeTime(tx.createdAt || tx.date)}
                </p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    el.innerHTML = feedHtml;
  }

  // ---- Render Charts ----

  function renderCharts(container) {
    const revenueEl = document.getElementById('dash-revenue-chart');
    const categoryEl = document.getElementById('dash-category-chart');

    if (revenueEl) {
      const revenueData = getLastSixMonthsRevenue();
      renderBarChart(revenueEl, {
        data: revenueData.map(d => ({
          label: d.label,
          value: d.value,
          color: '#4f46e5',
        })),
        height: 220,
        showValues: true,
      });
    }

    if (categoryEl) {
      const catData = getStockByCategory();
      if (catData.length > 0) {
        renderDonutChart(categoryEl, {
          data: catData,
          size: 200,
          centerLabel: 'Products',
          centerValue: String(store.data.products.length),
        });
      } else {
        renderEmptyState(categoryEl, {
          icon: '📊',
          title: 'No categories yet',
          description: 'Add categories and products to see distribution.',
        });
      }
    }
  }

  // ---- Bind Events ----

  function bindEvents(container) {
    // Quick action buttons
    container.querySelectorAll('.dash-quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.dataset.target;
        if (target) {
          window.location.hash = target;
          window.navigate(target);
        }
      });
    });

    // View All Invoices
    const viewInvoices = container.querySelector('.dash-view-invoices');
    if (viewInvoices) {
      viewInvoices.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'invoice';
        window.navigate('invoice');
      });
    }

    // View All Purchases
    const viewPurchases = container.querySelector('.dash-view-purchases');
    if (viewPurchases) {
      viewPurchases.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = 'purchase';
        window.navigate('purchase');
      });
    }
  }

  // ---- Initial render ----
  render(container);

  // ---- Return cleanup function ----
  return () => {
    unsubscribers.forEach(fn => fn());
  };
}

// ============================================
// Backward-compatible export for app.js
// ============================================

export default {
  render() {
    return '<div id="dashboard-root"></div>';
  },
  init() {
    const container = document.getElementById('dashboard-root');
    if (container) {
      renderDashboard(container);
    }
  },
};
