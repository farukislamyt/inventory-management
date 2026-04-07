// ============================================
// js/components/FormBuilder.js — Reusable Form Component
// Eliminates input/form style duplication across pages
// ============================================

import { escapeHtml } from '../utils.js';
import { FORM_STYLES, PRODUCT_UNITS, VALIDATION } from '../constants.js';

/**
 * FormBuilder: Unified form creation with consistent styling and validation
 * Reduces duplication across product.js, customer.js, supplier.js, category.js
 *
 * Usage:
 *   const builder = new FormBuilder();
 *   builder.addInput('name', 'Product Name', { required: true, maxLength: 100 })
 *   builder.addNumber('price', 'Selling Price', { required: true, min: 0 })
 *   builder.addSelect('unit', 'Unit', PRODUCT_UNITS, { required: true })
 *   builder.addTextarea('description', 'Description', { maxLength: 500 })
 *   const html = builder.build();
 */
export class FormBuilder {
  constructor(options = {}) {
    this.fields = [];
    this.groupStyle = options.groupStyle || FORM_STYLES.FORM_ROW;
    this.columnCount = options.columnCount || 2;
  }

  /**
   * Add a text input field
   * @param {string} name - Field name (for form data)
   * @param {string} label - Field label
   * @param {Object} options - { value, required, maxLength, pattern, placeholder, readonly }
   */
  addInput(name, label, options = {}) {
    const { value = '', required = false, maxLength, pattern, placeholder, readonly = false } = options;
    const id = `form-${name}`;
    const escapedName = escapeHtml(name);
    const escapedId = escapeHtml(id);
    const escapedValue = escapeHtml(value);
    const escapedPlaceholder = escapeHtml(placeholder || '');

    let inputHtml = `<input
      type="text"
      id="${escapedId}"
      name="${escapedName}"
      value="${escapedValue}"
      placeholder="${escapedPlaceholder}"
      style="${FORM_STYLES.INPUT}"
      ${required ? 'required' : ''}
      ${maxLength ? `maxlength="${maxLength}"` : ''}
      ${pattern ? `pattern="${escapeHtml(pattern)}"` : ''}
      ${readonly ? 'readonly' : ''}
    />`;

    this.fields.push({
      name,
      label,
      html: this._wrapInGroup(label, inputHtml, id),
    });
    return this;
  }

  /**
   * Add an email input field
   */
  addEmail(name, label, options = {}) {
    const { value = '', required = true, placeholder } = options;
    const id = `form-${name}`;
    const escapedName = escapeHtml(name);
    const escapedId = escapeHtml(id);
    const escapedValue = escapeHtml(value);
    const escapedPlaceholder = escapeHtml(placeholder || '');

    let inputHtml = `<input
      type="email"
      id="${escapedId}"
      name="${escapedName}"
      value="${escapedValue}"
      placeholder="${escapedPlaceholder}"
      style="${FORM_STYLES.INPUT}"
      ${required ? 'required' : ''}
    />`;

    this.fields.push({
      name,
      label,
      html: this._wrapInGroup(label, inputHtml, id),
    });
    return this;
  }

  /**
   * Add a number input field
   */
  addNumber(name, label, options = {}) {
    const { value = '', required = false, min = 0, max, step = '0.01', placeholder } = options;
    const id = `form-${name}`;
    const escapedName = escapeHtml(name);
    const escapedId = escapeHtml(id);
    const escapedValue = escapeHtml(String(value));
    const escapedPlaceholder = escapeHtml(placeholder || '');

    let inputHtml = `<input
      type="number"
      id="${escapedId}"
      name="${escapedName}"
      value="${escapedValue}"
      placeholder="${escapedPlaceholder}"
      style="${FORM_STYLES.INPUT}"
      min="${min}"
      ${max !== undefined ? `max="${max}"` : ''}
      step="${step}"
      ${required ? 'required' : ''}
    />`;

    this.fields.push({
      name,
      label,
      html: this._wrapInGroup(label, inputHtml, id),
    });
    return this;
  }

  /**
   * Add a select (dropdown) field
   */
  addSelect(name, label, options, fieldOptions = {}) {
    const { value = '', required = false } = fieldOptions;
    const id = `form-${name}`;
    const escapedName = escapeHtml(name);
    const escapedId = escapeHtml(id);

    let selectHtml = `<select
      id="${escapedId}"
      name="${escapedName}"
      style="${FORM_STYLES.INPUT}"
      ${required ? 'required' : ''}
    >
      <option value="">-- Select ${escapeHtml(label)} --</option>`;

    options.forEach(opt => {
      const optVal = typeof opt === 'string' ? opt : opt.value;
      const optLabel = typeof opt === 'string' ? opt : opt.label;
      const isSelected = optVal === value ? 'selected' : '';
      selectHtml += `<option value="${escapeHtml(optVal)}" ${isSelected}>${escapeHtml(optLabel)}</option>`;
    });

    selectHtml += `</select>`;

    this.fields.push({
      name,
      label,
      html: this._wrapInGroup(label, selectHtml, id),
    });
    return this;
  }

