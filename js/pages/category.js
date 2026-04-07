// ============================================
// js/pages/category.js — Category Page Module
// ============================================

import store from '../store.js';
import { formatDate, escapeHtml } from '../utils.js';
import {
  renderPageHeader,
  renderBreadcrumbs,
  renderStatCards,
  showToast,
  showSuccess,
  showError,
  confirmDialog,
  openModal,
  createFormGroup,
  getFormData,
  renderEmptyState,
} from '../components.js';

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

const CATEGORY_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#ccfbf1', text: '#115e59' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#ffe4e6', text: '#9f1239' },
];

// ===== Main Render =====

export function renderCategory(container) {
  const unsubscribers = [];
  unsubscribers.push(store.subscribe('categories:changed', () => render(container)));
  unsubscribers.push(store.subscribe('products:changed', () => render(container)));

  function render(container) {
    const categories = store.getCategories();
    const products = store.getProducts();

    // Count products per category
    const productCounts = {};
    products.forEach(p => {
      if (p.categoryId) {
        productCounts[p.categoryId] = (productCounts[p.categoryId] || 0) + 1;
      }
    });

    // Stats
    const totalCategories = categories.length;
    const totalProducts = products.length;

    // Build page
    container.innerHTML = '';

    const headerEl = document.createElement('div');
    container.appendChild(headerEl);

    renderPageHeader(headerEl, {
      title: 'Categories',
      description: 'Organize your products into categories',
      icon: '📁',
      badge: { text: `${totalCategories} categories`, variant: 'info' },
      actions: `<button id="category-add-btn" style="
        padding: 8px 18px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
        transition: background 150ms;
      " onmouseenter="this.style.background='#2563eb'" onmouseleave="this.style.background='var(--accent-blue,#3b82f6)'"
      >+ Add Category</button>`,
    });

    renderBreadcrumbs(headerEl, [{ label: 'Categories' }]);

    // Stat cards
    const statsEl = document.createElement('div');
    statsEl.id = 'category-stats';
    container.appendChild(statsEl);

    renderStatCards(statsEl, [
      { title: 'Total Categories', value: totalCategories, icon: '📁', color: 'blue' },
      { title: 'Total Products', value: totalProducts, icon: '📦', color: 'green' },
    ]);

    // Category cards grid
    const gridEl = document.createElement('div');
    gridEl.id = 'category-grid';
    container.appendChild(gridEl);

    if (categories.length === 0) {
      renderEmptyState(gridEl, {
        icon: '📁',
        title: 'No categories yet',
        description: 'Create your first category to organize products',
        action: '<button id="category-empty-add-btn" style="padding: 8px 18px; border-radius: 8px; border: none; background: var(--accent-blue, #3b82f6); color: white; cursor: pointer; font-size: 14px; font-weight: 600;">+ Add Category</button>',
      });
      const emptyBtn = gridEl.querySelector('#category-empty-add-btn');
      if (emptyBtn) {
        emptyBtn.addEventListener('click', () => openCategoryModal(null));
      }
      bindAddBtn(container);
      return;
    }

    let cardsHtml = '<div class="grid-auto" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">';

    categories.forEach((category, idx) => {
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      const count = productCounts[category.id] || 0;
      const desc = category.description || '';
      const truncatedDesc = desc.length > 80 ? desc.slice(0, 80) + '...' : desc;

      cardsHtml += `
        <div class="category-card" data-id="${escapeHtml(category.id)}" style="
          background: var(--bg-primary, #fff);
          border: 1px solid var(--border-color, #e5e7eb);
          border-radius: 12px;
          padding: 20px;
          position: relative;
          overflow: hidden;
          transition: transform 150ms, box-shadow 150ms;
          cursor: default;
        " onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
           onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <!-- Top row: icon + name -->
          <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 12px;">
            <div style="
              width: 48px; height: 48px; border-radius: 10px;
              background: ${color.bg};
              display: flex; align-items: center; justify-content: center;
              font-size: 22px; flex-shrink: 0;
            ">📁</div>
            <div style="flex: 1; min-width: 0;">
              <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary, #111);
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(category.name)}</h3>
              <span style="
                display: inline-block; margin-top: 4px;
                padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;
                background: ${color.bg}; color: ${color.text};
              ">${count} product${count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <!-- Description -->
          ${truncatedDesc ? `<p style="margin: 0 0 12px; font-size: 13px; color: var(--text-muted, #6b7280); line-height: 1.5;">${escapeHtml(truncatedDesc)}</p>` : ''}
          <!-- Footer -->
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted, #9ca3af);">
            <span>Created ${formatDate(category.createdAt)}</span>
          </div>
          <!-- Hover overlay actions -->
          <div class="category-card-actions" style="
            position: absolute; inset: 0;
            background: rgba(255,255,255,0.92);
            display: flex; align-items: center; justify-content: center; gap: 10px;
            opacity: 0; transition: opacity 200ms;
            backdrop-filter: blur(2px);
          ">
            <button class="category-edit-btn" data-id="${escapeHtml(category.id)}" style="
              padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
              background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
              cursor: pointer; font-size: 13px; font-weight: 600;
            ">✏️ Edit</button>
            <button class="category-delete-btn" data-id="${escapeHtml(category.id)}" style="
              padding: 8px 18px; border-radius: 8px; border: 1px solid #fecaca;
              background: #fff; color: #ef4444;
              cursor: pointer; font-size: 13px; font-weight: 600;
            ">🗑️ Delete</button>
          </div>
        </div>
      `;
    });

    cardsHtml += '</div>';
    gridEl.innerHTML = cardsHtml;

    // Bind hover overlay
    gridEl.querySelectorAll('.category-card').forEach(card => {
      const actions = card.querySelector('.category-card-actions');
      if (!actions) return;
      card.addEventListener('mouseenter', () => { actions.style.opacity = '1'; });
      card.addEventListener('mouseleave', () => { actions.style.opacity = '0'; });
    });

    // Bind edit buttons
    gridEl.querySelectorAll('.category-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const category = store.getCategoryById(btn.dataset.id);
        if (category) openCategoryModal(category);
      });
    });

    // Bind delete buttons
    gridEl.querySelectorAll('.category-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteCategory(btn.dataset.id);
      });
    });

    bindAddBtn(container);
  }

  function bindAddBtn(root) {
    const addBtn = root.querySelector('#category-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openCategoryModal(null));
    }
  }

  // ===== Add / Edit Modal =====

  function openCategoryModal(category = null) {
    const isEdit = !!category;
    const title = isEdit ? 'Edit Category' : 'Add Category';
    const saveLabel = isEdit ? 'Update Category' : 'Create Category';

    const content = `
      <form id="category-form" style="display: flex; flex-direction: column; gap: 16px;">
        ${createFormGroup('Category Name *', `<input type="text" name="name" value="${escapeHtml(category ? category.name : '')}" required placeholder="e.g. Electronics" style="${inputStyle}" ${inputFocusStyle} />`, 'category-name')}
        ${createFormGroup('Description', `<textarea name="description" rows="3" placeholder="Optional category description..." style="${inputStyle} resize: vertical;">${escapeHtml(category ? category.description || '' : '')}</textarea>`, 'category-desc')}
      </form>
    `;

    const footer = `
      <button id="category-cancel-btn" style="
        padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
        cursor: pointer; font-size: 14px; font-weight: 500;
      ">Cancel</button>
      <button id="category-save-btn" style="
        padding: 8px 20px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
      ">${escapeHtml(saveLabel)}</button>
    `;

    const modal = openModal({ title, content, footer, size: 'md' });
    const modalEl = modal.getElement();

    const saveBtn = modalEl.querySelector('#category-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const form = modalEl.querySelector('#category-form');
        if (!form) return;

        const formData = getFormData(form);
        const name = (formData.name || '').trim();

        if (!name) {
          showError('Category name is required');
          return;
        }

        const categoryData = {
          name,
          description: (formData.description || '').trim(),
        };

        try {
          if (isEdit) {
            store.updateCategory(category.id, categoryData);
            showSuccess('Category updated successfully');
          } else {
            store.addCategory(categoryData);
            showSuccess('Category created successfully');
          }
          modal.close();
        } catch (err) {
          showError(err.message || 'Failed to save category');
        }
      });
    }

    const cancelBtn = modalEl.querySelector('#category-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }
  }

  // ===== Delete =====

  function deleteCategory(id) {
    const category = store.getCategoryById(id);
    if (!category) return;

    // Count products in this category
    const products = store.getProducts();
    const affectedCount = products.filter(p => p.categoryId === id).length;

    let message = `Are you sure you want to delete "${escapeHtml(category.name)}"?`;
    if (affectedCount > 0) {
      message += ` This will make ${affectedCount} product${affectedCount !== 1 ? 's' : ''} uncategorized.`;
    }

    confirmDialog({
      title: 'Delete Category',
      message,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
      onConfirm: () => {
        store.deleteCategory(id);
        showSuccess('Category deleted successfully');
      },
    });
  }

  // Initial render
  render(container);

  // Return cleanup
  return () => {
    unsubscribers.forEach(fn => fn());
  };
}
