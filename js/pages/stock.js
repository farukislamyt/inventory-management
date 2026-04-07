// ============================================
// js/pages/stock.js — Stock Management Page
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

function getStockStatus(product) {
  const qty = product.quantity || 0;
  const threshold = product.lowStockThreshold || store.getSettings().lowStockThreshold || 10;
  if (qty === 0) return 'outOfStock';
  if (qty <= threshold) return 'lowStock';
  return 'inStock';
}

function getStockStatusBadge(status) {
  switch (status) {
    case 'inStock': return '<span class="badge badge-success">In Stock</span>';
    case 'lowStock': return '<span class="badge badge-warning">Low Stock</span>';
    case 'outOfStock': return '<span class="badge badge-danger">Out of Stock</span>';
    default: return '<span class="badge badge-neutral">Unknown</span>';
  }
}

function buildOverviewTableData(products, categories, currencySymbol) {
  const settings = store.getSettings();
  return products.map(p => {
    const category = store.getCategoryById(p.categoryId);
    const categoryName = category ? category.name : 'Uncategorized';
    const threshold = p.lowStockThreshold || settings.lowStockThreshold || 10;
    const status = getStockStatus(p);
    const inventoryValue = (p.quantity || 0) * (p.costPrice || 0);
    return {
      id: p.id,
      _productId: p.id,
      _name: p.name,
      _sku: p.sku || '',
      _category: categoryName,
      _quantity: p.quantity || 0,
      _threshold: threshold,
      _status: status,
      _inventoryValue: inventoryValue,
    };
  });
}

function buildMovementsTableData(movements, products) {
  return movements.map(m => {
    const product = store.getProductById(m.productId);
    const productName = product ? product.name : (m.productName || 'Unknown');
    return {
      _createdAt: m.createdAt || '',
      _date: m.createdAt || '',
      _productName: productName,
      _type: m.type || '',
      _quantity: m.quantity || 0,
      _previousQuantity: m.previousQuantity || 0,
      _newQuantity: m.newQuantity || 0,
      _reference: (m.referenceType || 'manual') + (m.note ? ': ' + m.note : ''),
    };
  });
}

// ============================================
// Page Render
// ============================================

