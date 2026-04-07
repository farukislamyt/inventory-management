// ============================================
// js/components.js — Reusable UI Components
// ============================================

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  getStatusLabel,
  getInitials,
  escapeHtml,
  debounce,
  truncate,
} from './utils.js';
import { Store as store } from './store.js';

// ===== Toast Notification System =====

let _toastContainer = null;

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'component-toast-container';
  container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:400px;width:100%;';
  document.body.appendChild(container);
  return container;
}

/**
 * Show a toast notification with icon, progress bar, and auto-dismiss.
 * @param {string} message
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {number} duration - Duration in ms (default 4000)
 * @returns {HTMLElement} The toast element
 */
export function showToast(message, type = 'info', duration = 4000) {
  if (!_toastContainer) _toastContainer = createToastContainer();

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const borderColors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
  };

  const bgColors = {
    success: '#f0fdf4',
    error: '#fef2f2',
    warning: '#fffbeb',
    info: '#eff6ff',
  };

  const textColors = {
    success: '#065f46',
    error: '#991b1b',
    warning: '#92400e',
    info: '#1e40af',
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    pointer-events: auto;
    background: ${bgColors[type] || bgColors.info};
    border: 1px solid ${borderColors[type] || borderColors.info};
    border-left: 4px solid ${borderColors[type] || borderColors.info};
    color: ${textColors[type] || textColors.info};
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    font-family: inherit;
    transform: translateX(120%);
    transition: transform 300ms ease, opacity 300ms ease;
    position: relative;
    overflow: hidden;
  `;

  const iconSpan = document.createElement('span');
  iconSpan.textContent = icons[type] || icons.info;
  iconSpan.style.cssText = `
    font-size: 18px;
    font-weight: bold;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: ${borderColors[type] || borderColors.info};
    color: white;
  `;

  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  msgSpan.style.cssText = 'flex: 1; line-height: 1.4;';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    background: none; border: none; cursor: pointer;
    font-size: 18px; color: inherit; opacity: 0.6;
    padding: 0 0 0 8px; flex-shrink: 0; line-height: 1;
  `;
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '1'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '0.6'; });

  // Progress bar
  const progressBar = document.createElement('div');
  progressBar.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    background: ${borderColors[type] || borderColors.info};
    border-radius: 0 0 0 8px;
    transition: width linear;
    width: 100%;
  `;

  toast.appendChild(iconSpan);
  toast.appendChild(msgSpan);
  toast.appendChild(closeBtn);
  toast.appendChild(progressBar);

  _toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
  });

  // Start progress bar animation
  progressBar.style.transitionDuration = duration + 'ms';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressBar.style.width = '0%';
    });
  });

  // Dismiss function
  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    toast.style.transform = 'translateX(120%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }

  closeBtn.addEventListener('click', dismiss);

  const timer = setTimeout(dismiss, duration);
  toast._dismissTimer = timer;

  // Pause on hover
  toast.addEventListener('mouseenter', () => {
    clearTimeout(toast._dismissTimer);
    progressBar.style.transitionDuration = '0ms';
    const currentWidth = progressBar.getBoundingClientRect().width;
    progressBar.style.width = currentWidth + 'px';
  });

  toast.addEventListener('mouseleave', () => {
    const currentWidth = progressBar.getBoundingClientRect().width;
    const parentWidth = toast.getBoundingClientRect().width;
    const remainingRatio = currentWidth / parentWidth;
    const remainingTime = duration * remainingRatio;

    progressBar.style.transitionDuration = remainingTime + 'ms';
    requestAnimationFrame(() => {
      progressBar.style.width = '0%';
    });

    toast._dismissTimer = setTimeout(dismiss, remainingTime);
  });

  return toast;
}

/** Show a success toast. */
export function showSuccess(message) { return showToast(message, 'success'); }

/** Show an error toast. */
export function showError(message) { return showToast(message, 'error'); }

/** Show a warning toast. */
export function showWarning(message) { return showToast(message, 'warning'); }

// ===== Modal/Dialog System =====

let currentModal = null;

/**
 * Open a modal dialog.
 * @param {Object} options
 * @param {string} options.title - Modal title
 * @param {'sm'|'md'|'lg'|'xl'} options.size - Modal width size
 * @param {string} options.content - HTML string for modal body
 * @param {string} [options.footer] - HTML string for modal footer
 * @param {Function} [options.onClose] - Called when modal closes
 * @param {boolean} [options.closeOnOverlay=true] - Close when clicking overlay
 * @returns {{ close: Function, getElement: Function }}
 */
export function openModal(options = {}) {
  // Close any existing modal
  if (currentModal) {
    closeCurrentModal();
  }

  const {
    title = '',
    size = 'md',
    content = '',
    footer = '',
    onClose = null,
    closeOnOverlay = true,
  } = options;

  const sizeMap = {
    sm: '400px',
    md: '560px',
    lg: '720px',
    xl: '960px',
  };

  const modalWidth = sizeMap[size] || sizeMap.md;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay-component';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    opacity: 0; transition: opacity 200ms ease;
  `;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal-component';
  modal.style.cssText = `
    background: var(--bg-primary, #fff);
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    width: ${modalWidth};
    max-width: 95vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    transform: scale(0.95) translateY(10px);
    transition: transform 200ms ease;
    overflow: hidden;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e5e7eb);
  `;

  const titleEl = document.createElement('h3');
  titleEl.textContent = title;
  titleEl.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    background: none; border: none; cursor: pointer;
    font-size: 22px; color: var(--text-muted, #888);
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 6px; transition: background 150ms;
  `;
  closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'var(--bg-hover, #f3f4f6)'; });
  closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'none'; });

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body-component';
  body.style.cssText = 'padding: 20px; overflow-y: auto; flex: 1;';
  if (content) body.innerHTML = content;

  // Footer
  const footerEl = document.createElement('div');
  if (footer) {
    footerEl.style.cssText = `
      display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: 16px 20px; border-top: 1px solid var(--border-color, #e5e7eb);
    `;
    footerEl.innerHTML = footer;
  }

  modal.appendChild(header);
  modal.appendChild(body);
  if (footer) modal.appendChild(footerEl);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1) translateY(0)';
  });

  // Save previously focused element for focus trap
  const previousFocus = document.activeElement;
  closeBtn.focus();

  // Focus trap
  function trapFocus(e) {
    if (e.key === 'Tab') {
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  }

  // ESC to close
  function handleEsc(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (!overlay.parentNode) return;
    modal.style.transform = 'scale(0.95) translateY(10px)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('keydown', trapFocus);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      if (onClose) onClose();
      if (currentModal === modalApi) currentModal = null;
    }, 200);
  }

  overlay.addEventListener('click', (e) => {
    if (closeOnOverlay && e.target === overlay) close();
  });

  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', handleEsc);
  document.addEventListener('keydown', trapFocus);

  const modalApi = {
    close,
    getElement: () => modal,
    getBody: () => body,
    setFooter: (html) => {
      footerEl.innerHTML = html;
      if (html && !footerEl.parentNode) modal.appendChild(footerEl);
    },
  };

  currentModal = modalApi;
  return modalApi;
}

/**
 * Close the currently open modal.
 */
export function closeCurrentModal() {
  if (currentModal) currentModal.close();
}

/**
 * Show a confirmation dialog that returns a Promise.
 * @param {Object} options
 * @param {string} [options.title='Confirm'] - Dialog title
 * @param {string} options.message - Dialog message
 * @param {string} [options.confirmText='Confirm'] - Confirm button text
 * @param {string} [options.cancelText='Cancel'] - Cancel button text
 * @param {'danger'|'primary'} [options.variant='primary'] - Style variant
 * @param {Function} [options.onConfirm] - Called on confirm
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
export function confirmDialog(options = {}) {
  const {
    title = 'Confirm',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    onConfirm = null,
  } = options;

  return new Promise((resolve) => {
    const isDanger = variant === 'danger';

    const iconColor = isDanger ? '#ef4444' : '#3b82f6';
    const btnBg = isDanger ? '#ef4444' : '#3b82f6';
    const btnHover = isDanger ? '#dc2626' : '#2563eb';

    const footer = `
      <button class="confirm-cancel-btn" style="
        padding: 8px 20px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
        cursor: pointer; font-size: 14px; font-weight: 500; transition: background 150ms;
      ">${escapeHtml(cancelText)}</button>
      <button class="confirm-ok-btn" style="
        padding: 8px 20px; border-radius: 8px; border: none;
        background: ${btnBg}; color: white;
        cursor: pointer; font-size: 14px; font-weight: 500; transition: background 150ms;
      ">${escapeHtml(confirmText)}</button>
    `;

    const content = `
      <div style="text-align: center; padding: 8px 0;">
        <div style="
          width: 56px; height: 56px; border-radius: 50%;
          background: ${isDanger ? '#fef2f2' : '#eff6ff'};
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          font-size: 28px;
        ">${isDanger ? '🗑️' : '❓'}</div>
        <p style="margin: 0; color: var(--text-primary, #374151); font-size: 15px; line-height: 1.5;">
          ${escapeHtml(message)}
        </p>
      </div>
    `;

    const modal = openModal({
      title,
      content,
      footer,
      size: 'sm',
      closeOnOverlay: true,
      onClose: () => resolve(false),
    });

    // Wire up buttons after DOM is ready
    const modalEl = modal.getElement();
    const cancelBtn = modalEl.querySelector('.confirm-cancel-btn');
    const okBtn = modalEl.querySelector('.confirm-ok-btn');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.close();
        resolve(false);
      });
    }

    if (okBtn) {
      okBtn.addEventListener('mouseenter', () => { okBtn.style.background = btnHover; });
      okBtn.addEventListener('mouseleave', () => { okBtn.style.background = btnBg; });
      okBtn.addEventListener('click', () => {
        modal.close();
        if (onConfirm) onConfirm();
        resolve(true);
      });
    }
  });
}

// ===== Data Table Component =====

/**
 * Render a full-featured data table with search, sort, and pagination.
 * @param {HTMLElement|string} container - Element or element ID
 * @param {Object} options
 * @returns {{ refresh: Function, getFilteredData: Function, destroy: Function }}
 */
export function renderDataTable(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) {
    console.error('renderDataTable: container not found');
    return { refresh() {}, getFilteredData() { return []; }, destroy() {} };
  }

  const {
    columns = [],
    data = [],
    actions = null,
    searchable = true,
    searchPlaceholder = 'Search...',
    pageSize = 10,
    emptyMessage = 'No data found',
    emptyIcon = '📭',
    onRowClick = null,
    stripe = true,
    id = 'dt-' + Date.now(),
  } = options;

  // Internal state
  let _data = [...data];
  let _filteredData = [..._data];
  let _sortKey = null;
  let _sortDir = 'asc';
  let _currentPage = 1;
  let _searchTerm = '';
  let _destroyed = false;

  // Build the table UI
  function build() {
    el.innerHTML = '';
    el.dataset.tableId = id;

    const wrapper = document.createElement('div');
    wrapper.className = 'data-table-component';

    // Search bar
    if (searchable) {
      const searchWrap = document.createElement('div');
      searchWrap.style.cssText = 'margin-bottom: 16px;';
      searchWrap.innerHTML = `
        <div style="position: relative;">
          <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted,#9ca3af);font-size:14px;">🔍</span>
          <input type="text" class="table-search-input" placeholder="${escapeHtml(searchPlaceholder)}" style="
            width: 100%; max-width: 360px;
            padding: 9px 12px 9px 36px;
            border: 1px solid var(--border-color, #d1d5db);
            border-radius: 8px;
            font-size: 14px;
            background: var(--bg-primary, #fff);
            color: var(--text-primary, #111);
            outline: none;
            transition: border-color 150ms, box-shadow 150ms;
          " />
        </div>
      `;
      wrapper.appendChild(searchWrap);

      const searchInput = searchWrap.querySelector('.table-search-input');
      const debouncedSearch = debounce((term) => {
        _searchTerm = term;
        _currentPage = 1;
        applyFilterAndSort();
        renderBody();
      }, 250);

      searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });

      searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = 'var(--accent-blue, #3b82f6)';
        searchInput.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)';
      });
      searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = 'var(--border-color, #d1d5db)';
        searchInput.style.boxShadow = 'none';
      });
    }

    // Table wrapper
    const tableWrap = document.createElement('div');
    tableWrap.className = 'data-table-wrapper';
    tableWrap.style.cssText = 'overflow-x: auto; border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px;';

    const table = document.createElement('table');
    table.className = 'data-table';
    table.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 14px;';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'background: var(--bg-secondary, #f9fafb);';

    columns.forEach((col) => {
      if (col.hidden) return;
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 12px 16px; text-align: left; font-weight: 600;
        font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        color: var(--text-muted, #6b7280); border-bottom: 2px solid var(--border-color, #e5e7eb);
        white-space: nowrap;
      `;
      if (col.className) th.className = col.className;

      const isSortable = col.sortable !== false;

      if (isSortable) {
        const sortLabel = document.createElement('span');
        sortLabel.textContent = col.label || col.key;
        sortLabel.style.cursor = 'pointer';
        sortLabel.style.userSelect = 'none';
        sortLabel.style.display = 'inline-flex';
        sortLabel.style.alignItems = 'center';
        sortLabel.style.gap = '4px';

        const arrow = document.createElement('span');
        arrow.className = 'sort-arrow';
        arrow.style.cssText = 'font-size: 10px; opacity: 0.4; transition: opacity 150ms;';

        sortLabel.appendChild(arrow);

        sortLabel.addEventListener('click', () => {
          if (_sortKey === col.key) {
            _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            _sortKey = col.key;
            _sortDir = 'asc';
          }
          updateSortArrows();
          applyFilterAndSort();
          renderBody();
        });

        th.appendChild(sortLabel);
      } else {
        th.textContent = col.label || col.key;
      }

      if (col.hidden) th.classList.add('hide-mobile');
      headerRow.appendChild(th);
    });

    // Actions column
    if (actions) {
      const th = document.createElement('th');
      th.style.cssText = `
        padding: 12px 16px; text-align: right; font-weight: 600;
        font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        color: var(--text-muted, #6b7280); border-bottom: 2px solid var(--border-color, #e5e7eb);
      `;
      th.textContent = 'Actions';
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    tbody.className = 'table-body';
    table.appendChild(tbody);

    tableWrap.appendChild(table);
    wrapper.appendChild(tableWrap);

    // Pagination
    const paginationWrap = document.createElement('div');
    paginationWrap.className = 'table-pagination';
    paginationWrap.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 0; font-size: 13px; color: var(--text-muted, #6b7280);';
    wrapper.appendChild(paginationWrap);

    el.appendChild(wrapper);

    // Initial render
    applyFilterAndSort();
    renderBody();
    updateSortArrows();
  }

  function applyFilterAndSort() {
    // Filter
    if (_searchTerm) {
      const term = _searchTerm.toLowerCase();
      _filteredData = _data.filter((row) => {
        return columns.some((col) => {
          const val = row[col.key];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(term);
        });
      });
    } else {
      _filteredData = [..._data];
    }

    // Sort
    if (_sortKey) {
      _filteredData.sort((a, b) => {
        let aVal = a[_sortKey];
        let bVal = b[_sortKey];

        // Handle null/undefined
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        // Try numeric comparison
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        if (!isNaN(aNum) && !isNaN(bNum) && String(aVal).trim() !== '') {
          return _sortDir === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (aStr < bStr) return _sortDir === 'asc' ? -1 : 1;
        if (aStr > bStr) return _sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
  }

  function renderBody() {
    if (_destroyed) return;

    const tbody = el.querySelector('.table-body');
    const paginationWrap = el.querySelector('.table-pagination');
    if (!tbody) return;

    tbody.innerHTML = '';

    const totalPages = Math.ceil(_filteredData.length / pageSize) || 1;
    if (_currentPage > totalPages) _currentPage = totalPages;

    const startIdx = (_currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const pageData = _filteredData.slice(startIdx, endIdx);

    if (_filteredData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.filter((c) => !c.hidden).length + (actions ? 1 : 0)}" style="
            text-align: center; padding: 40px 20px;
            color: var(--text-muted, #9ca3af);
          ">
            <div style="font-size: 36px; margin-bottom: 8px;">${emptyIcon}</div>
            <div style="font-size: 14px;">${escapeHtml(_searchTerm ? 'No results found for "' + _searchTerm + '"' : emptyMessage)}</div>
          </td>
        </tr>
      `;
    } else {
      pageData.forEach((row, idx) => {
        const tr = document.createElement('tr');
        tr.style.cssText = `
          transition: background 150ms;
          ${stripe && idx % 2 === 1 ? 'background: var(--bg-secondary, rgba(0,0,0,0.02));' : ''}
          ${onRowClick ? 'cursor: pointer;' : ''}
        `;

        tr.addEventListener('mouseenter', () => { tr.style.background = 'var(--bg-hover, rgba(0,0,0,0.04))'; });
        tr.addEventListener('mouseleave', () => {
          tr.style.background = stripe && idx % 2 === 1 ? 'var(--bg-secondary, rgba(0,0,0,0.02))' : '';
        });

        if (onRowClick) {
          tr.addEventListener('click', (e) => {
            if (e.target.closest('button, a, input, select')) return;
            onRowClick(row);
          });
        }

        columns.forEach((col) => {
          if (col.hidden) return;
          const td = document.createElement('td');
          td.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid var(--border-color, #f3f4f6);';
          if (col.className) td.className = col.className;
          if (col.hidden) td.classList.add('hide-mobile');

          if (col.render) {
            td.innerHTML = col.render(row[col.key], row);
          } else {
            td.textContent = row[col.key] != null ? row[col.key] : '';
          }

          tr.appendChild(td);
        });

        // Actions cell
        if (actions) {
          const td = document.createElement('td');
          td.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid var(--border-color, #f3f4f6); text-align: right; white-space: nowrap;';
          td.innerHTML = actions(row);
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    }

    // Pagination controls
    if (paginationWrap) {
      const totalItems = _filteredData.length;
      const showingStart = totalItems > 0 ? startIdx + 1 : 0;
      const showingEnd = Math.min(endIdx, totalItems);

      let paginationHtml = '';

      // Info text
      paginationHtml += `<span>Showing ${showingStart}–${showingEnd} of ${totalItems}</span>`;

      // Page buttons
      if (totalPages > 1) {
        paginationHtml += '<div style="display:flex;align-items:center;gap:4px;">';

        // Prev button
        paginationHtml += `<button class="page-btn" data-page="${_currentPage - 1}" ${_currentPage <= 1 ? 'disabled' : ''} style="
          padding: 6px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
          background: var(--bg-primary, #fff); cursor: pointer; font-size: 13px;
          ${_currentPage <= 1 ? 'opacity:0.4;cursor:default;' : ''}
        ">&laquo;</button>`;

        // Page numbers
        const maxVisible = 5;
        let startPage = Math.max(1, _currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
          startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
          paginationHtml += `<button class="page-btn" data-page="1" style="
            padding: 6px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
            background: var(--bg-primary, #fff); cursor: pointer; font-size: 13px;
          ">1</button>`;
          if (startPage > 2) paginationHtml += '<span style="padding:0 4px;">...</span>';
        }

        for (let p = startPage; p <= endPage; p++) {
          const isActive = p === _currentPage;
          paginationHtml += `<button class="page-btn" data-page="${p}" style="
            padding: 6px 10px; border: 1px solid ${isActive ? 'var(--accent-blue, #3b82f6)' : 'var(--border-color, #d1d5db)'};
            border-radius: 6px;
            background: ${isActive ? 'var(--accent-blue, #3b82f6)' : 'var(--bg-primary, #fff)'};
            color: ${isActive ? 'white' : 'var(--text-primary, #374151)'};
            cursor: pointer; font-size: 13px; font-weight: ${isActive ? '600' : '400'};
          ">${p}</button>`;
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) paginationHtml += '<span style="padding:0 4px;">...</span>';
          paginationHtml += `<button class="page-btn" data-page="${totalPages}" style="
            padding: 6px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
            background: var(--bg-primary, #fff); cursor: pointer; font-size: 13px;
          ">${totalPages}</button>`;
        }

        // Next button
        paginationHtml += `<button class="page-btn" data-page="${_currentPage + 1}" ${_currentPage >= totalPages ? 'disabled' : ''} style="
          padding: 6px 10px; border: 1px solid var(--border-color, #d1d5db); border-radius: 6px;
          background: var(--bg-primary, #fff); cursor: pointer; font-size: 13px;
          ${_currentPage >= totalPages ? 'opacity:0.4;cursor:default;' : ''}
        ">&raquo;</button>`;

        paginationHtml += '</div>';
      }

      paginationWrap.innerHTML = paginationHtml;

      // Wire up pagination buttons
      paginationWrap.querySelectorAll('.page-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          const page = parseInt(btn.dataset.page, 10);
          if (!isNaN(page) && page >= 1 && page <= totalPages) {
            _currentPage = page;
            renderBody();
            updateSortArrows();
            // Scroll table into view
            const tableWrapper = el.querySelector('.data-table-wrapper');
            if (tableWrapper) tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        });
      });
    }
  }

  function updateSortArrows() {
    const arrows = el.querySelectorAll('.sort-arrow');
    const colKeys = columns.filter((c) => c.hidden).length === 0
      ? columns.map((c) => c.key)
      : columns.map((c) => c.key);

    arrows.forEach((arrow, idx) => {
      const colKey = columns[idx]?.key;
      if (colKey === _sortKey) {
        arrow.textContent = _sortDir === 'asc' ? '▲' : '▼';
        arrow.style.opacity = '1';
      } else {
        arrow.textContent = '▲';
        arrow.style.opacity = '0.3';
      }
    });
  }

  // Build the table
  build();

  // Return API
  return {
    /**
     * Refresh with new data.
     * @param {Array} newData
     */
    refresh(newData) {
      if (_destroyed) return;
      _data = Array.isArray(newData) ? [...newData] : [];
      _currentPage = 1;
      applyFilterAndSort();
      renderBody();
      updateSortArrows();

      // Reset search input
      const searchInput = el.querySelector('.table-search-input');
      if (searchInput) searchInput.value = '';
      _searchTerm = '';
    },

    /**
     * Get the currently filtered data array.
     * @returns {Array}
     */
    getFilteredData() {
      return [..._filteredData];
    },

    /**
     * Destroy the table and clean up.
     */
    destroy() {
      _destroyed = true;
      el.innerHTML = '';
    },
  };
}

// ===== Page Header Component =====

/**
 * Render a page header with title, description, icon, badge, and actions.
 * @param {HTMLElement|string} container
 * @param {Object} options
 */
export function renderPageHeader(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;

  const {
    title = '',
    description = '',
    icon = '',
    badge = null,
    actions = '',
  } = options;

  let badgeHtml = '';
  if (badge) {
    const variantColors = {
      success: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
      warning: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
      danger: { bg: '#fecaca', text: '#991b1b', border: '#fca5a5' },
      info: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
      neutral: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
    };
    const c = variantColors[badge.variant] || variantColors.neutral;
    badgeHtml = `<span style="
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600;
      background: ${c.bg}; color: ${c.text}; border: 1px solid ${c.border};
      margin-left: 10px;
    ">${escapeHtml(badge.text)}</span>`;
  }

  el.innerHTML = `
    <div style="
      display: flex; align-items: flex-start; justify-content: space-between;
      flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
    ">
      <div style="display: flex; align-items: center; gap: 14px;">
        ${icon ? `<div style="
          width: 44px; height: 44px; border-radius: 10px;
          background: var(--bg-secondary, #f3f4f6);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; flex-shrink: 0;
        ">${icon}</div>` : ''}
        <div>
          <div style="display: flex; align-items: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: var(--text-primary, #111);">
              ${escapeHtml(title)}
            </h1>
            ${badgeHtml}
          </div>
          ${description ? `<p style="margin: 4px 0 0; font-size: 14px; color: var(--text-muted, #6b7280);">
            ${escapeHtml(description)}
          </p>` : ''}
        </div>
      </div>
      ${actions ? `<div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
        ${actions}
      </div>` : ''}
    </div>
  `;
}

// ===== Breadcrumbs Component =====

/**
 * Render breadcrumb navigation.
 * @param {HTMLElement|string} container
 * @param {Array<{label: string, href?: string}>} items
 */
export function renderBreadcrumbs(container, items = []) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;

  const breadcrumb = document.getElementById('breadcrumb');
  const target = breadcrumb || el;

  let html = '<span style="font-size: 14px;">🏠</span>';
  html += '<span>Home</span>';

  items.forEach((item, idx) => {
    const isLast = idx === items.length - 1;
    html += '<span style="margin: 0 6px; color: var(--text-muted, #9ca3af);">›</span>';
    if (isLast || !item.href) {
      html += `<span style="color: var(--text-primary, #111); font-weight: 600;">${escapeHtml(item.label)}</span>`;
    } else {
      html += `<a href="#" style="
        color: var(--text-muted, #6b7280); text-decoration: none;
        transition: color 150ms; cursor: pointer;
      " onclick="event.preventDefault(); window.navigate('${escapeHtml(item.href)}');"
         onmouseenter="this.style.color='var(--accent-blue,#3b82f6)'"
         onmouseleave="this.style.color='var(--text-muted,#6b7280)'"
      >${escapeHtml(item.label)}</a>`;
    }
  });

  target.innerHTML = html;
}

// ===== Stat Cards Component =====

/**
 * Render a grid of stat cards.
 * @param {HTMLElement|string} container
 * @param {Array<Object>} cards
 * @returns {{ update: Function }}
 */
export function renderStatCards(container, cards = []) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return { update() {} };

  const colorMap = {
    blue: { bg: '#eff6ff', iconBg: '#dbeafe', accent: '#3b82f6' },
    green: { bg: '#f0fdf4', iconBg: '#dcfce7', accent: '#10b981' },
    amber: { bg: '#fffbeb', iconBg: '#fef3c7', accent: '#f59e0b' },
    red: { bg: '#fef2f2', iconBg: '#fecaca', accent: '#ef4444' },
    purple: { bg: '#faf5ff', iconBg: '#f3e8ff', accent: '#8b5cf6' },
    cyan: { bg: '#ecfeff', iconBg: '#cffafe', accent: '#06b6d4' },
  };

  function render(cards) {
    el.innerHTML = `
      <div class="stat-cards-grid" style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
      ">
        ${cards.map((card) => {
          const colors = colorMap[card.color] || colorMap.blue;
          const trendHtml = card.trend ? `
            <div style="
              display: inline-flex; align-items: center; gap: 3px;
              font-size: 12px; font-weight: 600; margin-top: 4px;
              color: ${card.trend.direction === 'up' ? '#10b981' : '#ef4444'};
            ">
              ${card.trend.direction === 'up' ? '↑' : '↓'} ${escapeHtml(card.trend.value)}
            </div>
          ` : '';

          return `
            <div style="
              background: ${colors.bg};
              border: 1px solid ${colors.iconBg};
              border-radius: 12px;
              padding: 18px 20px;
              transition: transform 150ms, box-shadow 150ms;
              cursor: default;
            " onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
               onmouseleave="this.style.transform='';this.style.boxShadow=''">
              <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                <div style="flex: 1;">
                  <div style="font-size: 13px; color: var(--text-muted, #6b7280); margin-bottom: 6px; font-weight: 500;">
                    ${escapeHtml(card.title)}
                  </div>
                  <div style="font-size: 24px; font-weight: 700; color: var(--text-primary, #111); line-height: 1.2;">
                    ${escapeHtml(card.value)}
                  </div>
                  ${trendHtml}
                </div>
                <div style="
                  width: 42px; height: 42px; border-radius: 10px;
                  background: ${colors.iconBg};
                  display: flex; align-items: center; justify-content: center;
                  font-size: 20px; flex-shrink: 0;
                ">${card.icon || ''}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  render(cards);

  return {
    /**
     * Update stat cards with new data.
     * @param {Array<Object>} newCards
     */
    update(newCards) {
      render(newCards);
    },
  };
}

// ===== Form Helpers =====

/**
 * Create a form group HTML string with label and input.
 * @param {string} label - Label text
 * @param {string} inputHtml - HTML for the input element
 * @param {string} id - ID for the input and label's for attribute
 * @returns {string} HTML string
 */
export function createFormGroup(label, inputHtml, id) {
  const escapedLabel = escapeHtml(label);
  const escapedId = escapeHtml(id);
  return `<div class="form-group">
    <label for="${escapedId}" style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--text-primary,#374151);">
      ${escapedLabel}
    </label>
    ${inputHtml}
  </div>`;
}

/**
 * Get all named input values from a form element as a plain object.
 * @param {HTMLFormElement} formElement
 * @returns {Object}
 */
export function getFormData(formElement) {
  if (!formElement) return {};
  const data = {};
  const elements = formElement.querySelectorAll('input, select, textarea');

  elements.forEach((el) => {
    const name = el.name;
    if (!name) return;

    if (el.type === 'checkbox') {
      // For checkboxes, collect into arrays if multiple share the same name
      if (data[name] === undefined) data[name] = [];
      if (el.checked) data[name].push(el.value || true);
      // If it was a single checkbox, unwrap from array
      if (data[name].length <= 1 && !formElement.querySelector(`input[type="checkbox"][name="${name}"]:nth-of-type(n+2)`)) {
        data[name] = el.checked ? (el.value || true) : false;
      }
    } else if (el.type === 'radio') {
      if (el.checked) data[name] = el.value;
    } else if (el.multiple && el.tagName === 'SELECT') {
      data[name] = Array.from(el.selectedOptions).map((opt) => opt.value);
    } else if (el.type === 'number' || el.dataset.type === 'number') {
      const val = el.value.trim();
      data[name] = val === '' ? 0 : parseFloat(val);
      if (isNaN(data[name])) data[name] = 0;
    } else {
      data[name] = el.value;
    }
  });

  return data;
}

/**
 * Set form input values from a data object.
 * @param {HTMLFormElement} formElement
 * @param {Object} data
 */
export function setFormData(formElement, data = {}) {
  if (!formElement || !data) return;
  const elements = formElement.querySelectorAll('input, select, textarea');

  elements.forEach((el) => {
    const name = el.name;
    if (!name || !(name in data)) return;

    const value = data[name];

    if (el.type === 'checkbox') {
      el.checked = Array.isArray(value) ? value.includes(el.value) : !!value;
    } else if (el.type === 'radio') {
      el.checked = String(el.value) === String(value);
    } else if (el.multiple && el.tagName === 'SELECT') {
      if (Array.isArray(value)) {
        Array.from(el.options).forEach((opt) => {
          opt.selected = value.includes(opt.value);
        });
      }
    } else {
      el.value = value != null ? String(value) : '';
    }
  });
}

/**
 * Validate a form against rules and show error messages.
 * @param {HTMLFormElement} formElement
 * @param {Object} rules - { fieldName: [ { required: true }, { type: 'email' }, { min: 0 }, { max: 100 }, { custom: (val) => string|null } ] }
 * @returns {{ valid: boolean, errors: Object<string> }}
 */
export function validateForm(formElement, rules = {}) {
  const errors = {};
  let valid = true;

  // Clear previous errors
  formElement.querySelectorAll('.form-error').forEach((el) => el.remove());
  formElement.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));

  Object.keys(rules).forEach((fieldName) => {
    const fieldRules = rules[fieldName];
    const input = formElement.querySelector(`[name="${fieldName}"]`);
    const value = input ? input.value : '';

    for (const rule of fieldRules) {
      let errorMsg = null;

      if (rule.required) {
        if (value === null || value === undefined || String(value).trim() === '') {
          errorMsg = rule.message || `${fieldName} is required`;
        }
      } else if (rule.type === 'email' && value.trim()) {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRe.test(value.trim())) {
          errorMsg = rule.message || 'Please enter a valid email address';
        }
      } else if (rule.min !== undefined && value !== '') {
        const numVal = Number(value);
        if (isNaN(numVal) || numVal < rule.min) {
          errorMsg = rule.message || `Value must be at least ${rule.min}`;
        }
      } else if (rule.max !== undefined && value !== '') {
        const numVal = Number(value);
        if (isNaN(numVal) || numVal > rule.max) {
          errorMsg = rule.message || `Value must be at most ${rule.max}`;
        }
      } else if (rule.minLength !== undefined && value.trim()) {
        if (value.trim().length < rule.minLength) {
          errorMsg = rule.message || `Must be at least ${rule.minLength} characters`;
        }
      } else if (rule.maxLength !== undefined && value.trim()) {
        if (value.trim().length > rule.maxLength) {
          errorMsg = rule.message || `Must be at most ${rule.maxLength} characters`;
        }
      } else if (rule.custom && typeof rule.custom === 'function') {
        errorMsg = rule.custom(value);
      }

      if (errorMsg) {
        errors[fieldName] = errorMsg;
        valid = false;

        // Show error below field
        if (input) {
          input.classList.add('input-error');
          input.style.borderColor = '#ef4444';
          const errorDiv = document.createElement('div');
          errorDiv.className = 'form-error';
          errorDiv.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px;';
          errorDiv.textContent = errorMsg;
          // Insert after the input's closest form-group or directly after
          const group = input.closest('.form-group');
          if (group) {
            group.appendChild(errorDiv);
          } else {
            input.parentNode.insertBefore(errorDiv, input.nextSibling);
          }
        }
        break; // Stop at first error for this field
      }
    }
  });

  return { valid, errors };
}

// ===== Line Items Editor =====

/**
 * Create a line items editor for invoice/purchase forms.
 * @param {HTMLElement|string} container
 * @param {Object} options
 * @returns {{ getItems: Function, setItems: Function, destroy: Function }}
 */
export function createLineItemsEditor(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return { getItems() { return []; }, setItems() {}, destroy() {} };

  const {
    products = [],
    items = [],
    priceField = 'sellingPrice',
    onChange = () => {},
  } = options;

  let _items = items.map((item) => ({
    productId: item.productId || '',
    productName: item.productName || '',
    quantity: item.quantity || 1,
    price: item.price || 0,
    total: (item.quantity || 1) * (item.price || 0),
  }));

  // If no initial items, add one blank row
  if (_items.length === 0) {
    _items.push({ productId: '', productName: '', quantity: 1, price: 0, total: 0 });
  }

  function buildProductOptions(selectedId) {
    const optionsHtml = '<option value="">Select product...</option>';
    return products.map((p) => {
      const selected = p.id === selectedId ? 'selected' : '';
      const price = p[priceField] || 0;
      return `<option value="${escapeHtml(p.id)}" data-price="${price}">${escapeHtml(p.name)} (${formatCurrency(price)})</option>`;
    }).join(optionsHtml);
  }

  function render() {
    el.innerHTML = `
      <div class="line-items-editor" style="border: 1px solid var(--border-color, #e5e7eb); border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: var(--bg-secondary, #f9fafb);">
              <th style="padding: 10px 12px; text-align: left; font-weight: 600; font-size: 12px; color: var(--text-muted, #6b7280); border-bottom: 2px solid var(--border-color, #e5e7eb); min-width: 200px;">Product</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; font-size: 12px; color: var(--text-muted, #6b7280); border-bottom: 2px solid var(--border-color, #e5e7eb); width: 100px;">Qty</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; font-size: 12px; color: var(--text-muted, #6b7280); border-bottom: 2px solid var(--border-color, #e5e7eb); width: 130px;">Price</th>
              <th style="padding: 10px 12px; text-align: right; font-weight: 600; font-size: 12px; color: var(--text-muted, #6b7280); border-bottom: 2px solid var(--border-color, #e5e7eb); width: 130px;">Total</th>
              <th style="padding: 10px 12px; width: 50px; border-bottom: 2px solid var(--border-color, #e5e7eb);"></th>
            </tr>
          </thead>
          <tbody class="line-items-body">
            ${_items.map((item, idx) => renderItemRow(item, idx)).join('')}
          </tbody>
        </table>
        <div style="padding: 12px; border-top: 1px solid var(--border-color, #e5e7eb);">
          <button type="button" class="add-line-item-btn" style="
            padding: 7px 16px; border-radius: 6px;
            border: 1px dashed var(--border-color, #d1d5db);
            background: none; color: var(--accent-blue, #3b82f6);
            cursor: pointer; font-size: 13px; font-weight: 500;
            transition: background 150ms;
          " onmouseenter="this.style.background='var(--bg-hover,#eff6ff)'"
             onmouseleave="this.style.background='none'">
            + Add Item
          </button>
        </div>
      </div>
    `;

    // Wire up events
    wireEvents();
  }

  function renderItemRow(item, idx) {
    return `
      <tr class="line-item-row" data-index="${idx}" style="border-bottom: 1px solid var(--border-color, #f3f4f6);">
        <td style="padding: 8px 12px;">
          <select class="line-item-product" data-index="${idx}" style="
            width: 100%; padding: 7px 10px; border: 1px solid var(--border-color, #d1d5db);
            border-radius: 6px; font-size: 13px; background: var(--bg-primary, #fff);
            color: var(--text-primary, #111);
          ">
            ${buildProductOptions(item.productId)}
          </select>
        </td>
        <td style="padding: 8px 12px;">
          <input type="number" class="line-item-qty" data-index="${idx}" value="${item.quantity}" min="1" step="1" style="
            width: 100%; padding: 7px 10px; border: 1px solid var(--border-color, #d1d5db);
            border-radius: 6px; font-size: 13px; text-align: right;
            background: var(--bg-primary, #fff); color: var(--text-primary, #111);
          " />
        </td>
        <td style="padding: 8px 12px;">
          <input type="number" class="line-item-price" data-index="${idx}" value="${item.price}" min="0" step="0.01" style="
            width: 100%; padding: 7px 10px; border: 1px solid var(--border-color, #d1d5db);
            border-radius: 6px; font-size: 13px; text-align: right;
            background: var(--bg-primary, #fff); color: var(--text-primary, #111);
          " />
        </td>
        <td style="padding: 8px 12px; text-align: right; font-weight: 600; color: var(--text-primary, #111);">
          <span class="line-item-total" data-index="${idx}">${formatCurrency(item.total)}</span>
        </td>
        <td style="padding: 8px 12px; text-align: center;">
          <button type="button" class="remove-line-item-btn" data-index="${idx}" ${_items.length <= 1 ? 'disabled' : ''} style="
            background: none; border: none; cursor: pointer;
            color: var(--text-muted, #9ca3af); font-size: 18px;
            ${_items.length <= 1 ? 'opacity:0.3;cursor:default;' : ''}
            transition: color 150ms;
          " onmouseenter="${_items.length > 1 ? "this.style.color='#ef4444'" : ''}"
             onmouseleave="this.style.color='var(--text-muted,#9ca3af)'">&times;</button>
        </td>
      </tr>
    `;
  }

  function wireEvents() {
    // Product selection change
    el.querySelectorAll('.line-item-product').forEach((select) => {
      select.addEventListener('change', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const selectedOption = e.target.selectedOptions[0];
        const price = selectedOption ? parseFloat(selectedOption.dataset.price) || 0 : 0;
        const productName = selectedOption ? selectedOption.textContent.split(' (')[0] : '';

        _items[idx].productId = e.target.value;
        _items[idx].productName = productName;
        _items[idx].price = price;
        _items[idx].total = _items[idx].quantity * price;

        // Update price input
        const priceInput = el.querySelector(`.line-item-price[data-index="${idx}"]`);
        if (priceInput) priceInput.value = price;

        // Update total display
        updateRowTotal(idx);
        onChange(getItems());
      });
    });

    // Quantity change
    el.querySelectorAll('.line-item-qty').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const qty = Math.max(1, parseInt(e.target.value, 10) || 1);
        _items[idx].quantity = qty;
        _items[idx].total = qty * _items[idx].price;
        updateRowTotal(idx);
        onChange(getItems());
      });
    });

    // Price change
    el.querySelectorAll('.line-item-price').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        const price = parseFloat(e.target.value) || 0;
        _items[idx].price = price;
        _items[idx].total = _items[idx].quantity * price;
        updateRowTotal(idx);
        onChange(getItems());
      });
    });

    // Remove item
    el.querySelectorAll('.remove-line-item-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (_items.length <= 1) return;
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        _items.splice(idx, 1);
        render();
        onChange(getItems());
      });
    });

    // Add item
    const addBtn = el.querySelector('.add-line-item-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        _items.push({ productId: '', productName: '', quantity: 1, price: 0, total: 0 });
        render();
        onChange(getItems());
        // Focus on the new product select
        const lastSelect = el.querySelector(`.line-item-product[data-index="${_items.length - 1}"]`);
        if (lastSelect) lastSelect.focus();
      });
    }
  }

  function updateRowTotal(idx) {
    const totalEl = el.querySelector(`.line-item-total[data-index="${idx}"]`);
    if (totalEl) {
      totalEl.textContent = formatCurrency(_items[idx].total);
    }
  }

  render();

  return {
    /**
     * Get the current line items array.
     * @returns {Array}
     */
    getItems() {
      return _items.map((item) => ({ ...item }));
    },

    /**
     * Set the line items to a new array.
     * @param {Array} newItems
     */
    setItems(newItems = []) {
      _items = newItems.map((item) => ({
        productId: item.productId || '',
        productName: item.productName || '',
        quantity: item.quantity || 1,
        price: item.price || 0,
        total: (item.quantity || 1) * (item.price || 0),
      }));
      if (_items.length === 0) {
        _items.push({ productId: '', productName: '', quantity: 1, price: 0, total: 0 });
      }
      render();
    },

    /**
     * Destroy the editor and clean up.
     */
    destroy() {
      el.innerHTML = '';
    },
  };
}

// ===== Empty State Component =====

/**
 * Render a centered empty state with icon, title, description, and optional action.
 * @param {HTMLElement|string} container
 * @param {Object} options
 */
export function renderEmptyState(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;

  const {
    icon = '📭',
    title = 'No data',
    description = '',
    actionLabel = '',
    actionCallback = null,
  } = options;

  el.innerHTML = `
    <div style="
      text-align: center; padding: 48px 20px;
      color: var(--text-muted, #6b7280);
    ">
      <div style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
      <div style="font-size: 16px; font-weight: 600; color: var(--text-primary, #374151); margin-bottom: 8px;">
        ${escapeHtml(title)}
      </div>
      ${description ? `<div style="font-size: 14px; max-width: 360px; margin: 0 auto; line-height: 1.5;">
        ${escapeHtml(description)}
      </div>` : ''}
      ${actionLabel ? `
        <button type="button" class="empty-state-action-btn" style="
          margin-top: 20px; padding: 9px 24px; border-radius: 8px;
          background: var(--accent-blue, #3b82f6); color: white;
          border: none; cursor: pointer; font-size: 14px; font-weight: 500;
          transition: background 150ms;
        " onmouseenter="this.style.background='#2563eb'"
           onmouseleave="this.style.background='var(--accent-blue,#3b82f6)'"
        >${escapeHtml(actionLabel)}</button>
      ` : ''}
    </div>
  `;

  if (actionCallback) {
    const btn = el.querySelector('.empty-state-action-btn');
    if (btn) btn.addEventListener('click', actionCallback);
  }
}

// ===== Loading State =====

/**
 * Show skeleton loading placeholders inside a container.
 * @param {HTMLElement|string} container
 */
export function showLoading(container) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;

  el.dataset.wasLoading = 'true';
  el.innerHTML = `
    <div class="skeleton-loading" style="padding: 20px;">
      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        ${[1, 2, 3, 4].map(() => `
          <div style="flex: 1; background: var(--bg-secondary, #f3f4f6); border-radius: 8px; padding: 20px; animation: skeletonPulse 1.5s ease-in-out infinite;">
            <div style="height: 12px; background: var(--border-color, #e5e7eb); border-radius: 4px; margin-bottom: 12px; width: 60%;"></div>
            <div style="height: 24px; background: var(--border-color, #e5e7eb); border-radius: 4px; width: 40%;"></div>
          </div>
        `).join('')}
      </div>
      <div style="background: var(--bg-secondary, #f3f4f6); border-radius: 8px; padding: 20px; animation: skeletonPulse 1.5s ease-in-out infinite;">
        <div style="height: 14px; background: var(--border-color, #e5e7eb); border-radius: 4px; margin-bottom: 12px; width: 30%;"></div>
        ${[1, 2, 3, 4, 5].map(() => `
          <div style="height: 12px; background: var(--border-color, #e5e7eb); border-radius: 4px; margin-bottom: 8px;"></div>
        `).join('')}
      </div>
    </div>
    <style>
      @keyframes skeletonPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    </style>
  `;
}

/**
 * Remove skeleton loading placeholders from a container.
 * @param {HTMLElement|string} container
 */
export function hideLoading(container) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  if (el.dataset.wasLoading === 'true') {
    el.innerHTML = '';
    delete el.dataset.wasLoading;
  }
}

// ===== Simple Bar Chart (Pure CSS/JS) =====

/**
 * Render a simple bar chart using div elements with CSS transitions.
 * @param {HTMLElement|string} container
 * @param {Object} options
 * @returns {{ update: Function }}
 */
export function renderBarChart(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return { update() {} };

  const {
    data = [],
    height = 250,
    showValues = true,
  } = options;

  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  function render(chartData) {
    if (!chartData || chartData.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text-muted,#9ca3af);padding:40px;">No data</div>';
      return;
    }

    const maxValue = Math.max(...chartData.map((d) => Number(d.value) || 0), 1);

    el.innerHTML = `
      <div style="
        display: flex; align-items: flex-end; gap: 8px;
        height: ${height}px; padding: 0 4px;
      ">
        ${chartData.map((d, idx) => {
          const value = Number(d.value) || 0;
          const pct = (value / maxValue) * 100;
          const color = d.color || defaultColors[idx % defaultColors.length];

          return `
            <div style="
              flex: 1; display: flex; flex-direction: column;
              align-items: center; justify-content: flex-end;
              height: 100%; min-width: 0;
            ">
              ${showValues ? `<div style="
                font-size: 11px; font-weight: 600; color: var(--text-primary, #374151);
                margin-bottom: 4px; white-space: nowrap;
              ">${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}</div>` : ''}
              <div class="bar-chart-bar" style="
                width: 100%; max-width: 48px; min-width: 16px;
                height: 0%; border-radius: 6px 6px 0 0;
                background: ${color};
                transition: height 600ms cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
              " data-target-height="${pct}%"
                 onmouseenter="this.style.opacity='0.8';this.style.transform='scaleY(1.02)'"
                 onmouseleave="this.style.opacity='1';this.style.transform='scaleY(1)'">
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="
        display: flex; gap: 8px; padding: 8px 4px 0;
      ">
        ${chartData.map((d) => `
          <div style="
            flex: 1; text-align: center; font-size: 11px;
            color: var(--text-muted, #6b7280);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            padding: 0 2px;
          ">${escapeHtml(d.label)}</div>
        `).join('')}
      </div>
    `;

    // Animate bars up
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.querySelectorAll('.bar-chart-bar').forEach((bar) => {
          bar.style.height = bar.dataset.targetHeight;
        });
      });
    });
  }

  render(data);

  return {
    /**
     * Update the chart with new data.
     * @param {Array} newData
     */
    update(newData) {
      render(newData);
    },
  };
}

// ===== Simple Donut Chart (Pure CSS/JS) =====

/**
 * Render a simple donut chart using conic-gradient CSS.
 * @param {HTMLElement|string} container
 * @param {Object} options
 * @returns {{ update: Function }}
 */
export function renderDonutChart(container, options = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return { update() {} };

  const {
    data = [],
    size = 200,
    centerLabel = '',
    centerValue = '',
  } = options;

  const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  function render(chartData) {
    if (!chartData || chartData.length === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text-muted,#9ca3af);padding:40px;">No data</div>';
      return;
    }

    const total = chartData.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
    if (total === 0) {
      el.innerHTML = '<div style="text-align:center;color:var(--text-muted,#9ca3af);padding:40px;">No data</div>';
      return;
    }

    // Build conic-gradient
    let gradientParts = [];
    let currentAngle = 0;
    chartData.forEach((d, idx) => {
      const value = Number(d.value) || 0;
      const pct = (value / total) * 100;
      const color = d.color || defaultColors[idx % defaultColors.length];
      const startAngle = currentAngle;
      const endAngle = currentAngle + pct;
      gradientParts.push(`${color} ${startAngle}% ${endAngle}%`);
      currentAngle = endAngle;
    });

    const gradient = `conic-gradient(${gradientParts.join(', ')})`;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
        <div class="donut-chart-container" style="
          width: ${size}px; height: ${size}px;
          border-radius: 50%; position: relative;
          background: var(--bg-secondary, #f3f4f6);
          transition: transform 300ms ease;
        " onmouseenter="this.style.transform='scale(1.03)'"
           onmouseleave="this.style.transform='scale(1)'">
          <div class="donut-chart-ring" style="
            width: 100%; height: 100%; border-radius: 50%;
            background: ${gradient};
            position: absolute; inset: 0;
            transform: scale(0); opacity: 0;
            transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms ease;
          "></div>
          <div class="donut-chart-hole" style="
            position: absolute;
            inset: 25%; border-radius: 50%;
            background: var(--bg-primary, #fff);
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            z-index: 1;
          ">
            ${centerValue ? `<div style="font-size: 22px; font-weight: 700; color: var(--text-primary, #111);">${escapeHtml(centerValue)}</div>` : ''}
            ${centerLabel ? `<div style="font-size: 12px; color: var(--text-muted, #6b7280); margin-top: 2px;">${escapeHtml(centerLabel)}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px 16px;justify-content:center;max-width:${size + 40}px;">
          ${chartData.map((d, idx) => {
            const value = Number(d.value) || 0;
            const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            const color = d.color || defaultColors[idx % defaultColors.length];
            return `
              <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary,#4b5563);">
                <span style="width:10px;height:10px;border-radius:3px;background:${color};flex-shrink:0;"></span>
                <span>${escapeHtml(d.label)} (${pct}%)</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Animate the ring in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ring = el.querySelector('.donut-chart-ring');
        if (ring) {
          ring.style.transform = 'scale(1)';
          ring.style.opacity = '1';
        }
      });
    });
  }

  render(data);

  return {
    /**
     * Update the donut chart with new data.
     * @param {Array} newData
     */
    update(newData) {
      render(newData);
    },
  };
}
