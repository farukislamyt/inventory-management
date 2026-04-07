// ============================================
// js/utils.js — Utility Functions
// ============================================

// ===== Formatting =====

/**
 * Format a number as currency string with symbol and 2 decimal places.
 * @param {number|string|null|undefined} amount
 * @param {string} symbol - Currency symbol, defaults to '$'
 * @returns {string} e.g. "$1,234.56"
 */
export function formatCurrency(amount, symbol = '$') {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return symbol + '0.00';
  }
  return symbol + Math.abs(Number(amount)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number with commas and no decimal places.
 * @param {number|string} num
 * @returns {string} e.g. "1,234"
 */
export function formatNumber(num) {
  if (num === 0) return '0';
  if (!num && num !== 0) return '0';
  return Number(num).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format a date string to "Jan 15, 2025" format.
 * @param {string|null|undefined} dateStr - ISO string or "YYYY-MM-DD"
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string with time to "Jan 15, 2025, 10:30 AM" format.
 * @param {string|null|undefined} dateStr - ISO string
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string as a relative time description.
 * @param {string|null|undefined} dateStr - ISO string
 * @returns {string} e.g. "2 hours ago", "3 days ago", or fallback to formatDate for > 30 days
 */
export function formatRelativeTime(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'N/A';

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  // Future times
  if (diffMs < 0) {
    const absSec = Math.floor(Math.abs(diffMs) / 1000);
    const absMin = Math.floor(absSec / 60);
    const absHr = Math.floor(absMin / 60);
    if (absMin < 1) return 'just now';
    if (absMin < 60) return `in ${absMin} minute${absMin > 1 ? 's' : ''}`;
    if (absHr < 24) return `in ${absHr} hour${absHr > 1 ? 's' : ''}`;
    return formatDate(dateStr);
  }

  // Past times
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffWeek < 5) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffMonth < 1) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  return formatDate(dateStr);
}

// ===== Status Helpers =====

/**
 * Map a status string to a CSS badge class.
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  if (!status) return 'badge badge-neutral';
  const s = status.toLowerCase().trim();

  const successMap = ['paid', 'received', 'active', 'completed', 'delivered', 'done', 'approved'];
  const warningMap = ['pending', 'draft', 'sent', 'partial', 'processing', 'on_hold', 'in_progress', 'shipped'];
  const dangerMap = ['overdue', 'cancelled', 'failed', 'rejected', 'expired', 'void'];

  if (successMap.includes(s)) return 'badge badge-success';
  if (warningMap.includes(s)) return 'badge badge-warning';
  if (dangerMap.includes(s)) return 'badge badge-danger';

  // Legacy mappings for backward compatibility
  const legacyMap = {
    in: 'badge badge-success',
    out: 'badge badge-danger',
    adjustment: 'badge badge-info',
    sale: 'badge badge-success',
    purchase: 'badge badge-info',
    payment_in: 'badge badge-success',
    payment_out: 'badge badge-warning',
  };

  return legacyMap[s] || 'badge badge-neutral';
}

/**
 * Format a status string for display: capitalize first letter, replace underscores with spaces.
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  if (!status) return '';
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ===== String Helpers =====

/**
 * Get initials from a person's name.
 * @param {string|null|undefined} name
 * @returns {string} e.g. "John Doe" -> "JD", "John" -> "J", null -> "?"
 */
export function getInitials(name) {
  if (!name || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Truncate a string with ellipsis if it exceeds the given length.
 * @param {string|null|undefined} str
 * @param {number} length - Max length before truncation (default 30)
 * @returns {string}
 */
export function truncate(str, length = 30) {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string|null|undefined} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/**
 * Debounce a function call. The returned function has a `cancel()` method.
 * @param {Function} fn
 * @param {number} delay - Delay in ms (default 300)
 * @returns {Function} Debounced function with `.cancel()` method
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  let pendingArgs = null;

  const debounced = function (...args) {
    pendingArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, pendingArgs);
      pendingArgs = null;
    }, delay);
  };

  debounced.cancel = function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      pendingArgs = null;
    }
  };

  return debounced;
}

/**
 * Throttle a function so it fires at most once per limit period.
 * @param {Function} fn
 * @param {number} limit - Minimum ms between calls (default 100)
 * @returns {Function}
 */
export function throttle(fn, limit = 100) {
  let inThrottle = false;
  let lastArgs = null;
  let lastThis = null;

  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        // Call trailing invocation if args were queued
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, limit);
    } else {
      lastArgs = args;
      lastThis = this;
    }
  };
}

