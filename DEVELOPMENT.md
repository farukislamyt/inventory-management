# Development Guide - SuFa Inventory System

## Quick Start

### Project Structure
```
inventory-system/
├── index.html                 # Main entry point
├── css/
│   └── styles.css             # Global styles
├── js/
│   ├── app.js                 # Application router
│   ├── store.js               # Data store (singleton)
│   ├── utils.js               # Utility functions
│   ├── components.js          # Legacy components (to refactor)
│   ├── constants.js           # Config values, event names, colors
│   ├── validation.js          # Input validation rules
│   ├── error-handling.js      # Error management
│   ├── sanitization.js        # XSS protection
│   ├── components/
│   │   ├── index.js           # Component exports
│   │   ├── FormBuilder.js     # Form creation
│   │   ├── LineItemBuilder.js # Invoice/purchase items
│   │   └── CRUDManager.js     # Generic CRUD handler
│   └── pages/
│       ├── dashboard.js
│       ├── product.js
│       ├── customer.js
│       ├── supplier.js
│       ├── category.js
│       ├── invoice.js
│       ├── purchase.js
│       ├── stock.js
│       ├── accounting.js
│       ├── report.js
│       └── settings.js
├── __tests__/
│   ├── test-utils.js          # Testing utilities
│   └── validation.test.js     # Example tests
├── IMPROVEMENTS.md            # Technical improvements summary
├── REFACTORING.md            # Migration guide
└── DEVELOPMENT.md            # This file
```

---

## Key Components & Patterns

### 1. Constants | `js/constants.js`
Centralized configuration to prevent duplication and typos.

**Use for:**
- Event names (prevents silent failures from typos)
- Color palettes
- Configuration values (page size, debounce times)
- Validation patterns
- Status enums

**Example:**
```javascript
import { EVENTS, COLORS, CONFIG } from '../constants.js';

store.subscribe(EVENTS.PRODUCTS_CHANGED, () => {...});
```

### 2. FormBuilder | `js/components/FormBuilder.js`
Fluent API for building forms programmatically.

**Use for:**
- Creating add/edit modals
- Consistent form styling
- Built-in escaping for XSS protection

**Example:**
```javascript
import { FormBuilder } from '../components/FormBuilder.js';

const builder = new FormBuilder();
builder
  .addInput('name', 'Product Name', { required: true, maxLength: 100 })
  .addNumber('price', 'Price', { min: 0, step: '0.01' })
  .addSelect('category', 'Category', categoryList)
  .setLayout('row');

const formHtml = builder.build();
```

### 3. LineItemBuilder | `js/components/LineItemBuilder.js`
Unified management of invoice and purchase line items.

**Use for:**
- Building invoice line item UIs
- Building purchase order line item UIs
- Managing line item changes

**Example:**
```javascript
import { LineItemBuilder } from '../components/LineItemBuilder.js';

const builder = new LineItemBuilder({ type: 'invoice' });
builder.addItem({ productId, quantity, price });
builder.render(containerElement);

const items = builder.getItems();
const totals = builder.getTotals();
```

### 4. CRUDManager | `js/components/CRUDManager.js`
Generic manager for list, add, edit, delete operations.

**Use for:**
- Product management
- Customer management
- Supplier management
- Category management
- Anything with CRUD operations

**Example:**
```javascript
import { CRUDManager } from '../components/CRUDManager.js';
import { validateProduct } from '../validation.js';

const manager = new CRUDManager({
  entityName: 'product',
  icon: '📦',
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'price', label: 'Price', type: 'number', min: 0 },
  ],
  columns: [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'price', label: 'Price', render: (v) => `$${v}` },
  ],
  storeMethods: {
    add: store.addProduct,
    update: store.updateProduct,
    delete: store.deleteProduct,
    getAll: store.getProducts,
  },
  onValidate: (formData) => {
    const result = validateProduct(formData);
    return result.valid ? null : result.errors[0].message;
  },
});

manager.render(container);
```

### 5. Validation | `js/validation.js`
Input validation framework with entity-specific validators.

**Available validators:**
- `validateProduct()` - Name, SKU uniqueness, prices, quantity
- `validateCustomer()` - Name, email, phone format
- `validateSupplier()` - Same as customer
- `validateCategory()` - Name, description
- `validateInvoice()` - Customer, items, stock availability
- `validatePurchase()` - Supplier, items

**Example:**
```javascript
import { validateProduct, getFirstError } from '../validation.js';
import { showError } from '../components.js';

const result = validateProduct(formData);
if (!result.valid) {
  showError(getFirstError(result.errors));
  return;
}
// Save to store...
```

### 6. Error Handling | `js/error-handling.js`
Robust error management with logging and recovery.

**Use for:**
- Catching and logging errors
- Safe localStorage operations
- Data integrity checks
- User-friendly error messages

