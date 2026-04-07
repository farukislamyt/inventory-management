// ============================================
// js/constants.js — Centralized Configuration
// Single source of truth for event names, colors, limits, styles, etc.
// ============================================

// ===== EVENT NAMES (prevent silent failures from typos) =====
export const EVENTS = {
  // Categories
  CATEGORIES_CHANGED: 'categories:changed',

  // Products
  PRODUCTS_CHANGED: 'products:changed',

  // Customers
  CUSTOMERS_CHANGED: 'customers:changed',

  // Suppliers
  SUPPLIERS_CHANGED: 'suppliers:changed',

  // Invoices
  INVOICES_CHANGED: 'invoices:changed',

  // Purchases
  PURCHASES_CHANGED: 'purchases:changed',

  // Transactions
  TRANSACTIONS_CHANGED: 'transactions:changed',

  // Stock Movements
  STOCK_MOVEMENTS_CHANGED: 'stockmovements:changed',

  // Settings
  SETTINGS_CHANGED: 'settings:changed',

  // Dashboard refresh trigger
  DASHBOARD_REFRESH: 'dashboard:refresh',
};

// ===== COLOR PALETTE =====
export const COLORS = {
  // Toast notification colors
  TOAST: {
    SUCCESS: { border: '#10b981', bg: '#f0fdf4', text: '#065f46' },
    ERROR: { border: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
    WARNING: { border: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
    INFO: { border: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
  },

  // Category badge colors (cycling palette)
  CATEGORY: [
    { bg: '#dbeafe', text: '#1e40af' }, // Blue
    { bg: '#dcfce7', text: '#166534' }, // Green
    { bg: '#fef3c7', text: '#92400e' }, // Yellow
    { bg: '#fce7f3', text: '#9d174d' }, // Pink
    { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
    { bg: '#ccfbf1', text: '#115e59' }, // Teal
    { bg: '#fef9c3', text: '#854d0e' }, // Lime
    { bg: '#ffe4e6', text: '#9f1239' }, // Rose
  ],

  // Stat card icon colors
  STAT_CARD: {
    PRODUCTS: '#3b82f6',    // Blue
    CATEGORIES: '#8b5cf6',  // Violet
    CUSTOMERS: '#ec4899',   // Pink
    SUPPLIERS: '#f59e0b',   // Amber
    INVOICES: '#10b981',    // Green
    PURCHASES: '#f97316',   // Orange
    REVENUE: '#6366f1',     // Indigo
    PAYABLES: '#ef4444',    // Red
  },

  // Status colors
  STATUS: {
    SUCCESS: '#10b981',
    DANGER: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
  },
};

// ===== CONFIGURATION =====
export const CONFIG = {
  // Store debounce time (prevents excessive localStorage writes)
  STORE_DEBOUNCE_MS: 300,

  // Search/filter debounce time
  SEARCH_DEBOUNCE_MS: 250,

  // Pagination
  PAGE_SIZE: 10,

  // Stock
  DEFAULT_LOW_STOCK_THRESHOLD: 10,

  // Toast duration (ms)
  TOAST_DURATION_MS: 4000,

  // Modal animation duration (ms)
  MODAL_ANIMATION_MS: 150,

  // Dialog animation duration (ms)
  DIALOG_ANIMATION_MS: 200,
};

// ===== FORM STYLES (eliminated duplication) =====
export const FORM_STYLES = {
  // Base input style (used across all form inputs)
  INPUT: `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 14px;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #111);
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
    box-sizing: border-box;
  `,

  // Textarea style (extends input style)
  TEXTAREA: `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #d1d5db);
    border-radius: 8px;
    font-size: 14px;
    background: var(--bg-primary, #fff);
    color: var(--text-primary, #111);
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
    box-sizing: border-box;
    font-family: inherit;
    resize: vertical;
    min-height: 120px;
  `,

  // Form row (two columns)
  FORM_ROW: 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;',

  // Form row (single column)
  FORM_ROW_FULL: 'display: grid; grid-template-columns: 1fr; gap: 16px;',
};

// ===== INPUT FOCUS HANDLERS (as event attributes) =====
// Note: These should be phased out in favor of CSS classes + addEventListener
// Kept for backward compatibility during refactoring
export const INPUT_FOCUS_HANDLERS = {
  // Applied to inputs for focus styling
  FOCUS: `onfocus="this.style.borderColor='var(--accent-blue,#3b82f6)';this.style.boxShadow='0 0 0 3px rgba(59,130,246,0.1)'" onblur="this.style.borderColor='var(--border-color,#d1d5db)';this.style.boxShadow='none'"`,
};

// ===== PRODUCT UNITS =====
export const PRODUCT_UNITS = [
  'pcs',    // Pieces
  'kg',     // Kilogram
  'g',      // Gram
  'box',    // Box
  'pack',   // Pack
  'dozen',  // Dozen
  'liter',  // Liter
  'ml',     // Milliliter
  'meter',  // Meter
  'cm',     // Centimeter
  'roll',   // Roll
  'set',    // Set
];

// ===== INVOICE/PURCHASE STATUS =====
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  PAID: 'paid',
  CANCELLED: 'cancelled',
};

export const PURCHASE_STATUS = {
  PENDING: 'pending',
  RECEIVED: 'received',
  CANCELLED: 'cancelled',
};

// ===== TRANSACTION TYPES =====
export const TRANSACTION_TYPE = {
  SALE: 'sale',
  PURCHASE: 'purchase',
  PAYMENT_IN: 'payment_in',
  PAYMENT_OUT: 'payment_out',
  ADJUSTMENT: 'adjustment',
};

// ===== STOCK MOVEMENT TYPES =====
export const STOCK_MOVEMENT_TYPE = {
  IN: 'in',       // Stock received (purchase)
  OUT: 'out',     // Stock sold (invoice)
  ADJUSTMENT: 'adjustment', // Manual stock adjustment
};

// ===== VALIDATION PATTERNS =====
export const VALIDATION = {
  // Email regex (basic)
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone regex (basic international format)
  PHONE: /^\+?[\d\s\-()]{7,}$/,

  // SKU/code: alphanumeric + hyphen/underscore
  SKU: /^[A-Za-z0-9_-]+$/,

  // Currency (positive decimal with up to 2 decimal places)
  CURRENCY: /^\d+(\.\d{1,2})?$/,

  // Integer (positive or negative)
  INTEGER: /^-?\d+$/,
};

// ===== TOAST ICONS =====
export const TOAST_ICONS = {
  SUCCESS: '✓',
  ERROR: '✕',
  WARNING: '⚠',
  INFO: 'ℹ',
};
