// ============================================
// js/components/CRUDManager.js — Generic CRUD Operations Manager
// Eliminates duplication across product, customer, supplier, category pages
// ============================================

import { escapeHtml, formatCurrency, formatDate } from '../utils.js';
import store from '../store.js';
import { showToast, showSuccess, showError, confirmDialog, openModal, renderDataTable, renderStatCards } from './index.js';
import { FormBuilder } from './FormBuilder.js';

/**
 * CRUDManager: Unified CRUD operations for any entity
 *
 * Eliminates ~40+ lines of duplication per entity page
 * (product.js, customer.js, supplier.js, category.js follow identical patterns)
 *
 * Usage:
 *   const manager = new CRUDManager({
 *     entityName: 'product',
 *     icon: '📦',
 *     storeMethods: {
 *       add: store.addProduct,
 *       update: store.updateProduct,
 *       delete: store.deleteProduct,
 *       getAll: store.getProducts,
 *       getById: store.getProductById,
 *     },
 *     fields: [
 *       { name: 'name', label: 'Name', type: 'text', required: true },
 *       { name: 'price', label: 'Price', type: 'number', required: true },
 *     ],
 *     columns: [
 *       { key: 'name', label: 'Name',sortable: true },
 *       { key: 'price', label: 'Price', render: (v) => formatCurrency(v) },
 *     ],
 *     stats: [
 *       { title: 'Total', compute: (all) => all.length, icon: '📦', color: 'blue' },
 *     ],
 *   });
 *
 *   const cleanup = manager.render(container);
 *   // later: cleanup();
 */
export class CRUDManager {
  constructor(options = {}) {
    this.entityName = options.entityName || 'item';
    this.entityNamePlural = options.entityNamePlural || `${this.entityName}s`;
    this.icon = options.icon || '📋';
    this.description = options.description || `Manage ${this.entityNamePlural}`;

    // Store methods for CRUD operations
    this.storeMethods = options.storeMethods || {};
    if (!this.storeMethods.add || !this.storeMethods.update || !this.storeMethods.delete || !this.storeMethods.getAll) {
      throw new Error('CRUDManager requires storeMethods: add, update, delete, getAll');
    }

    // Field definitions for forms
    this.fields = options.fields || [];

    // Column definitions for table
    this.columns = options.columns || [];

    // Stat card definitions
    this.stats = options.stats || [];

    // Validation function (optional)
    this.onValidate = options.onValidate || null;

    // Custom data transform before display
    this.transformData = options.transformData || ((data) => data);

    // Custom modal content builder (optional)
    this.buildModalContent = options.buildModalContent || null;

    // Filters (optional)
    this.filters = options.filters || [];

    // State
    this.tableApi = null;
    this.unsubscribers = [];
    this._currentFilter = {};
  }

  /**
   * Main render function (called by page module)
   */
  render(container, eventName = `${this.entityName}s:changed`) {
    container.innerHTML = '';

    // Subscribe to changes
    const unsubscriber = store.subscribe(eventName, () => {
      this._refresh(container);
    });
    this.unsubscribers.push(unsubscriber);

    this._refresh(container);

    // Return cleanup function
    return () => {
      this.unsubscribers.forEach(fn => fn());
      this.unsubscribers = [];
      if (this.tableApi) {
        this.tableApi.destroy();
        this.tableApi = null;
      }
    };
  }

  /**
   * Internal refresh
   */
  _refresh(container) {
    const allData = this.storeMethods.getAll();
    const transformedData = allData.map(item => this.transformData(item));

    container.innerHTML = '';

    // Header
    const headerEl = document.createElement('div');
    container.appendChild(headerEl);
    this._renderHeader(headerEl, allData.length);

    // Stats cards
    if (this.stats && this.stats.length > 0) {
      const statsEl = document.createElement('div');
      statsEl.id = `${this.entityName}-stats`;
      container.appendChild(statsEl);
      this._renderStats(statsEl, allData);
    }

    // Filters
    if (this.filters && this.filters.length > 0) {
      const filtersEl = document.createElement('div');
      filtersEl.id = `${this.entityName}-filters`;
      filtersEl.style.cssText = 'display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;';
      container.appendChild(filtersEl);
      this._renderFilters(filtersEl, transformedData);
    }

    // Table
    const tableContainer = document.createElement('div');
    tableContainer.id = `${this.entityName}-table-container`;
    container.appendChild(tableContainer);
    this._renderTable(tableContainer, transformedData);

    // Wire up button handlers
    this._attachHandlers(container, allData);
  }

