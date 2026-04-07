// ============================================
// js/sanitization.js — XSS Protection & HTML Sanitization
// Prevents injection attacks and unsafe HTML
// ============================================

/**
 * Map of HTML entities for escaping
 */
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/**
 * Escape HTML special characters (safe for text content)
 * Use this for user-generated text that will be displayed in HTML
 *
 * @param {string|null|undefined} str - String to escape
 * @returns {string} Escaped string safe for HTML context
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'\/]/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Escape HTML attributes (additional restrictions for attribute context)
 * @param {string} str
 * @returns {string}
 */
export function escapeHtmlAttr(str) {
  return escapeHtml(str).replace(/\//g, '&#x2F;');
}

/**
 * Escape JavaScript string literals (for event handlers)
 * @param {string} str
 * @returns {string}
 */
export function escapeJs(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\') // Backslash
    .replace(/"/g, '\\"') // Double quote
    .replace(/'/g, "\\'") // Single quote
    .replace(/\n/g, '\\n') // Newline
    .replace(/\r/g, '\\r') // Carriage return
    .replace(/\t/g, '\\t') // Tab
    .replace(/\//g, '\\/'); // Forward slash
}

/**
 * Escape CSS string values
 * @param {string} str
 * @returns {string}
 */
export function escapeCss(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\//g, '\\/');
}

/**
 * Create safe HTML by escaping content within structure
 * Useful for building HTML strings with user data
 *
 * @param {string} template - HTML template with {placeholders}
 * @param {Object} data - Object with values to interpolate
 * @returns {string} Safe HTML with escaped values
 *
 * Example:
 *   safeHtml('<div id="name">{name}</div>', { name: user.name })
 */
export function safeHtml(template, data = {}) {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(escapeJs(placeholder), 'g'), escapeHtml(value));
  }
  return result;
}

/**
 * Sanitize user input for text content
 * Removes suspicious characters and excessive whitespace
 *
 * @param {string} input - User input
 * @param {Object} options
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, options = {}) {
  const { maxLength = 1000, trim = true, lowercase = false, uppercase = false, alphanumericOnly = false } = options;

  let result = String(input || '');

  // Remove null bytes
  result = result.replace(/\0/g, '');

  // Trim whitespace
  if (trim) {
    result = result.trim();
  }

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ');

  // Remove control characters (except newlines and tabs)
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Alphanumeric only if requested
  if (alphanumericOnly) {
    result = result.replace(/[^a-zA-Z0-9\s]/g, '');
  }

  // Apply case transformation
  if (lowercase) {
    result = result.toLowerCase();
  } else if (uppercase) {
    result = result.toUpperCase();
  }

  // Truncate
  if (result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}

/**
 * Sanitize email addresses
 * @param {string} email
 * @returns {string}
 */
export function sanitizeEmail(email) {
  // Basic email sanitization: lowercase, trim, remove spaces
  return String(email).toLowerCase().trim().replace(/\s/g, '');
}

/**
 * Sanitize URL (whitelist safe protocols)
 * @param {string} url
 * @returns {string|null} Null if unsafe
 */
export function sanitizeUrl(url) {
  if (!url) return null;

  try {
    const urlObj = new URL(url, window.location.origin);
    // Only allow http, https, and relative URLs
    if (['http:', 'https:'].includes(urlObj.protocol)) {
      return urlObj.toString();
    }
  } catch (e) {
    // Not a valid URL, try relative URL
    if (url.startsWith('/') || url.startsWith('.')) {
      // Relative URL - ensure no javascript: or data: protocols by checking original string
      if (!url.includes(':')) {
        return url;
      }
    }
  }

  return null;
}

/**
 * Remove HTML tags and entities (for plain text display)
 * @param {string} html
 * @returns {string}
 */
export function stripHtmlTags(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Detect if string contains potential XSS payload
 * WARNING: Not foolproof - use escapeHtml as primary defense
 * @param {string} str
 * @returns {boolean}
 */
export function containsSuspiciousContent(str) {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers (onclick=, onload=, etc)
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /vbscript:/i,
    /data:text\/html/i,
  ];

  return suspiciousPatterns.some(pattern => pattern.test(String(str)));
}

/**
 * Create safe attribute value
 * Use for HTML attributes that might contain user data
 *
 * @param {string} attrName - Attribute name (e.g., 'title', 'placeholder')
 * @param {any} value - Value to set
 * @returns {string} Safe attribute string
 *
 * Example:
 *   `<input ${safeAttr('placeholder', userInput)} />`
 */
export function safeAttr(attrName, value) {
  return `${escapeHtml(attrName)}="${escapeHtml(value)}"`;
}

/**
 * Create safe style string (for inline styles with user data)
 * @param {string} styleProp - CSS property name
 * @param {string} styleValue - CSS property value
 * @returns {string} Safe style attribute
 *
 * Example:
 *   `style="${safeStyle('color', userColor)}"`
 */
export function safeStyle(styleProp, styleValue) {
  // Only allow safe CSS properties
  const safeProps = [
    'color',
    'background-color',
    'width',
    'height',
    'margin',
    'padding',
    'border-radius',
    'font-size',
    'font-weight',
    'text-align',
  ];

  if (!safeProps.includes(styleProp.toLowerCase())) {
    return '';
  }

  // Escape the value to prevent injection
  const escaped = escapeCss(styleValue);
  return `${escapeCss(styleProp)}:${escaped};`;
}

/**
 * Content Security Policy helper
 * Returns inline CSP attributes for use in HTML
 */
export const CSP_NONCE = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

/**
 * Safe data URI generator (for embedded images)
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} Data URL
 */
export function createSafeDataUri(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      // Validate it's an image data URL
      if (dataUrl.startsWith('data:image/')) {
        resolve(dataUrl);
      }
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Batch escape object values for display
 * @param {Object} obj
 * @returns {Object}
 */
export function escapeObjectValues(obj) {
  const escaped = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      escaped[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      escaped[key] = escapeObjectValues(value);
    } else {
      escaped[key] = value;
    }
  }
  return escaped;
}

/**
 * Report potential security issue to console (dev only)
 */
export function reportSecurityIssue(type, context) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[SECURITY] ${type}`, context);
  }
}