export function render(container) {
  const cleanupFns = [];

  // Clear container
  container.innerHTML = '';

  // Create sub-elements
  const headerEl = document.createElement('div');
  headerEl.id = 'stock-page-header';
  container.appendChild(headerEl);

  const breadcrumbsEl = document.createElement('div');
  breadcrumbsEl.id = 'stock-breadcrumbs';
  container.appendChild(breadcrumbsEl);

  const statsEl = document.createElement('div');
  statsEl.id = 'stock-stats';
  container.appendChild(statsEl);

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.id = 'stock-tab-bar';
  tabBar.style.cssText = 'display:flex;gap:4px;border-bottom:2px solid var(--border-color,#e5e7eb);margin-bottom:24px;';
  container.appendChild(tabBar);

  // Tab content containers
  const overviewEl = document.createElement('div');
  overviewEl.id = 'stock-tab-overview';
  container.appendChild(overviewEl);

  const movementsEl = document.createElement('div');
  movementsEl.id = 'stock-tab-movements';
  container.appendChild(movementsEl);

  // State
  let activeTab = 'overview';
  let overviewTable = null;
  let movementsTable = null;
  let statsApi = null;

  // ---- Render header ----
  renderPageHeader(headerEl, {
    title: 'Stock Management',
    description: 'Track inventory levels and stock movements',
    icon: '📊',
  });

  // ---- Render breadcrumbs ----
  renderBreadcrumbs(breadcrumbsEl, [{ label: 'Stock' }]);

  // ---- Render stat cards ----
  function refreshStats() {
    const products = store.getProducts();
    const settings = store.getSettings();
    const symbol = settings.currencySymbol || '$';

    const totalProducts = products.length;
    const lowStockItems = products.filter(p => {
      const qty = p.quantity || 0;
      const threshold = p.lowStockThreshold || settings.lowStockThreshold || 10;
      return qty > 0 && qty <= threshold;
    }).length;
    const outOfStock = products.filter(p => (p.quantity || 0) === 0).length;
    const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.costPrice || 0)), 0);

    const cards = [
      { title: 'Total Products', value: String(totalProducts), icon: '📦', color: 'blue' },
      { title: 'Low Stock Items', value: String(lowStockItems), icon: '⚠️', color: 'amber' },
      { title: 'Out of Stock', value: String(outOfStock), icon: '🚫', color: 'red' },
      { title: 'Total Stock Value', value: formatCurrency(totalValue, symbol), icon: '💰', color: 'green' },
    ];

    if (statsApi) {
      statsApi.update(cards);
    } else {
      statsApi = renderStatCards(statsEl, cards);
    }
  }

  // ---- Render tab bar ----
  function renderTabs() {
    tabBar.innerHTML = '';
    const tabs = [
      { key: 'overview', label: 'Stock Overview' },
      { key: 'movements', label: 'Stock Movements' },
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

  // ---- Render active tab content ----
  function renderActiveTab() {
    if (activeTab === 'overview') {
      overviewEl.style.display = 'block';
      movementsEl.style.display = 'none';
      renderOverviewTab();
    } else {
      overviewEl.style.display = 'none';
      movementsEl.style.display = 'block';
      renderMovementsTab();
    }
  }

  // ---- Tab 1: Stock Overview ----
  let categoryFilterEl = null;

  function renderOverviewTab() {
    // Destroy old table
    if (overviewTable) { overviewTable.destroy(); overviewTable = null; }

    overviewEl.innerHTML = '';

    // Filter bar
    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

    const categories = store.getCategories();
    const settings = store.getSettings();
    const symbol = settings.currencySymbol || '$';

    // Category filter dropdown
    const filterLabel = document.createElement('label');
    filterLabel.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);';
    filterLabel.textContent = 'Category:';

    categoryFilterEl = document.createElement('select');
    categoryFilterEl.style.cssText = `
      padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px; font-size: 14px; min-width: 180px;
      background: var(--bg-primary, #fff); color: var(--text-primary, #111);
      cursor: pointer;
    `;
    let catHtml = '<option value="all">All Categories</option>';
    categories.forEach(c => {
      catHtml += `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`;
    });
    categoryFilterEl.innerHTML = catHtml;

    const tableContainer = document.createElement('div');
    tableContainer.id = 'stock-overview-table';

    filterBar.appendChild(filterLabel);
    filterBar.appendChild(categoryFilterEl);
    overviewEl.appendChild(filterBar);
    overviewEl.appendChild(tableContainer);

    // Build table data
    function getFilteredData() {
      const products = store.getProducts();
      const selectedCat = categoryFilterEl ? categoryFilterEl.value : 'all';
      const filtered = selectedCat === 'all'
        ? products
        : products.filter(p => p.categoryId === selectedCat);
      return buildOverviewTableData(filtered, categories, symbol);
    }

    // Render table
    overviewTable = renderDataTable(tableContainer, {
      columns: [
        { key: '_name', label: 'Product Name' },
        { key: '_sku', label: 'SKU', hidden: true },
        { key: '_category', label: 'Category', hidden: true },
        { key: '_quantity', label: 'Current Quantity', render: (val) => `<strong>${val}</strong>` },
        { key: '_threshold', label: 'Threshold' },
        { key: '_status', label: 'Status', render: (val) => getStockStatusBadge(val) },
        { key: '_inventoryValue', label: 'Inventory Value', render: (val) => formatCurrency(val, symbol) },
      ],
      data: getFilteredData(),
      searchPlaceholder: 'Search products...',
      actions: (row) => `<button class="adjust-stock-btn" data-product-id="${escapeHtml(row._productId)}" style="
        padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #111);
        cursor: pointer; font-size: 13px; font-weight: 500;
        transition: background 150ms;
      " onmouseenter="this.style.background='var(--bg-hover,#f3f4f6)'"
         onmouseleave="this.style.background='var(--bg-primary,#fff)'"
      >Adjust Stock</button>`,
      pageSize: 15,
      emptyMessage: 'No products found',
      emptyIcon: '📦',
    });

    // Wire category filter
    categoryFilterEl.addEventListener('change', () => {
      overviewTable.refresh(getFilteredData());
      // Re-wire action buttons after refresh
      wireAdjustButtons();
    });

    // Wire adjust buttons
    function wireAdjustButtons() {
      const tableBody = tableContainer.querySelector('.table-body');
      if (!tableBody) return;
      tableBody.querySelectorAll('.adjust-stock-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const productId = btn.dataset.productId;
          openAdjustStockModal(productId);
        });
      });
    }

    // Observe DOM changes to wire new buttons after search/sort
    const observer = new MutationObserver(() => { wireAdjustButtons(); });
    observer.observe(tableContainer, { childList: true, subtree: true });
    cleanupFns.push(() => observer.disconnect());

    wireAdjustButtons();
  }

  // ---- Tab 2: Stock Movements ----
  let productFilterEl = null;
  let typeFilterEl = null;

  function renderMovementsTab() {
    // Destroy old table
    if (movementsTable) { movementsTable.destroy(); movementsTable = null; }

    movementsEl.innerHTML = '';

    // Filter bar
    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;';

    const products = store.getProducts();
    const settings = store.getSettings();
    const symbol = settings.currencySymbol || '$';

    // Product filter
    const prodLabel = document.createElement('label');
    prodLabel.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);';
    prodLabel.textContent = 'Product:';

    productFilterEl = document.createElement('select');
    productFilterEl.style.cssText = `
      padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px; font-size: 14px; min-width: 200px;
      background: var(--bg-primary, #fff); color: var(--text-primary, #111);
      cursor: pointer;
    `;
    let prodHtml = '<option value="all">All Products</option>';
    products.forEach(p => {
      prodHtml += `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`;
    });
    productFilterEl.innerHTML = prodHtml;

    // Type filter
    const typeLabel = document.createElement('label');
    typeLabel.style.cssText = 'font-size:13px;font-weight:600;color:var(--text-muted,#6b7280);';
    typeLabel.textContent = 'Type:';

    typeFilterEl = document.createElement('select');
    typeFilterEl.style.cssText = `
      padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px; font-size: 14px; min-width: 150px;
      background: var(--bg-primary, #fff); color: var(--text-primary, #111);
      cursor: pointer;
    `;
    typeFilterEl.innerHTML = `
      <option value="all">All Types</option>
      <option value="in">Stock In</option>
      <option value="out">Stock Out</option>
      <option value="adjustment">Adjustment</option>
    `;

    const tableContainer = document.createElement('div');
    tableContainer.id = 'stock-movements-table';

    filterBar.appendChild(prodLabel);
    filterBar.appendChild(productFilterEl);
    filterBar.appendChild(typeLabel);
    filterBar.appendChild(typeFilterEl);
    movementsEl.appendChild(filterBar);
    movementsEl.appendChild(tableContainer);

    // Build filtered data
    function getFilteredData() {
      let movements = [...store.getStockMovements()];
      // Sort newest first
      movements.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      const selectedProduct = productFilterEl ? productFilterEl.value : 'all';
      const selectedType = typeFilterEl ? typeFilterEl.value : 'all';

      if (selectedProduct !== 'all') {
        movements = movements.filter(m => m.productId === selectedProduct);
      }
      if (selectedType !== 'all') {
        movements = movements.filter(m => m.type === selectedType);
      }

      return buildMovementsTableData(movements, products);
    }

    movementsTable = renderDataTable(tableContainer, {
      columns: [
        {
          key: '_date',
          label: 'Date',
          render: (val) => formatDateTime(val),
        },
        { key: '_productName', label: 'Product Name' },
        {
          key: '_type',
          label: 'Type',
          render: (val) => {
            const badgeMap = {
              in: '<span class="badge badge-success">Stock In</span>',
              out: '<span class="badge badge-danger">Stock Out</span>',
              adjustment: '<span class="badge badge-info">Adjustment</span>',
            };
            return badgeMap[val] || `<span class="badge badge-neutral">${escapeHtml(val)}</span>`;
          },
        },
        {
          key: '_quantity',
          label: 'Quantity',
          render: (val, row) => {
            let color = '#3b82f6';
            let prefix = '';
            if (row._type === 'in') { color = '#10b981'; prefix = '+'; }
            else if (row._type === 'out') { color = '#ef4444'; prefix = '-'; }
            return `<span style="color:${color};font-weight:600;">${prefix}${val}</span>`;
          },
        },
        { key: '_previousQuantity', label: 'Previous Qty' },
        { key: '_newQuantity', label: 'New Qty' },
        {
          key: '_reference',
          label: 'Reference',
          render: (val) => `<span style="font-size:13px;color:var(--text-muted,#6b7280);">${escapeHtml(val || '—')}</span>`,
        },
      ],
      data: getFilteredData(),
      searchPlaceholder: 'Search movements...',
      searchable: false,
      pageSize: 15,
      emptyMessage: 'No stock movements found',
      emptyIcon: '📋',
    });

    // Wire filters
    const refreshMovements = () => {
      movementsTable.refresh(getFilteredData());
    };

    productFilterEl.addEventListener('change', refreshMovements);
    typeFilterEl.addEventListener('change', refreshMovements);
  }

  // ---- Adjust Stock Modal ----
  function openAdjustStockModal(productId) {
    const product = store.getProductById(productId);
    if (!product) { showError('Product not found'); return; }

    const currentQty = product.quantity || 0;
    const symbol = store.getSettings().currencySymbol || '$';

    const content = `
      <form id="adjust-stock-form">
        <input type="hidden" name="productId" value="${escapeHtml(product.id)}" />

        ${createFormGroup('Product Name', `<input type="text" value="${escapeHtml(product.name)}" readonly style="
          width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
          font-size:14px;background:var(--bg-secondary,#f9fafb);color:var(--text-primary,#111);
          font-weight:600;
        "/>`, 'adj-product-name')}

        ${createFormGroup('Current Quantity', `<input type="text" value="${currentQty}" readonly style="
          width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
          font-size:14px;background:var(--bg-secondary,#f9fafb);color:var(--text-primary,#111);
          font-weight:700;
        "/>`, 'adj-current-qty')}

        ${createFormGroup('Adjustment Type', `
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:4px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;">
              <input type="radio" name="adjustmentType" value="in" checked style="accent-color:var(--accent-blue,#3b82f6);cursor:pointer;" />
              Add Stock
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;">
              <input type="radio" name="adjustmentType" value="out" style="accent-color:var(--accent-blue,#3b82f6);cursor:pointer;" />
              Remove Stock
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;">
              <input type="radio" name="adjustmentType" value="adjustment" style="accent-color:var(--accent-blue,#3b82f6);cursor:pointer;" />
              Set Quantity
            </label>
          </div>
        `, 'adj-type')}

        ${createFormGroup('Quantity', `<input type="number" name="quantity" min="0" step="1" placeholder="Enter quantity" style="
          width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
          font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);
        "/>`, 'adj-quantity')}

        <div id="adjust-preview" style="
          padding:12px 16px;margin:12px 0;border-radius:8px;
          background:#eff6ff;border:1px solid #bfdbfe;
          font-size:14px;font-weight:600;color:#1e40af;
        ">
          New quantity will be: <span id="adjust-preview-value">${currentQty}</span>
        </div>

        ${createFormGroup('Note (optional)', `<textarea name="note" rows="2" placeholder="Reason for adjustment..." style="
          width:100%;padding:9px 12px;border:1px solid var(--border-color,#d1d5db);border-radius:8px;
          font-size:14px;background:var(--bg-primary,#fff);color:var(--text-primary,#111);
          resize:vertical;min-height:60px;
        "/>`, 'adj-note')}
      </form>
    `;

    const footer = `
      <button id="adj-cancel-btn" style="
        padding:8px 20px;border-radius:8px;border:1px solid var(--border-color,#d1d5db);
        background:var(--bg-primary,#fff);color:var(--text-primary,#374151);
        cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
      ">Cancel</button>
      <button id="adj-submit-btn" style="
        padding:8px 20px;border-radius:8px;border:none;
        background:var(--accent-blue,#3b82f6);color:white;
        cursor:pointer;font-size:14px;font-weight:500;transition:background 150ms;
      ">Save Adjustment</button>
    `;

    const modal = openModal({
      title: 'Adjust Stock',
      size: 'md',
      content,
      footer,
    });

    // Wire up events
    const modalEl = modal.getElement();

    const qtyInput = modalEl.querySelector('input[name="quantity"]');
    const typeRadios = modalEl.querySelectorAll('input[name="adjustmentType"]');
    const previewValue = modalEl.querySelector('#adjust-preview-value');
    const cancelBtn = modalEl.querySelector('#adj-cancel-btn');
    const submitBtn = modalEl.querySelector('#adj-submit-btn');

    function updatePreview() {
      const type = modalEl.querySelector('input[name="adjustmentType"]:checked')?.value || 'in';
      const qty = parseNumber(qtyInput.value);

      let newQty;
      if (type === 'in') {
        newQty = currentQty + qty;
      } else if (type === 'out') {
        newQty = Math.max(0, currentQty - qty);
      } else {
        newQty = qty;
      }
      previewValue.textContent = newQty;
    }

    if (qtyInput) {
      qtyInput.addEventListener('input', updatePreview);
    }
    typeRadios.forEach(r => r.addEventListener('change', updatePreview));

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const form = modalEl.querySelector('#adjust-stock-form');
        const data = getFormData(form);
        const quantity = parseNumber(data.quantity);
        const type = data.adjustmentType || 'in';
        const note = (data.note || '').trim();

        // Validation
        const { valid, errors } = validateForm(form, {
          quantity: [{ required: true, message: 'Quantity is required' }, { min: 0, message: 'Quantity must be 0 or greater' }],
        });

        if (!valid) return;

        if (type === 'out' && quantity > currentQty) {
          showError('Cannot remove more than current quantity');
          return;
        }

        // Store the movement — for "adjustment" type, the store expects quantity to be the target qty
        store.addStockMovement({
          productId: data.productId,
          type,
          quantity,
          note,
        });

        showSuccess('Stock adjusted successfully');
        modal.close();
        refreshStats();
        renderActiveTab();
      });

      // Style the submit button hover
      submitBtn.addEventListener('mouseenter', () => { submitBtn.style.background = '#2563eb'; });
      submitBtn.addEventListener('mouseleave', () => { submitBtn.style.background = 'var(--accent-blue, #3b82f6)'; });
    }
  }

  // ---- Initial render ----
  refreshStats();
  renderTabs();
  renderActiveTab();

  // ---- Subscribe to store events ----
  const unsubProducts = store.subscribe('products:changed', () => {
    refreshStats();
    renderActiveTab();
  });
  cleanupFns.push(unsubProducts);

  const unsubMovements = store.subscribe('stockmovements:changed', () => {
    refreshStats();
    renderActiveTab();
  });
  cleanupFns.push(unsubMovements);

  const unsubCategories = store.subscribe('categories:changed', () => {
    renderActiveTab();
  });
  cleanupFns.push(unsubCategories);

  // ---- Cleanup function ----
  return function cleanup() {
    cleanupFns.forEach(fn => {
      try { fn(); } catch (e) { /* noop */ }
    });
    cleanupFns.length = 0;
    if (overviewTable) { try { overviewTable.destroy(); } catch (e) { /* noop */ } }
    if (movementsTable) { try { movementsTable.destroy(); } catch (e) { /* noop */ } }
    container.innerHTML = '';
  };
}

export { render as renderStock };