**Example:**
```javascript
import { SafeStorage, AppError, errorLogger } from '../error-handling.js';

// Safe storage operations
const data = SafeStorage.getJSON('key', defaultValue);
const success = SafeStorage.setJSON('key', data);

if (!success) {
  errorLogger.log(
    new AppError('Failed to save data'),
    'Could not save. Try again.'
  );
}
```

### 7. Sanitization | `js/sanitization.js`
XSS protection with context-aware escaping.

**Functions:**
- `escapeHtml()` - For HTML content
- `escapeHtmlAttr()` - For HTML attributes
- `escapeJs()` - For JavaScript strings
- `escapeCss()` - For CSS values
- `sanitizeInput()` - Clean user input
- `sanitizeUrl()` - Validate URLs

**Example:**
```javascript
import { escapeHtml, sanitizeInput } from '../sanitization.js';

// Safe HTML creation
const userContent = escapeHtml(userData.name);
const html = `<div>${userContent}</div>`;

// Input cleaning
const cleanEmail = sanitizeInput(userInput, { lowercase: true });
```

---

## Common Workflows

### Creating a New Entity Page

Use CRUDManager for fast implementation:

1. **Define your entity's store methods**
```javascript
// In store.js
addWidget(data) { ... }
updateWidget(id, data) { ... }
deleteWidget(id) { ... }
getWidgets() { ... }
getWidgetById(id) { ... }
```

2. **Create validation rules**
```javascript
// In validation.js
export function validateWidget(data) {
  const errors = [];
  if (!data.name) errors.push(new ValidationError('name', 'Name required'));
  // ... more validation
  return { valid: errors.length === 0, errors };
}
```

3. **Create the page module**
```javascript
// In pages/widget.js
import { CRUDManager } from '../components/CRUDManager.js';
import { validateWidget } from '../validation.js';
import { EVENTS } from '../constants.js';

export function renderWidget(container) {
  const manager = new CRUDManager({
    entityName: 'widget',
    icon: '⚙️',
    fields: [
      { name: 'name', label: 'Widget Name', type: 'text', required: true },
      // ... more fields
    ],
    columns: [
      { key: 'name', label: 'Name', sortable: true },
      // ... more columns
    ],
    storeMethods: {
      add: store.addWidget,
      update: store.updateWidget,
      delete: store.deleteWidget,
      getAll: store.getWidgets,
    },
    onValidate: (formData) => {
      const result = validateWidget(formData);
      return result.valid ? null : result.errors[0].message;
    },
  });

  return manager.render(container, EVENTS.WIDGETS_CHANGED);
}
```

**Result:** ~50 lines vs 300+ lines with manual CRUD

### Building a Complex Form

Use FormBuilder for clean code:

```javascript
import { FormBuilder } from '../components/FormBuilder.js';

const builder = new FormBuilder();
builder
  .addInput('productName', 'Product Name', {
    value: product?.name,
    required: true,
    maxLength: 100,
  })
  .addSelect('category', 'Category', categories.map(c => ({
    value: c.id,
    label: c.name,
  })), {
    value: product?.categoryId,
    required: true,
  })
  .addNumber('price', 'Selling Price', {
    value: product?.sellingPrice,
    required: true,
    min: 0,
    step: '0.01',
  })
  .addTextarea('description', 'Description', {
    value: product?.description,
    maxLength: 500,
  })
  .setLayout('row'); // 2 columns

const formHtml = `
  <form id="product-form" style="display: flex; flex-direction: column; gap: 16px;">
    ${builder.build()}
  </form>
`;
```

### Testing Validation

```javascript
import { validateProduct } from '../js/validation.js';
import { TestData, TestSuite } from './__tests__/test-utils.js';

const suite = new TestSuite('Product Validation');

suite.test('valid product passes', () => {
  const product = TestData.product({ name: 'Valid' });
  const result = validateProduct(product);
  Assert.equal(result.valid, true);
});

suite.test('missing name fails', () => {
  const product = TestData.product({ name: '' });
  const result = validateProduct(product);
  Assert.equal(result.valid, false);
});

await suite.run();
```

---

## Best Practices

### ✅ DO

1. **Use Constants for Magic Values**
```javascript
// Good
store.subscribe(EVENTS.PRODUCTS_CHANGED, () => {...});

// Bad
store.subscribe('products:changed', () => {...}); // Typos possible
```

2. **Validate All Input**
```javascript
// Good
const result = validateProduct(formData);
if (!result.valid) {
  showError(result.errors[0].message);
  return;
}

// Bad
if (!name) showError('Required');
// Missing other validation
```

3. **Use Escape Functions for User Data**
```javascript
// Good
const html = `<div>${escapeHtml(userData.name)}</div>`;

// Bad
const html = `<div>${userData.name}</div>`; // XSS risk
```

4. **Handle Storage Errors**
```javascript
// Good
const success = SafeStorage.setJSON('key', data);
if (!success) showError('Could not save');

// Bad
localStorage.setItem('key', JSON.stringify(data)); // May fail silently
```