  /**
   * Render header with title, icon, badge, add button
   */
  _renderHeader(headerEl, count) {
    const title = this.entityNamePlural.charAt(0).toUpperCase() + this.entityNamePlural.slice(1);
    const addBtnHtml = `
      <button id="${this.entityName}-add-btn" style="
        padding: 8px 18px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
        transition: background 150ms; margin-left: auto;
      ">+ Add ${this.entityName}</button>
    `;

    headerEl.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 20px; gap: 16px;">
        <div>
          <h1 style="font-size: 24px; font-weight: 700; margin: 0; color: var(--text-primary, #111); display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 28px;">${this.icon}</span>
            ${escapeHtml(title)}
            <span style="display: inline-block; background: var(--bg-hover, #f0f0f0); padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: var(--text-muted, #6b7280);">${count}</span>
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: var(--text-muted, #6b7280);">${escapeHtml(this.description)}</p>
        </div>
        ${addBtnHtml}
      </div>
    `;
  }

  /**
   * Render stat cards
   */
  _renderStats(statsEl, allData) {
    const cards = this.stats.map(stat => ({
      title: stat.title,
      value: typeof stat.compute === 'function' ? stat.compute(allData) : stat.value || '—',
      icon: stat.icon || '📊',
      color: stat.color || 'blue',
    }));

    // Use the component's renderStatCards
    renderStatCards(statsEl, cards);
  }

  /**
   * Render filters
   */
  _renderFilters(filtersEl, data) {
    this.filters.forEach(filter => {
      const filterDiv = document.createElement('div');
      filterDiv.style.cssText = 'display: flex; align-items: center; gap: 8px;';

      const label = document.createElement('label');
      label.textContent = filter.label || 'Filter:';
      label.style.cssText = 'font-size: 13px; font-weight: 600; color: var(--text-muted, #6b7280);';

      const select = document.createElement('select');
      select.id = `${this.entityName}-${filter.key}-filter`;
      select.style.cssText = `
        padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db); border-radius: 8px;
        font-size: 14px; background: var(--bg-primary, #fff); color: var(--text-primary, #111);
        outline: none; cursor: pointer; min-width: 180px;
      `;

      // Default option
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = filter.defaultLabel || 'All';
      select.appendChild(defaultOpt);

      // Filter options
      if (typeof filter.options === 'function') {
        filter.options(data).forEach(opt => {
          const option = document.createElement('option');
          option.value = typeof opt === 'string' ? opt : opt.value;
          option.textContent = typeof opt === 'string' ? opt : opt.label;
          select.appendChild(option);
        });
      }

      select.addEventListener('change', (e) => {
        this._currentFilter[filter.key] = e.target.value;
        if (this.tableApi) {
          const filtered = this._applyFilters(data);
          this.tableApi.refresh(filtered);
        }
      });

      filterDiv.appendChild(label);
      filterDiv.appendChild(select);
      filtersEl.appendChild(filterDiv);
    });
  }

  /**
   * Apply filters to data
   */
  _applyFilters(data) {
    let filtered = [...data];
    Object.keys(this._currentFilter).forEach(key => {
      const value = this._currentFilter[key];
      if (value) {
        const filter = this.filters.find(f => f.key === key);
        if (filter && filter.apply) {
          filtered = filtered.filter(item => filter.apply(item, value));
        }
      }
    });
    return filtered;
  }

  /**
   * Render table with search, pagination, etc.
   */
  _renderTable(tableContainer, data) {
    if (this.tableApi) {
      this.tableApi.destroy();
      this.tableApi = null;
    }

    // Add action column
    const columns = [
      ...this.columns,
      {
        key: '_actions',
        label: 'Actions',
        sortable: false,
        render: (val, row) => `
          <button class="${this.entityName}-edit-btn" data-id="${escapeHtml(row.id)}" style="
            padding: 4px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
            background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
            cursor: pointer; font-size: 13px; margin-right: 4px;
          ">Edit</button>
          <button class="${this.entityName}-delete-btn" data-id="${escapeHtml(row.id)}" style="
            padding: 4px 10px; border: 1px solid #fecaca; border-radius: 6px;
            background: #fff; color: #ef4444; cursor: pointer; font-size: 13px;
          ">Delete</button>
        `,
      },
    ];

    this.tableApi = renderDataTable(tableContainer, {
      columns,
      data,
      pageSize: 10,
      searchPlaceholder: `Search ${this.entityNamePlural}...`,
      emptyMessage: `No ${this.entityNamePlural} found`,
      emptyIcon: this.icon,
    });
  }

  /**
   * Attach event handlers for add/edit/delete buttons
   */
  _attachHandlers(container, allData) {
    // Add button
    const addBtn = container.querySelector(`#${this.entityName}-add-btn`);
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._openModal(null);
      });
    }

    // Edit buttons
    container.querySelectorAll(`.${this.entityName}-edit-btn`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const entity = allData.find(e => e.id === btn.dataset.id);
        if (entity) {
          this._openModal(entity);
        }
      });
    });

    // Delete buttons
    container.querySelectorAll(`.${this.entityName}-delete-btn`).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._deleteEntity(btn.dataset.id);
      });
    });
  }

  /**
   * Open add/edit modal
   */
  _openModal(entity = null) {
    const isEdit = !!entity;
    const title = isEdit ? `Edit ${this.entityName}` : `Add ${this.entityName}`;
    const saveLabel = isEdit ? `Update ${this.entityName}` : `Create ${this.entityName}`;

    let content;
    if (this.buildModalContent) {
      content = this.buildModalContent(entity);
    } else {
      content = this._defaultModalContent(entity);
    }

    const footer = `
      <button id="crud-cancel-btn" style="
        padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
        cursor: pointer; font-size: 14px; font-weight: 500;
      ">Cancel</button>
      <button id="crud-save-btn" style="
        padding: 8px 20px; border-radius: 8px; border: none;
        background: var(--accent-blue, #3b82f6); color: white;
        cursor: pointer; font-size: 14px; font-weight: 600;
      ">${escapeHtml(saveLabel)}</button>
    `;

    const modal = openModal({ title, content, footer, size: 'lg' });
    const modalEl = modal.getElement();

    // Cancel button
    const cancelBtn = modalEl.querySelector('#crud-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => modal.close());
    }

    // Save button
    const saveBtn = modalEl.querySelector('#crud-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this._handleSave(modalEl, entity, modal);
      });
    }
  }

  /**
   * Build default modal content from fields
   */
  _defaultModalContent(entity = null) {
    const builder = new FormBuilder();

    this.fields.forEach(field => {
      const value = entity ? entity[field.name] : field.value || '';
      const options = {
        value,
        required: field.required || false,
        maxLength: field.maxLength,
        pattern: field.pattern,
        placeholder: field.placeholder,
      };

      if (field.type === 'email') {
        builder.addEmail(field.name, field.label, options);
      } else if (field.type === 'number') {
        builder.addNumber(field.name, field.label, { ...options, min: field.min, max: field.max, step: field.step });
      } else if (field.type === 'select') {
        builder.addSelect(field.name, field.label, field.options || [], options);
      } else if (field.type === 'textarea') {
        builder.addTextarea(field.name, field.label, options);
      } else {
        builder.addInput(field.name, field.label, options);
      }
    });

    return `<form id="crud-form" style="display: flex; flex-direction: column; gap: 16px;">${builder.build()}</form>`;
  }

  /**
   * Handle form submission
   */
  _handleSave(modalEl, entity, modal) {
    const form = modalEl.querySelector('#crud-form');
    if (!form) return;

    const formData = {};
    form.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.name) {
        const field = this.fields.find(f => f.name === el.name);
        if (field && field.type === 'number') {
          formData[el.name] = parseFloat(el.value) || 0;
        } else {
          formData[el.name] = el.value;
        }
      }
    });

    // Validate
    if (this.onValidate) {
      const validationError = this.onValidate(formData, entity);
      if (validationError) {
        showError(validationError);
        return;
      }
    }

    // Save
    try {
      if (entity) {
        this.storeMethods.update(entity.id, formData);
        showSuccess(`${this.entityName} updated successfully`);
      } else {
        this.storeMethods.add(formData);
        showSuccess(`${this.entityName} created successfully`);
      }
      modal.close();
    } catch (error) {
      showError(`Failed to save ${this.entityName}: ${error.message}`);
    }
  }

  /**
   * Delete entity with confirmation
   */
  _deleteEntity(id) {
    const entity = this.storeMethods.getById?.(id) || this.storeMethods.getAll().find(e => e.id === id);
    const name = entity?.name || id;

    confirmDialog({
      title: `Delete ${this.entityName}?`,
      message: `Are you sure you want to delete "${escapeHtml(name)}"? This action cannot be undone.`,
      confirmText: 'Delete',
      dangerZone: true,
      onConfirm: () => {
        try {
          this.storeMethods.delete(id);
          showSuccess(`${this.entityName} deleted successfully`);
        } catch (error) {
          showError(`Failed to delete ${this.entityName}: ${error.message}`);
        }
      },
    });
  }
}