  /**
   * Add a textarea field
   */
  addTextarea(name, label, options = {}) {
    const { value = '', required = false, maxLength, placeholder } = options;
    const id = `form-${name}`;
    const escapedName = escapeHtml(name);
    const escapedId = escapeHtml(id);
    const escapedValue = escapeHtml(value);
    const escapedPlaceholder = escapeHtml(placeholder || '');

    let textareaHtml = `<textarea
      id="${escapedId}"
      name="${escapedName}"
      placeholder="${escapedPlaceholder}"
      style="${FORM_STYLES.TEXTAREA}"
      ${required ? 'required' : ''}
      ${maxLength ? `maxlength="${maxLength}"` : ''}
    >${escapedValue}</textarea>`;

    this.fields.push({
      name,
      label,
      html: this._wrapInGroup(label, textareaHtml, id),
    });
    return this;
  }

  /**
   * Add a hidden input field
   */
  addHidden(name, value = '') {
    const escapedName = escapeHtml(name);
    const escapedValue = escapeHtml(String(value));

    const html = `<input type="hidden" name="${escapedName}" value="${escapedValue}" />`;
    this.fields.push({ name, label: '', html, isHidden: true });
    return this;
  }

  /**
   * Set form layout: 'row' (2-col), 'full' (1-col), or custom grid string
   */
  setLayout(layout) {
    if (layout === 'row') {
      this.groupStyle = FORM_STYLES.FORM_ROW;
    } else if (layout === 'full') {
      this.groupStyle = FORM_STYLES.FORM_ROW_FULL;
    } else {
      this.groupStyle = layout;
    }
    return this;
  }

  /**
   * Build and return the form HTML string
   */
  build() {
    const visibleFields = this.fields.filter(f => !f.isHidden);
    const hiddenFields = this.fields.filter(f => f.isHidden);

    const hiddenHtml = hiddenFields.map(f => f.html).join('');

    // Group fields into rows based on style
    const rowHtml = visibleFields.map(f => f.html).join('');

    return `${hiddenHtml}${rowHtml}`;
  }

  /**
   * Wrap field HTML in form group with label (internal helper)
   */
  _wrapInGroup(label, inputHtml, id) {
    const escapedLabel = escapeHtml(label);
    const escapedId = escapeHtml(id);

    return `<div class="form-group" style="${FORM_STYLES.FORM_ROW_FULL}">
      <label for="${escapedId}" style="display:block;margin-bottom:6px;font-size:13px;font-weight:600;color:var(--text-primary,#374151);">
        ${escapedLabel}
      </label>
      ${inputHtml}
    </div>`;
  }

  /**
   * Get field count
   */
  getFieldCount() {
    return this.fields.length;
  }

  /**
   * Reset all field values
   */
  reset() {
    this.fields = [];
    return this;
  }
}

/**
 * Parse form element data into object
 * Replaces the need to manually call getFormData on form element
 */
export function parseFormData(formElement) {
  if (!formElement) return {};
  const data = {};
  const elements = formElement.querySelectorAll('input, select, textarea');
  elements.forEach(el => {
    if (el.name) {
      if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    }
  });
  return data;
}

/**
 * Validate form data against a schema
 * @param {Object} data - Form data to validate
 * @param {Object} schema - Validation schema { fieldName: [rules...] }
 * @returns {Object} { valid: boolean, errors: { fieldName: [messages...] } }
 */
export function validateFormData(data, schema) {
  const errors = {};

  for (const [fieldName, validators] of Object.entries(schema)) {
    const value = data[fieldName];
    const fieldErrors = [];

    if (Array.isArray(validators)) {
      for (const validator of validators) {
        const result = validator(value);
        if (!result.valid) {
          fieldErrors.push(result.message);
        }
      }
    }

    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validator helper: required field
 */
export const required = (message = 'This field is required') => (value) => ({
  valid: value !== null && value !== undefined && value !== '',
  message,
});

/**
 * Validator helper: email format
 */
export const email = (message = 'Invalid email format') => (value) => ({
  valid: !value || VALIDATION.EMAIL.test(value),
  message,
});

/**
 * Validator helper: minimum length
 */
export const minLength = (length, message = `Minimum ${length} characters required`) => (value) => ({
  valid: !value || value.length >= length,
  message,
});

/**
 * Validator helper: maximum length
 */
export const maxLength = (length, message = `Maximum ${length} characters allowed`) => (value) => ({
  valid: !value || value.length <= length,
  message,
});

/**
 * Validator helper: minimum number
 */
export const min = (num, message = `Minimum value is ${num}`) => (value) => ({
  valid: !value || parseFloat(value) >= num,
  message,
});

/**
 * Validator helper: unique value in array
 */
export const unique = (existingValues, message = 'This value already exists') => (value) => ({
  valid: !value || !existingValues.includes(value),
  message,
});

/**
 * Validator helper: pattern match
 */
export const pattern = (regex, message = 'Invalid format') => (value) => ({
  valid: !value || regex.test(value),
  message,
});
