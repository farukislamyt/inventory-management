# Refactoring Guide: Using New Abstractions

This guide shows how to refactor page files to use the new reusable components and reduce code duplication by ~40%.

## Overview of New Components

1. **FormBuilder.js** - Build forms programmatically
2. **LineItemBuilder.js** - Manage invoice/purchase line items
3. **CRUDManager.js** - Handle list, add, edit, delete operations
4. **constants.js** - Centralized configuration
5. **validation.js** - Input validation framework
6. **error-handling.js** - Robust error management
7. **sanitization.js** - XSS protection

---

## Phase 1: Use Constants (Easy - Drop-in Replacement)

### Before:
```javascript
const inputStyle = `width: 100%; padding: 8px 12px; border: ...`;
const inputFocusStyle = `onfocus="this.style..." onblur="..."`
const formRowStyle = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;';

const CATEGORY_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  // ... 7 more
];

const UNITS = ['pcs', 'kg', 'g', ...];
const PAGE_SIZE = 10;
```

### After:
```javascript
import { FORM_STYLES, COLORS, PRODUCT_UNITS, CONFIG, EVENTS } from '../constants.js';

// Use directly:
FORM_STYLES.INPUT
FORM_STYLES.FORM_ROW
COLORS.CATEGORY[0]
PRODUCT_UNITS
CONFIG.PAGE_SIZE
EVENTS.PRODUCTS_CHANGED
```

**Changes per file:**
- Replace hardcoded style strings → use `FORM_STYLES`
- Replace duplicate color arrays → use `COLORS`
- Replace hardcoded event names → use `EVENTS`
- Replace hardcoded values → use `CONFIG`

**Files to update:**
- `product.js` - Input styles, units, events
- `customer.js` - Input styles, events
- `supplier.js` - Input styles, events
- `category.js` - Input styles, colors, events
- `invoice.js` - Event names
- `purchase.js` - Event names

---

## Phase 2: Use FormBuilder (Medium - Pattern Change)

### Before (product.js likes):
```javascript
const category Options = categories.map(c =>
  `<option value="${escapeHtml(c.id)}" ...>${escapeHtml(c.name)}</option>`
).join('');

const content = `
  <form id="product-form" style="display: flex; flex-direction: column; gap: 16px;">
    ${createFormGroup('Product Name *',
      `<input type="text" name="name" value="${escapeHtml(product ? product.name : '')}"
        required placeholder="e.g. Wireless Mouse" style="${inputStyle}" ${inputFocusStyle} />`,
      'product-name')}
    ${createFormGroup('SKU',
      `<input type="text" name="sku" value="${escapeHtml(product ? product.sku || '' : '')}"
        placeholder="e.g. WM-001" style="${inputStyle}" ${inputFocusStyle} />`,
      'product-sku')}
    ...
  </form>
`;
```

### After:
```javascript
import { FormBuilder } from '../components/FormBuilder.js';

const builder = new FormBuilder();
builder
  .addInput('name', 'Product Name', {
    value: product?.name || '',
    required: true,
    placeholder: 'e.g. Wireless Mouse',
    maxLength: 100
  })
  .addInput('sku', 'SKU', {
    value: product?.sku || '',
    placeholder: 'e.g. WM-001',
    pattern: '^[A-Za-z0-9_-]+$'
  })
  .addSelect('categoryId', 'Category',
    categories.map(c => ({ value: c.id, label: c.name })),
    { value: product?.categoryId || '' }
  )
  .setLayout('full');

const content = `<form id="product-form">${builder.build()}</form>`;
```

**Benefits:**
- No inline HTML string concatenation
- Built-in escaping for security
- Consistent styling across all forms
- Easier to add validation rules later
- Reusable validation patterns

**Files to update:**
- `product.js` - `openProductModal()`
- `customer.js` - `openCustomerModal()`
- `supplier.js` - `openSupplierModal()`
- `category.js` - `openCategoryModal()`

---

## Phase 3: Add Validation (Medium - Error Handling)

### Before:
```javascript
if (!name) {
  showError('Product name is required');
  return;
}
if (Number(formData.costPrice) < 0) {
  showError('Cost price must be 0 or greater');
  return;
}
// ... scattered validation throughout
```