// ===== Number Helpers =====

/**
 * Parse a string to a number, stripping non-numeric characters except dot and minus.
 * @param {string|number|null|undefined} str
 * @returns {number}
 */
export function parseNumber(str) {
  if (str === null || str === undefined) return 0;
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  const cleaned = String(str).replace(/[^0-9.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Calculate percentage of value relative to total.
 * @param {number} value
 * @param {number} total
 * @returns {string} e.g. "45.2"
 */
export function calculatePercentage(value, total) {
  if (!total || total === 0 || value === null || value === undefined) return '0.0';
  return ((Number(value) / Number(total)) * 100).toFixed(1);
}

// ===== Date Helpers =====

/**
 * Get today's date as "YYYY-MM-DD".
 * @returns {string}
 */
export function getToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add days to a date string and return a new "YYYY-MM-DD" string.
 * @param {string} dateStr - "YYYY-MM-DD" or ISO string
 * @param {number} days - Number of days to add (negative to subtract)
 * @returns {string} "YYYY-MM-DD"
 */
export function addDays(dateStr, days) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get a date range for the last N months from today.
 * @param {number} months - Number of months to look back (default 6)
 * @returns {{ start: string, end: string }} Both as "YYYY-MM-DD"
 */
export function getDateRange(months = 6) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const pad = (n) => String(n).padStart(2, '0');
  return {
    start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

/**
 * Get the short month name for a given month index (0-11).
 * @param {number} monthIndex - 0 for January, 11 for December
 * @returns {string} e.g. "Jan"
 */
export function getMonthName(monthIndex) {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return months[monthIndex] || '';
}

/**
 * Get an array of all short month names.
 * @returns {string[]}
 */
export function getShortMonthNames() {
  return [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
}

// ===== Validation =====

/**
 * Basic email regex validation.
 * @param {string} email
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

/**
 * Check if a value is not null, undefined, empty string, or whitespace only.
 * @param {*} value
 * @returns {boolean}
 */
export function validateRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Check if a value is a positive number (> 0).
 * @param {*} value
 * @returns {boolean}
 */
export function validatePositiveNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

// ===== Misc =====

/**
 * Generate a consistent HSL color from a string (for avatars, labels, etc.).
 * @param {string} str
 * @returns {{ bg: string, text: string }}
 */
export function generateColorFromString(str) {
  if (!str) return { bg: 'hsl(200, 50%, 50%)', text: 'white' };
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = Math.abs(hash) % 360;
  const saturation = 55 + (Math.abs(hash >> 8) % 20); // 55-74%
  const lightness = 40 + (Math.abs(hash >> 16) % 15); // 40-54%
  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    text: 'white',
  };
}

/**
 * Copy text to the system clipboard.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Create a JSON blob and trigger a file download.
 * @param {*} data - Data to serialize as JSON
 * @param {string} filename - File name for the download
 */
export function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read a File object as text.
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Format a file size in bytes to a human-readable string.
 * @param {number} bytes
 * @returns {string} e.g. "1 KB", "1.5 MB"
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return size.toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

/**
 * Parse the current page's URL query parameters into an object.
 * @returns {Object<string, string>}
 */
export function getQueryParams() {
  const params = {};
  const search = window.location.search.substring(1);
  if (!search) return params;
  search.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value !== undefined ? decodeURIComponent(value) : '';
    }
  });
  return params;
}

// ===== Legacy helpers (kept for backward compatibility) =====

/**
 * Calculate the subtotal of line items.
 * @param {Array<{quantity: number, price: number}>} items
 * @returns {number}
 */
export function calcSubtotal(items) {
  return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

/**
 * Calculate tax amount from subtotal and rate.
 * @param {number} subtotal
 * @param {number} taxRate - percentage, e.g. 10 for 10%
 * @returns {number}
 */
export function calcTax(subtotal, taxRate) {
  return subtotal * (taxRate / 100);
}

/**
 * Generate a unique ID string.
 * @returns {string}
 */
export function uid() {
  return (
    Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  );
}

/**
 * Deep clone a plain object via JSON serialization.
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
