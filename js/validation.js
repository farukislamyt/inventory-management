// ============================================
// js/validation.js — Input Validation Framework
// Centralized validation for all forms
// ============================================

import store from './store.js';
import { VALIDATION } from './constants.js';

/**
 * Validation result object
 */
class ValidationError {
  constructor(field, message) {
    this.field = field;
    this.message = message;
  }
}

/**
 * Validate product data
 */
export function validateProduct(data, existingProducts = null) {
  const errors = [];

  // Name: required, 2-100 chars
  if (!data.name || !data.name.trim()) {
    errors.push(new ValidationError('name', 'Product name is required'));
  } else if (data.name.trim().length < 2) {
    errors.push(new ValidationError('name', 'Product name must be at least 2 characters'));
  } else if (data.name.length > 100) {
    errors.push(new ValidationError('name', 'Product name must not exceed 100 characters'));
  }

  // SKU: optional, but if provided must be unique and alphanumeric+hyphen/underscore
  if (data.sku) {
    if (!VALIDATION.SKU.test(data.sku)) {
      errors.push(new ValidationError('sku', 'SKU can only contain letters, numbers, hyphens, and underscores'));
    }
    // Check uniqueness (excluding this product if we're editing)
    const products = existingProducts || store.getProducts();
    const isDuplicate = products.some(p => p.sku === data.sku && p.id !== data.id);
    if (isDuplicate) {
      errors.push(new ValidationError('sku', `SKU '${data.sku}' is already in use`));
    }
  }

  // Category: optional
  // Quantity: required, integer >= 0
  const qty = parseFloat(data.quantity);
  if (isNaN(qty) || qty < 0) {
    errors.push(new ValidationError('quantity', 'Quantity must be a positive number'));
  }
  if (!Number.isInteger(qty)) {
    errors.push(new ValidationError('quantity', 'Quantity must be a whole number'));
  }

  // Cost Price: optional, but if provided >= 0
  if (data.costPrice !== '' && data.costPrice !== null && data.costPrice !== undefined) {
    const cost = parseFloat(data.costPrice);
    if (isNaN(cost) || cost < 0) {
      errors.push(new ValidationError('costPrice', 'Cost price must be 0 or greater'));
    }
  }

  // Selling Price: optional, but if provided >= 0
  if (data.sellingPrice !== '' && data.sellingPrice !== null && data.sellingPrice !== undefined) {
    const price = parseFloat(data.sellingPrice);
    if (isNaN(price) || price < 0) {
      errors.push(new ValidationError('sellingPrice', 'Selling price must be 0 or greater'));
    }
  }

  // Low Stock Threshold: optional, integer >= 0
  if (data.lowStockThreshold !== '' && data.lowStockThreshold !== null && data.lowStockThreshold !== undefined) {
    const threshold = parseFloat(data.lowStockThreshold);
    if (isNaN(threshold) || threshold < 0) {
      errors.push(new ValidationError('lowStockThreshold', 'Threshold must be 0 or greater'));
    }
    if (!Number.isInteger(threshold)) {
      errors.push(new ValidationError('lowStockThreshold', 'Threshold must be a whole number'));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate customer data
 */
export function validateCustomer(data, existingCustomers = null) {
  const errors = [];

  // Name: required, 2-100 chars
  if (!data.name || !data.name.trim()) {
    errors.push(new ValidationError('name', 'Customer name is required'));
  } else if (data.name.trim().length < 2) {
    errors.push(new ValidationError('name', 'Customer name must be at least 2 characters'));
  } else if (data.name.length > 100) {
    errors.push(new ValidationError('name', 'Customer name must not exceed 100 characters'));
  }

  // Email: optional, but if provided must be valid
  if (data.email && data.email.trim()) {
    if (!VALIDATION.EMAIL.test(data.email)) {
      errors.push(new ValidationError('email', 'Invalid email format'));
    }
  }

  // Phone: optional, basic validation if provided
  if (data.phone && data.phone.trim()) {
    if (!VALIDATION.PHONE.test(data.phone)) {
      errors.push(new ValidationError('phone', 'Invalid phone format'));
    }
  }

  // Balance: optional, non-negative
  if (data.balance !== '' && data.balance !== null && data.balance !== undefined) {
    const balance = parseFloat(data.balance);
    if (isNaN(balance) || balance < 0) {
      errors.push(new ValidationError('balance', 'Balance must be 0 or greater'));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate supplier data (same as customer)
 */
export function validateSupplier(data, existingSuppliers = null) {
  return validateCustomer(data, existingSuppliers);
}

/**
 * Validate category data
 */
export function validateCategory(data, existingCategories = null) {
  const errors = [];

  // Name: required, 2-100 chars
  if (!data.name || !data.name.trim()) {
    errors.push(new ValidationError('name', 'Category name is required'));
  } else if (data.name.trim().length < 2) {
    errors.push(new ValidationError('name', 'Category name must be at least 2 characters'));
  } else if (data.name.length > 100) {
    errors.push(new ValidationError('name', 'Category name must not exceed 100 characters'));
  }

  // Description: optional, max 500 chars
  if (data.description && data.description.length > 500) {
    errors.push(new ValidationError('description', 'Description must not exceed 500 characters'));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate invoice data before saving
 */
export function validateInvoice(data) {
  const errors = [];

  // Customer: required
  if (!data.customerId && !data.customerName) {
    errors.push(new ValidationError('customer', 'Customer is required'));
  }

  // Items: required and non-empty
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push(new ValidationError('items', 'At least one line item is required'));
  } else {
    // Validate each item
    data.items.forEach((item, idx) => {
      if (!item.productId) {
        errors.push(new ValidationError(`item-${idx}-product`, 'Product is required'));
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(new ValidationError(`item-${idx}-quantity`, 'Quantity must be greater than 0'));
      }
      if (!item.price || item.price < 0) {
        errors.push(new ValidationError(`item-${idx}-price`, 'Price must be 0 or greater'));
      }

      // Check stock availability (if product exists)
      const product = store.getProductById(item.productId);
      if (product && product.quantity < item.quantity) {
        errors.push(
          new ValidationError(
            `item-${idx}-stock`,
            `Insufficient stock for ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`
          )
        );
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate purchase data before saving
 */
export function validatePurchase(data) {
  const errors = [];

  // Supplier: required
  if (!data.supplierId && !data.supplierName) {
    errors.push(new ValidationError('supplier', 'Supplier is required'));
  }

  // Items: required and non-empty
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push(new ValidationError('items', 'At least one line item is required'));
  } else {
    // Validate each item
    data.items.forEach((item, idx) => {
      if (!item.productId) {
        errors.push(new ValidationError(`item-${idx}-product`, 'Product is required'));
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(new ValidationError(`item-${idx}-quantity`, 'Quantity must be greater than 0'));
      }
      if (!item.costPrice || item.costPrice < 0) {
        errors.push(new ValidationError(`item-${idx}-costPrice`, 'Cost price must be 0 or greater'));
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map(err => `${err.field}: ${err.message}`).join('\n');
  }
  return 'Validation failed';
}

/**
 * Get first error message (for showing in a single toast)
 */
export function getFirstError(errors) {
  if (Array.isArray(errors) && errors.length > 0) {
    const err = errors[0];
    return err.message || 'Validation error';
  }
  return 'Unknown error';
}