### After:
```javascript
import { validateProduct } from '../validation.js';
import { getFirstError } from '../validation.js';

const result = validateProduct(formData, store.getProducts());
if (!result.valid) {
  showError(getFirstError(result.errors));
  return;
}
```

**Benefits:**
- Validation logic in one place per entity
- Prevents duplicate validation code
- Consistent error messages
- Easy to update validation rules

**Files to update:**
- `product.js` - Add `validateProduct()` call
- `customer.js` - Add `validateCustomer()` call
- `supplier.js` - Add `validateSupplier()` call
- `category.js` - Add `validateCategory()` call
- `invoice.js` - Add `validateInvoice()` call
- `purchase.js` - Add `validatePurchase()` call

---

## Phase 4: Use LineItemBuilder (Medium - Complex Logic)

### Before (invoice.js):
```javascript
let _lineItems = [];

function buildLineItemRow(item, idx) {
  const products = store.getProducts() || [];
  const productOptions = products.map(p =>
    `<option value="${escapeHtml(p.id)}" ${item.productId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  const rowTotal = (item.quantity || 0) * (item.price || 0);
  return `
    <div class="invoice-line-row" data-idx="${idx}" style="...${idx}...">
      ...
    </div>`;
}

function refreshLineItemsUI(modalEl) {
  const listEl = modalEl.querySelector('#inv-line-items-list');
  listEl.innerHTML = _lineItems.map((li, i) => buildLineItemRow(li, i)).join('');
  attachLineItemListeners(modalEl);
}

function attachLineItemListeners(modalEl) {
  modalEl.querySelectorAll('.inv-line-product').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      // ... update _lineItems
      refreshLineItemsUI(modalEl);
    });
  });
}
```

### After:
```javascript
import { LineItemBuilder } from '../components/LineItemBuilder.js';

const lineItemBuilder = new LineItemBuilder({ type: 'invoice' });

// Add items
lineItemBuilder.addItem({ productId: '123', quantity: 5, price: 99.99 });

// Render and attach listeners
lineItemBuilder.render(modalEl);

// Get data for save
const items = lineItemBuilder.getItems();
const totals = lineItemBuilder.getTotals();
```

**Benefits:**
- Eliminates ~50 lines of item management code
- Shared between invoices and purchases
- Automatic event listener management
- Built-in total calculations

**Files to update:**
- `invoice.js` - Replace module-level `_lineItems` with `LineItemBuilder`
- `purchase.js` - Same as invoice

---

## Phase 5: Use CRUDManager (Advanced - Full Page Refactor)

### Before (product.js - 350+ lines):
```javascript
export function renderProduct(container) {
  const unsubscribers = [];
  unsubscribers.push(store.subscribe('products:changed', () => render(container)));

  function render(container) {
    const products = store.getProducts();
    const categories = store.getCategories();
    // ... 300+ lines of render logic, modal, table, buttons, etc
  }

  render(container);
  return () => unsubscribers.forEach(fn => fn());
}
```

### After (product.js - ~50 lines):
```javascript
import { CRUDManager } from '../components/CRUDManager.js';
import { validateProduct } from '../validation.js';