5. **Use CRUDManager for Entity Pages**
```javascript
// Good
const manager = new CRUDManager({...});
manager.render(container);

// Bad
// 300+ lines of manual render, modal, table code
```

### ❌ DON'T

1. **Don't Hardcode Event Names**
```javascript
// Bad
store.subscribe('products:changed', ...);

// Good
import { EVENTS } from '../constants.js';
store.subscribe(EVENTS.PRODUCTS_CHANGED, ...);
```

2. **Don't Use Inline HTML Strings for Forms**
```javascript
// Bad
const html = `<input type="text" style="...">`;

// Good
const builder = new FormBuilder();
builder.addInput('name', 'Name');
const html = builder.build();
```

3. **Don't Trust User Input**
```javascript
// Bad
const name = userData.name; // No escaping
const html = `<div>${name}</div>`; // XSS

// Good
const name = sanitizeInput(userData.name);
const html = `<div>${escapeHtml(name)}</div>`;
```

4. **Don't Ignore Validation Errors**
```javascript
// Bad
const result = validateProduct(data);
// Ignore result...
store.addProduct(data);

// Good
const result = validateProduct(data);
if (!result.valid) return showError(...);
store.addProduct(data);
```

5. **Don't Duplicate Form Building Logic**
```javascript
// Bad - Duplicated in product.js and customer.js
const inputStyle = `width: 100%; padding: 8px 12px; ...`;

// Good
import { FORM_STYLES } from '../constants.js';
style=${FORM_STYLES.INPUT}
```

---

## Testing

### Running Tests
```javascript
// In browser console or as script
import { suite } from './__tests__/validation.test.js';
await suite.run();
```

### Writing Tests
```javascript
import { TestSuite, TestData, Assert } from './test-utils.js';

const suite = new TestSuite('My Feature');

suite.test('description', () => {
  // Arrange
  const data = TestData.product({ name: 'Test' });

  // Act
  const result = validateProduct(data);

  // Assert
  Assert.equal(result.valid, true);
});

await suite.run();
```

---

## Debugging

### Enable Error Logging
```javascript
import { errorLogger } from '../js/error-handling.js';

// View error logs
console.log(errorLogger.getLogs());

// Export error logs
exportErrorLogs();
```

### Inspect Store Data
```javascript
import store from '../js/store.js';

console.log(store.data); // View all data
console.log(store.getProducts()); // View entity
```

### Check Validation Rules
```javascript
import { validateProduct } from '../js/validation.js';

const result = validateProduct({ name: '' });
console.log(result); // { valid: false, errors: [...] }
```

---

## Performance Tips

1. **Debounce Search Input** (already done by renderDataTable)
2. **Avoid Re-rendering Entire Page**
   - Use incremental updates instead of full re-render
   - Keep state closer to component

3. **Lazy Load External Libraries**
   - Chart.js, html2pdf loaded only on demand

4. **Use Virtual Scrolling for Large Lists**
   - Implement when table exceeds 1000 items

---

## Security Checklist

- [ ] All user input escaped with appropriate function
- [ ] Validation rules cover all business logic
- [ ] No inline event handlers (migrate to addEventListener)
- [ ] localStorage used for non-sensitive data only
- [ ] No console.log of sensitive data in production
- [ ] CORS headers configured if using API
- [ ] Sensitive operations require confirmation

---

## Deployment Checklist

- [ ] No console errors in production build
- [ ] All tests passing
- [ ] Data validates on load
- [ ] Error handling graceful (shows user messages, not stack traces)
- [ ] localStorage quota monitored
- [ ] Bundle size acceptable
- [ ] Mobile responsive tested
- [ ] Accessibility tested (keyboard nav, ARIA labels)

---

## Useful Commands

```bash
# Run validation tests
node __tests__/validation.test.js

# View error logs
localStorage.getItem('app_error_logs')

# Clear all data (in console)
store.clearAll(); // WARNING: Destructive!

# Export data backup
const backup = JSON.stringify(store.data);
```

---

## Troubleshooting

### "Event not firing"
- Check event name matches constant: `EVENTS.ENTITY_CHANGED`
- Verify subscriber called before event emitted

### "Form not showing"
- Check FormBuilder.build() called
- Verify form container exists in DOM

### "Data not saving"
- Check browser allows localStorage (privacy mode?)
- Verify store.save() called after data change
- Check error logs: `errorLogger.getLogs()`

### "XSS warning"
- Escape all user input with `escapeHtml()`
- Use `sanitizeInput()` for cleanup
- Avoid `innerHTML` when possible, use `textContent`

---

## Resources

- `IMPROVEMENTS.md` - Technical improvements summary
- `REFACTORING.md` - Step-by-step migration guide
- `js/components/FormBuilder.js` - Form API documentation
- `js/validation.js` - Validation rules
- `js/error-handling.js` - Error management

---

*Generated by Claude Code - Senior Professional Web Developer*
*Last Updated: April 2026*
