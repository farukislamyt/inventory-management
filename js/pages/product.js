// ============================================
// js/pages/product.js — Product Page Module
// ============================================

import store from '../store.js';
import { formatCurrency, formatDate, getInitials, escapeHtml, parseNumber } from '../utils.js';
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
  validateForm,
  renderEmptyState,
} from '../components.js';

const UNITS = ['pcs', 'kg', 'g', 'box', 'pack', 'dozen', 'liter', 'ml', 'meter', 'cm', 'roll', 'set'];

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

export function renderProduct(container) {
  const unsubscribers = [];
  unsubscribers.push(store.subscribe('products:changed', () => render(container)));
  unsubscribers.push(store.subscribe('categories:changed', () => render(container)));

  let tableApi = null;

  function render(container) {
    const products = store.getProducts();
    const categories = store.getCategories();
    const settings = store.getSettings();
    const defaultThreshold = settings.lowStockThreshold || 10;

    // Compute stats
    const totalProducts = products.length;
    const inventoryValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.costPrice || 0)), 0);
    const lowStockCount = products.filter(p => {
      const threshold = p.lowStockThreshold != null ? p.lowStockThreshold : defaultThreshold;
      return p.quantity <= threshold && p.quantity > 0;
    }).length;
    const outOfStockCount = products.filter(p => p.quantity === 0).length;

    // Build page
    const headerEl = document.createElement('div');
    container.innerHTML = '';
    container.appendChild(headerEl);

    renderPageHeader(headerEl, {
      title: 'Products',
      description: 'Manage your product inventory',
      icon: '📦',
      badge: { text: `${totalProducts} items`, variant: 'info' },
      actions: `<button id="product-add-btn" style="
        padding: 8px 18px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
        transition: background 150ms;
      " onmouseenter="this.style.background='#2563eb'" onmouseleave="this.style.background='var(--accent-blue,#3b82f6)'"
      >+ Add Product</button>`,
    });

    renderBreadcrumbs(headerEl, [{ label: 'Products' }]);

    // Stat cards
    const statsEl = document.createElement('div');
    statsEl.id = 'product-stats';
    container.appendChild(statsEl);

    const { currencySymbol } = settings;
    const sym = currencySymbol || '$';

    renderStatCards(statsEl, [
      { title: 'Total Products', value: totalProducts, icon: '📦', color: 'blue' },
      { title: 'Inventory Value', value: formatCurrency(inventoryValue, sym), icon: '💰', color: 'green' },
      { title: 'Low Stock', value: lowStockCount, icon: '⚠️', color: 'amber' },
      { title: 'Out of Stock', value: outOfStockCount, icon: '🚫', color: 'red' },
    ]);

    // Filter section: Category filter dropdown
    const filterEl = document.createElement('div');
    filterEl.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;';
    filterEl.innerHTML = `
      <label style="font-size: 13px; font-weight: 600; color: var(--text-muted, #6b7280);">Filter by Category:</label>
      <select id="product-category-filter" style="
        padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db); border-radius: 8px;
        font-size: 14px; background: var(--bg-primary, #fff); color: var(--text-primary, #111);
        outline: none; cursor: pointer; min-width: 180px;
      ">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
    `;
    container.appendChild(filterEl);

    // Table container
    const tableContainer = document.createElement('div');
    tableContainer.id = 'product-table-container';
    container.appendChild(tableContainer);

    // Build table data with category name resolved
    const tableData = products.map(p => {
      const category = p.categoryId ? store.getCategoryById(p.categoryId) : null;
      const threshold = p.lowStockThreshold != null ? p.lowStockThreshold : defaultThreshold;
      let stockStatus = 'In Stock';
      let stockBadge = 'badge badge-success';
      if (p.quantity === 0) {
        stockStatus = 'Out of Stock';
        stockBadge = 'badge badge-danger';
      } else if (p.quantity <= threshold) {
        stockStatus = 'Low Stock';
        stockBadge = 'badge badge-warning';
      }
      return {
        ...p,
        _categoryName: category ? category.name : '—',
        _stockStatus: stockStatus,
        _stockBadge: stockBadge,
      };
    });

    const columns = [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'sku', label: 'SKU', sortable: true },
      { key: '_categoryName', label: 'Category', sortable: true, hidden: true },
      { key: 'costPrice', label: 'Cost Price', sortable: true, hidden: true, render: (val) => formatCurrency(val, sym) },
      { key: 'sellingPrice', label: 'Selling Price', sortable: true, render: (val) => formatCurrency(val, sym) },
      { key: 'quantity', label: 'Quantity', sortable: true },
      { key: '_stockBadge', label: 'Stock Status', sortable: false, render: (val, row) => `<span class="${val}">${escapeHtml(row._stockStatus)}</span>` },
    ];

    if (tableApi) {
      tableApi.destroy();
      tableApi = null;
    }

    tableApi = renderDataTable(tableContainer, {
      columns,
      data: tableData,
      pageSize: 10,
      searchPlaceholder: 'Search products by name, SKU...',
      emptyMessage: 'No products found',
      emptyIcon: '📦',
      actions: (row) => `
        <button class="product-edit-btn" data-id="${escapeHtml(row.id)}" style="
          padding: 4px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
          background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
          cursor: pointer; font-size: 13px; margin-right: 4px; transition: background 150ms;
        " onmouseenter="this.style.background='var(--bg-hover,#f3f4f6)'" onmouseleave="this.style.background='var(--bg-primary,#fff)'"
        >Edit</button>
        <button class="product-delete-btn" data-id="${escapeHtml(row.id)}" style="
          padding: 4px 10px; border: 1px solid #fecaca; border-radius: 6px;
          background: #fff; color: #ef4444;
          cursor: pointer; font-size: 13px; transition: background 150ms;
        " onmouseenter="this.style.background='#fef2f2'" onmouseleave="this.style.background='#fff)'"
        >Delete</button>
      `,
    });

    // Bind edit/delete buttons
    tableContainer.querySelectorAll('.product-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const product = store.getProductById(btn.dataset.id);
        if (product) openProductModal(product);
      });
    });

    tableContainer.querySelectorAll('.product-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteProduct(btn.dataset.id);
      });
    });

    // Category filter
    const filterSelect = document.getElementById('product-category-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', () => {
        const catId = filterSelect.value;
        const filtered = catId ? tableData.filter(p => p.categoryId === catId) : tableData;
        if (tableApi) tableApi.refresh(filtered);
      });
    }

    // Add product button
    const addBtn = document.getElementById('product-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openProductModal(null));
    }
  }

  // ===== Add / Edit Modal =====

  function openProductModal(product = null) {
    const isEdit = !!product;
    const categories = store.getCategories();
    const settings = store.getSettings();
    const defaultThreshold = settings.lowStockThreshold || 10;

    const title = isEdit ? 'Edit Product' : 'Add Product';
    const saveLabel = isEdit ? 'Update Product' : 'Create Product';

    const categoryOptions = categories.map(c =>
      `<option value="${escapeHtml(c.id)}" ${product && product.categoryId === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');

    const unitOptions = UNITS.map(u =>
      `<option value="${escapeHtml(u)}" ${product && product.unit === u ? 'selected' : ''}>${escapeHtml(u)}</option>`
    ).join('');

    const thresholdVal = product && product.lowStockThreshold != null ? product.lowStockThreshold : defaultThreshold;

    const content = `
      <form id="product-form" style="display: flex; flex-direction: column; gap: 16px;">
        ${createFormGroup('Product Name *', `<input type="text" name="name" value="${escapeHtml(product ? product.name : '')}" required placeholder="e.g. Wireless Mouse" style="${inputStyle}" ${inputFocusStyle} />`, 'product-name')}
        ${createFormGroup('SKU', `<input type="text" name="sku" value="${escapeHtml(product ? product.sku || '' : '')}" placeholder="e.g. WM-001" style="${inputStyle}" ${inputFocusStyle} />`, 'product-sku')}
        ${createFormGroup('Category', `<select name="categoryId" style="${inputStyle}"><option value="">— None —</option>${categoryOptions}</select>`, 'product-category')}
        <div style="${formRowStyle}">
          ${createFormGroup('Cost Price', `<input type="number" name="costPrice" value="${product ? product.costPrice : 0}" min="0" step="0.01" data-type="number" style="${inputStyle}" ${inputFocusStyle} />`, 'product-cost')}
          ${createFormGroup('Selling Price', `<input type="number" name="sellingPrice" value="${product ? product.sellingPrice : 0}" min="0" step="0.01" data-type="number" style="${inputStyle}" ${inputFocusStyle} />`, 'product-selling')}
        </div>
        <div style="${formRowStyle}">
          ${createFormGroup('Quantity', `<input type="number" name="quantity" value="${product ? product.quantity : 0}" min="0" step="1" data-type="number" style="${inputStyle}" ${inputFocusStyle} />`, 'product-qty')}
          ${createFormGroup('Unit', `<select name="unit" style="${inputStyle}"><option value="">Select unit</option>${unitOptions}</select>`, 'product-unit')}
        </div>
        ${createFormGroup('Low Stock Threshold', `<input type="number" name="lowStockThreshold" value="${thresholdVal}" min="0" step="1" data-type="number" placeholder="Default: ${defaultThreshold}" style="${inputStyle}" ${inputFocusStyle} />`, 'product-threshold')}
        ${createFormGroup('Description', `<textarea name="description" rows="3" placeholder="Optional product description..." style="${inputStyle} resize: vertical;">${escapeHtml(product ? product.description || '' : '')}</textarea>`, 'product-desc')}
      </form>
    `;

    const footer = `
      <button id="product-cancel-btn" style="
        padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
        cursor: pointer; font-size: 14px; font-weight: 500;
      ">Cancel</button>
      <button id="product-save-btn" style="
        padding: 8px 20px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
      ">${escapeHtml(saveLabel)}</button>
    `;

    const modal = openModal({ title, content, footer, size: 'lg' });
    const modalEl = modal.getElement();

    // Wire save button
    const saveBtn = modalEl.querySelector('#product-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const form = modalEl.querySelector('#product-form');
        if (!form) return;

        const formData = getFormData(form);
        const name = (formData.name || '').trim();

        // Validation
        if (!name) {
          showError('Product name is required');
          return;
        }
        if (Number(formData.costPrice) < 0) {
          showError('Cost price must be 0 or greater');
          return;
        }
        if (Number(formData.sellingPrice) < 0) {
          showError('Selling price must be 0 or greater');
          return;
        }
        if (Number(formData.quantity) < 0) {
          showError('Quantity must be 0 or greater');
          return;
        }

        const productData = {
          name,
          sku: (formData.sku || '').trim(),
          categoryId: formData.categoryId || null,
          costPrice: Number(formData.costPrice) || 0,
          sellingPrice: Number(formData.sellingPrice) || 0,
          quantity: Number(formData.quantity) || 0,
          unit: formData.unit || '',
          lowStockThreshold: formData.lowStockThreshold != null ? Number(formData.lowStockThreshold) : null,
          description: (formData.description || '').trim(),
        };

        try {
          if (isEdit) {
            store.updateProduct(product.id, productData);
            showSuccess('Product updated successfully');
          } else {
            store.addProduct(productData);
            showSuccess('Product created successfully');
          }
          modal.close();
        } catch (err) {
          showError(err.message || 'Failed to save product');
        }
      });
    }

    // Wire cancel button
    const cancelBtn = modalEl.querySelector('#product-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }
  }

  // ===== Delete =====

  function deleteProduct(id) {
    const product = store.getProductById(id);
    if (!product) return;

    confirmDialog({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${escapeHtml(product.name)}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        store.deleteProduct(id);
        showSuccess('Product deleted successfully');
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