export function renderProduct(container) {
  const manager = new CRUDManager({
    entityName: 'product',
    entityNamePlural: 'products',
    icon: '📦',
    description: 'Manage your product inventory',

    storeMethods: {
      add: store.addProduct,
      update: store.updateProduct,
      delete: store.deleteProduct,
      getAll: store.getProducts,
      getById: store.getProductById,
    },

    fields: [
      { name: 'name', label: 'Product Name', type: 'text', required: true, maxLength: 100 },
      { name: 'sku', label: 'SKU', type: 'text' },
      { name: 'categoryId', label: 'Category', type: 'select', options: () => store.getCategories().map(c => ({ value: c.id, label: c.name })) },
      { name: 'costPrice', label: 'Cost Price', type: 'number', min: 0, step: '0.01' },
      { name: 'sellingPrice', label: 'Selling Price', type: 'number', min: 0, step: '0.01' },
      { name: 'quantity', label: 'Quantity', type: 'number', min: 0 },
      { name: 'unit', label: 'Unit', type: 'select', options: PRODUCT_UNITS },
      { name: 'lowStockThreshold', label: 'Low Stock Threshold', type: 'number', min: 0 },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],

    columns: [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'sku', label: 'SKU', sortable: true },
      { key: '_categoryName', label: 'Category', sortable: true },
      { key: 'sellingPrice', label: 'Price', render: (v) => formatCurrency(v, '$') },
      { key: 'quantity', label: 'Stock', sortable: true },
    ],

    stats: [
      { title: 'Total Products', compute: (all) => all.length, icon: '📦', color: 'blue' },
      { title: 'Inventory Value', compute: (all) => formatCurrency(all.reduce((s, p) => s + (p.quantity * p.costPrice), 0), '$'), icon: '💰', color: 'green' },
      { title: 'Low Stock', compute: (all) => all.filter(p => p.quantity <= 10).length, icon: '⚠️', color: 'amber' },
    ],

    onValidate: (formData, product) => {
      const result = validateProduct(formData, store.getProducts());
      if (!result.valid) {
        return result.errors[0].message;
      }
      return null;
    },

    transformData: (product) => ({
      ...product,
      _categoryName: store.getCategoryById(product.categoryId)?.name || '—',
    }),
  });

  return manager.render(container, EVENTS.PRODUCTS_CHANGED);
}
```

**Benefits:**
- **300+ lines reduced to 50 lines**
- No event handling boilerplate
- No modal building code
- Auto-wired add/edit/delete buttons
- Consistent CRUD UX across all pages
- Easier to maintain and test

**Files to update (Priority Order):**
1. `category.js` - Simplest entity, good first test
2. `product.js` - Medium complexity
3. `customer.js` - Medium complexity
4. `supplier.js` - Medium complexity (same as customer)
5. `invoice.js` - High complexity (needs LineItemBuilder too)
6. `purchase.js` - High complexity (needs LineItemBuilder too)

---

## Implementation Checklist

### For each page file:

- [ ] Phase 1: Import and use `constants.js`
  - [ ] Replace input styles with `FORM_STYLES`
  - [ ] Replace color arrays with `COLORS`
  - [ ] Replace event name strings with `EVENTS`
  - [ ] Replace hardcoded values with `CONFIG`

- [ ] Phase 2: Switch to `FormBuilder`
  - [ ] Replace `createFormGroup()` calls with `FormBuilder`
  - [ ] Remove hardcoded input HTML strings
  - [ ] Add field configuration objects

- [ ] Phase 3: Add validation
  - [ ] Import validation function for entity
  - [ ] Add validation call before save
  - [ ] Handle validation errors

- [ ] Phase 4: Use `LineItemBuilder` (invoices/purchases only)
  - [ ] Replace `_lineItems` array with `LineItemBuilder` instance
  - [ ] Replace `buildLineItemRow()` with builder method
  - [ ] Remove `attachLineItemListeners()` code

- [ ] Phase 5: Use `CRUDManager` (if applicable)
  - [ ] Create manager instance with config
  - [ ] Pass entity methods
  - [ ] Define fields, columns, stats
  - [ ] Call `manager.render()`

---

## Testing After Refactoring

1. **Manually test each page:**
   - Add new entity
   - Edit existing entity
   - Delete entity (with confirmation)
   - Search/filter operations
   - Form validation

2. **Check console for errors**
   - No JavaScript errors
   - No escaped HTML showing raw code

3. **Verify data persistence**
   - Refresh page, data still there
   - localStorage correctly updated

4. **Performance check**
   - Page renders quickly
   - No lag when adding/editing
   - Modals open smoothly

---

## Common Issues & Solutions

### Issue: Form not showing
**Solution:** Make sure `builder.build()` is called and included in modal content

### Issue: Validation not working
**Solution:** Import the correct validation function and check field names match form names

### Issue: Module circular dependency
**Solution:** Import from `components/index.js` instead of individual files

### Issue: Event listeners not firing
**Solution:** Make sure `attachListeners()` is called after render

---

## Questions?

Check the source files for examples:
- `components/FormBuilder.js` - Form building patterns
- `components/LineItemBuilder.js` - Line item management
- `components/CRUDManager.js` - Full CRUD workflow
- `validation.js` - Validation examples

