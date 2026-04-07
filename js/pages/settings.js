// ============================================
// js/pages/settings.js — Settings Page Module
// ============================================

import store from '../store.js';
import {
  escapeHtml, formatFileSize
} from '../utils.js';
import {
  renderPageHeader, renderBreadcrumbs, createFormGroup,
  showToast, showSuccess, showError, confirmDialog
} from '../components.js';

// ============================================
// Constants
// ============================================

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  INR: '₹',
  JPY: '¥',
};

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
];

// ============================================
// Helper: Create a settings card with header, body, and optional footer
// ============================================

function settingsCard(title, bodyHtml, footerHtml = '') {
  return `
    <div style="
      background: var(--bg-primary, #fff);
      border: 1px solid var(--border-color, #e5e7eb);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 24px;
    ">
      <div style="
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
      ">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary, #111);">
          ${escapeHtml(title)}
        </h3>
      </div>
      <div style="padding: 20px;">
        ${bodyHtml}
      </div>
      ${footerHtml ? `
        <div style="
          padding: 16px 20px;
          border-top: 1px solid var(--border-color, #e5e7eb);
          display: flex;
          justify-content: flex-end;
        ">
          ${footerHtml}
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================
// Helper: Create a styled input field
// ============================================

function styledInput(id, type, value, placeholder = '', extraAttrs = '') {
  return `<input
    type="${type}"
    id="${escapeHtml(id)}"
    data-setting="${escapeHtml(id)}"
    value="${escapeHtml(String(value ?? ''))}"
    placeholder="${escapeHtml(placeholder)}"
    style="
      width: 100%; padding: 9px 12px;
      border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px; font-size: 14px;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #111);
      outline: none; transition: border-color 150ms, box-shadow 150ms;
      box-sizing: border-box;
    "
    onfocus="this.style.borderColor='#3b82f6';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'"
    onblur="this.style.borderColor='var(--border-color,#d1d5db)';this.style.boxShadow='none'"
    ${extraAttrs}
  />`;
}

function styledTextarea(id, value, rows = 3, placeholder = '') {
  return `<textarea
    id="${escapeHtml(id)}"
    data-setting="${escapeHtml(id)}"
    rows="${rows}"
    placeholder="${escapeHtml(placeholder)}"
    style="
      width: 100%; padding: 9px 12px;
      border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px; font-size: 14px;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #111);
      outline: none; transition: border-color 150ms, box-shadow 150ms;
      resize: vertical; font-family: inherit; box-sizing: border-box;
    "
    onfocus="this.style.borderColor='#3b82f6';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'"
    onblur="this.style.borderColor='var(--border-color,#d1d5db)';this.style.boxShadow='none'"
  >${escapeHtml(String(value ?? ''))}</textarea>`;
}

function styledSelect(id, options, currentValue) {
  const optionsHtml = options.map(opt => {
    const sel = opt.value === currentValue ? 'selected' : '';
    return `<option value="${escapeHtml(opt.value)}" ${sel}>${escapeHtml(opt.label)}</option>`;
  }).join('');

  return `<select
    id="${escapeHtml(id)}"
    data-setting="${escapeHtml(id)}"
    style="
      width: 100%; padding: 9px 12px;
      border: 1px solid var(--border-color, #d1d5db);
      border-radius: 8px; font-size: 14px;
      background: var(--bg-primary, #fff);
      color: var(--text-primary, #111);
      outline: none; transition: border-color 150ms, box-shadow 150ms;
      cursor: pointer; box-sizing: border-box;
    "
    onfocus="this.style.borderColor='#3b82f6';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'"
    onblur="this.style.borderColor='var(--border-color,#d1d5db)';this.style.boxShadow='none'"
  >${optionsHtml}</select>`;
}

// ============================================
// Helper: Save button HTML
// ============================================

function saveButtonHtml(sectionId) {
  return `<button
    class="settings-save-btn"
    data-section="${escapeHtml(sectionId)}"
    style="
      padding: 8px 20px; border-radius: 8px; border: none;
      background: #3b82f6; color: white; cursor: pointer;
      font-size: 14px; font-weight: 500; transition: background 150ms;
    "
    onmouseenter="this.style.background='#2563eb'"
    onmouseleave="this.style.background='#3b82f6'"
  >Save</button>`;
}

// ============================================
// Main: renderSettings
// ============================================

export function renderSettings(container) {
  const unsubscribers = [];

  // Subscribe to settings changes to re-render
  unsubscribers.push(store.subscribe('settings:changed', () => render(container)));
  // Also subscribe to all events in case of import/reset
  unsubscribers.push(store.subscribe('dashboard:refresh', () => render(container)));

  let unsavedChanges = false;

  function render(container) {
    const settings = store.getSettings();

    // ---- Company Information Card ----

    const companyBody = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="settings-form-grid">
        <div style="grid-column: 1 / -1;">
          ${createFormGroup('Company Name', styledInput('companyName', 'text', settings.companyName, 'Enter company name'), 'companyName')}
        </div>
        <div style="grid-column: 1 / -1;">
          ${createFormGroup('Company Address', styledTextarea('companyAddress', settings.companyAddress, 3, 'Enter company address'), 'companyAddress')}
        </div>
        <div>
          ${createFormGroup('Company Phone', styledInput('companyPhone', 'tel', settings.companyPhone, 'Enter phone number'), 'companyPhone')}
        </div>
        <div>
          ${createFormGroup('Company Email', styledInput('companyEmail', 'email', settings.companyEmail, 'Enter email address'), 'companyEmail')}
        </div>
      </div>
    `;

    const companyCard = settingsCard('🏢 Company Information', companyBody, saveButtonHtml('company'));

    // ---- Invoice & Purchase Settings Card ----

    const invoiceBody = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="settings-form-grid">
        <div>
          ${createFormGroup('Invoice Prefix', styledInput('invoicePrefix', 'text', settings.invoicePrefix || 'INV', 'INV'), 'invoicePrefix')}
        </div>
        <div>
          ${createFormGroup('Purchase Prefix', styledInput('purchasePrefix', 'text', settings.purchasePrefix || 'PO', 'PO'), 'purchasePrefix')}
        </div>
        <div>
          ${createFormGroup('Tax Rate', styledInput('taxRate', 'number', settings.taxRate != null ? settings.taxRate : 10, '10', 'min="0" max="100" step="0.01"'), 'taxRate')}
          <span style="display: block; font-size: 11px; color: var(--text-muted, #6b7280); margin-top: 4px;">
            Applied as a percentage on invoice subtotal.
          </span>
        </div>
        <div>
          ${createFormGroup('Currency', styledSelect('currency', CURRENCY_OPTIONS, settings.currency || 'USD'), 'currency')}
        </div>
        <div>
          ${createFormGroup('Currency Symbol', styledInput('currencySymbol', 'text', settings.currencySymbol || '$', '$', 'style="max-width: 120px;"'), 'currencySymbol')}
          <span style="display: block; font-size: 11px; color: var(--text-muted, #6b7280); margin-top: 4px;">
            Auto-filled when currency is changed.
          </span>
        </div>
      </div>
    `;

    const invoiceCard = settingsCard('🧾 Invoice & Purchase Settings', invoiceBody, saveButtonHtml('invoice'));

    // ---- Stock Settings Card ----

    const stockBody = `
      <div style="max-width: 300px;">
        ${createFormGroup('Low Stock Threshold', styledInput('lowStockThreshold', 'number', settings.lowStockThreshold != null ? settings.lowStockThreshold : 10, '10', 'min="0" step="1"'), 'lowStockThreshold')}
        <span style="display: block; font-size: 12px; color: var(--text-muted, #6b7280); margin-top: 4px;">
          Products with quantity at or below this value will be flagged as low stock.
        </span>
      </div>
    `;

    const stockCard = settingsCard('📦 Stock Settings', stockBody, saveButtonHtml('stock'));

    // ---- Data Management Card ----

    const dataBody = `
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
        <button
          id="btn-export-data"
          style="
            padding: 8px 18px; border-radius: 8px; border: none;
            background: #10b981; color: white; cursor: pointer;
            font-size: 14px; font-weight: 500; transition: background 150ms;
          "
          onmouseenter="this.style.background='#059669'"
          onmouseleave="this.style.background='#10b981'"
        >📤 Export Data</button>
        <button
          id="btn-import-data"
          style="
            padding: 8px 18px; border-radius: 8px; border: 1px solid var(--border-color, #d1d5db);
            background: var(--bg-primary, #fff); color: var(--text-primary, #374151);
            cursor: pointer; font-size: 14px; font-weight: 500; transition: background 150ms;
          "
          onmouseenter="this.style.background='var(--bg-secondary,#f9fafb)'"
          onmouseleave="this.style.background='var(--bg-primary,#fff)'"
        >📥 Import Data</button>
        <button
          id="btn-reset-data"
          style="
            padding: 8px 18px; border-radius: 8px; border: none;
            background: #ef4444; color: white; cursor: pointer;
            font-size: 14px; font-weight: 500; transition: background 150ms;
          "
          onmouseenter="this.style.background='#dc2626'"
          onmouseleave="this.style.background='#ef4444'"
        >🗑️ Reset All Data</button>
      </div>
      <div style="margin-top: 16px; padding: 12px; background: var(--bg-secondary, #f8fafc); border-radius: 8px; border: 1px solid var(--border-color, #e5e7eb);">
        <p style="margin: 0; font-size: 13px; color: var(--text-muted, #6b7280); line-height: 1.5;">
          <strong style="color: var(--text-primary, #111);">Note:</strong>
          Export your data as a JSON backup file. You can import it later to restore your data.
          Use the reset button to clear all data and start fresh.
        </p>
      </div>
      <input type="file" id="settings-import-file" accept=".json" style="display: none;" />
    `;

    const dataCard = settingsCard('💾 Data Management', dataBody);

    // ---- About Card ----

    const storageSize = store.getStorageSize() || 0;
    const aboutBody = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;" class="settings-form-grid">
        <div>
          ${createFormGroup('App Name', styledInput('_aboutAppName', 'text', 'SuFa Inventory Management System', '', 'disabled'), '_aboutAppName')}
        </div>
        <div>
          ${createFormGroup('Version', styledInput('_aboutVersion', 'text', '1.0.0', '', 'disabled'), '_aboutVersion')}
        </div>
        <div>
          ${createFormGroup('Developer', styledInput('_aboutDev', 'text', 'Faruk Islam', '', 'disabled'), '_aboutDev')}
        </div>
        <div>
          ${createFormGroup('Contact', styledInput('_aboutContact', 'text', 'farukislamyt@gmail.com', '', 'disabled'), '_aboutContact')}
        </div>
        <div>
          ${createFormGroup('Storage Type', styledInput('_aboutStorage', 'text', 'Local Storage', '', 'disabled'), '_aboutStorage')}
        </div>
        <div>
          ${createFormGroup('Storage Used', styledInput('_aboutStorageUsed', 'text', formatFileSize(storageSize), '', 'disabled'), '_aboutStorageUsed')}
        </div>
      </div>
      <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border-radius: 10px; border: 1px solid #c7d2fe;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
          <span style="font-size: 28px;">📦</span>
          <div>
            <div style="font-size: 16px; font-weight: 700; color: #312e81;">SuFa Inventory Management System</div>
            <div style="font-size: 13px; color: #6366f1;">Version 1.0.0</div>
          </div>
        </div>
        <div style="font-size: 13px; color: #4b5563; line-height: 1.7;">
          <div><strong>Developer:</strong> Faruk Islam</div>
          <div><strong>Email:</strong> <a href="mailto:farukislamyt@gmail.com" style="color: #4f46e5; text-decoration: none;">farukislamyt@gmail.com</a></div>
          <div><strong>Website:</strong> <a href="https://farukislamyt.github.io" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: none;">farukislamyt.github.io</a></div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #c7d2fe; font-size: 12px; color: #6b7280;">
            &copy; ${new Date().getFullYear()} Faruk Islam. All rights reserved.
          </div>
        </div>
      </div>
    `;

    const aboutCard = settingsCard('ℹ️ About', aboutBody);

    // ---- Unsaved changes indicator ----

    const unsavedHtml = `
      <div id="settings-unsaved" style="
        display: none;
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        cursor: pointer;
        transition: transform 150ms, opacity 150ms;
      " onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform=''">
        ⚠️ You have unsaved changes
      </div>
    `;

    // ---- Build full HTML ----

    const html = `
      <!-- Page Header -->
      <div id="settings-header"></div>
      <div id="settings-breadcrumbs"></div>

      <!-- Settings Cards -->
      ${companyCard}
      ${invoiceCard}
      ${stockCard}
      ${dataCard}
      ${aboutCard}

      <!-- Unsaved changes indicator -->
      ${unsavedHtml}

      <style>
        @media (max-width: 768px) {
          .settings-form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      </style>
    `;

    container.innerHTML = html;

    // ---- Render sub-components ----

    renderPageHeader(document.getElementById('settings-header'), {
      title: 'Settings',
      description: 'Manage your application settings and preferences.',
      icon: '⚙️',
    });

    renderBreadcrumbs(document.getElementById('settings-breadcrumbs'), [
      { label: 'Settings' },
    ]);

    // ---- Bind events ----
    bindEvents(container);
  }

  // ============================================
  // Bind Events
  // ============================================

  function bindEvents(container) {
    unsavedChanges = false;

    // ---- Track changes for unsaved indicator ----
    container.querySelectorAll('input, textarea, select').forEach(el => {
      if (el.id && !el.id.startsWith('_about')) {
        el.addEventListener('input', () => {
          if (!unsavedChanges) {
            unsavedChanges = true;
            const indicator = document.getElementById('settings-unsaved');
            if (indicator) indicator.style.display = 'block';
          }
        });
      }
    });

    // ---- Currency auto-fill symbol ----
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
      currencySelect.addEventListener('change', () => {
        const symbolInput = document.getElementById('currencySymbol');
        if (symbolInput) {
          symbolInput.value = CURRENCY_SYMBOLS[currencySelect.value] || '';
        }
      });
    }

    // ---- Save buttons ----
    container.querySelectorAll('.settings-save-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        saveSection(section, container);
      });
    });

    // ---- Export Data ----
    const exportBtn = document.getElementById('btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        try {
          const data = store.exportData();
          const json = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const today = new Date().toISOString().split('T')[0];
          a.download = `sufa-inventory-backup-${today}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showSuccess('Data exported successfully!');
        } catch (e) {
          console.error('Export failed:', e);
          showError('Failed to export data.');
        }
      });
    }

    // ---- Import Data ----
    const importBtn = document.getElementById('btn-import-data');
    const fileInput = document.getElementById('settings-import-file');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
      });

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const confirmed = await confirmDialog({
            title: 'Import Data',
            message: 'This will replace all current data. Continue?',
            confirmText: 'Import',
            cancelText: 'Cancel',
            variant: 'danger',
          });

          if (confirmed) {
            const success = store.importData(text);
            if (success) {
              showSuccess('Data imported successfully!');
              unsavedChanges = false;
              const indicator = document.getElementById('settings-unsaved');
              if (indicator) indicator.style.display = 'none';
              // Re-render to show new settings
              render(container);
            } else {
              showError('Failed to import data. Invalid file format.');
            }
          }
        } catch (e) {
          console.error('Import failed:', e);
          showError('Failed to import data. Invalid file format.');
        }

        fileInput.value = '';
      });
    }

    // ---- Reset All Data ----
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const confirmed = await confirmDialog({
          title: 'Reset All Data',
          message: '⚠️ This action cannot be undone. All data will be permanently deleted.',
          confirmText: 'Yes, Reset Everything',
          cancelText: 'Cancel',
          variant: 'danger',
        });

        if (confirmed) {
          try {
            store.resetAllData();
            showSuccess('All data has been reset.');
            unsavedChanges = false;
            // Re-render to show default settings
            render(container);
          } catch (e) {
            console.error('Reset failed:', e);
            showError('Failed to reset data.');
          }
        }
      });
    }
  }

  // ============================================
  // Save Section
  // ============================================

  function saveSection(section, container) {
    let updates = {};

    if (section === 'company') {
      const companyName = document.getElementById('companyName');
      const companyAddress = document.getElementById('companyAddress');
      const companyPhone = document.getElementById('companyPhone');
      const companyEmail = document.getElementById('companyEmail');

      updates = {
        companyName: companyName ? companyName.value : '',
        companyAddress: companyAddress ? companyAddress.value : '',
        companyPhone: companyPhone ? companyPhone.value : '',
        companyEmail: companyEmail ? companyEmail.value : '',
      };

      // Basic validation
      if (updates.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.companyEmail)) {
        showError('Please enter a valid email address.');
        return;
      }
    }

    else if (section === 'invoice') {
      const invoicePrefix = document.getElementById('invoicePrefix');
      const purchasePrefix = document.getElementById('purchasePrefix');
      const taxRate = document.getElementById('taxRate');
      const currency = document.getElementById('currency');
      const currencySymbol = document.getElementById('currencySymbol');

      updates = {
        invoicePrefix: invoicePrefix ? invoicePrefix.value.trim() : 'INV',
        purchasePrefix: purchasePrefix ? purchasePrefix.value.trim() : 'PO',
        taxRate: taxRate ? parseFloat(taxRate.value) || 0 : 0,
        currency: currency ? currency.value : 'USD',
        currencySymbol: currencySymbol ? currencySymbol.value.trim() : '$',
      };

      if (!updates.invoicePrefix) {
        showError('Invoice prefix cannot be empty.');
        return;
      }
      if (!updates.purchasePrefix) {
        showError('Purchase prefix cannot be empty.');
        return;
      }
      if (updates.taxRate < 0 || updates.taxRate > 100) {
        showError('Tax rate must be between 0 and 100.');
        return;
      }
    }

    else if (section === 'stock') {
      const lowStockThreshold = document.getElementById('lowStockThreshold');

      updates = {
        lowStockThreshold: lowStockThreshold ? parseInt(lowStockThreshold.value, 10) || 0 : 10,
      };

      if (updates.lowStockThreshold < 0) {
        showError('Low stock threshold must be 0 or greater.');
        return;
      }
    }

    try {
      store.updateSettings(updates);
      showSuccess('Settings saved successfully!');
      unsavedChanges = false;

      const indicator = document.getElementById('settings-unsaved');
      if (indicator) indicator.style.display = 'none';
    } catch (e) {
      console.error('Save failed:', e);
      showError('Failed to save settings.');
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
    return '<div id="settings-root"></div>';
  },
  init() {
    const container = document.getElementById('settings-root');
    if (container) {
      renderSettings(container);
    }
  },
};
