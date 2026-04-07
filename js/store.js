// ============================================
// js/store.js — Reactive Data Store
// Replaces Zustand with a class-based event-driven store
// featuring localStorage persistence and cross-module reactivity
// ============================================

import { SafeStorage, DataIntegrityError, errorLogger } from './error-handling.js';
import { CONFIG } from './constants.js';

class _Store {
  constructor() {
    this.data = null;
    this.listeners = new Map(); // event -> Set<callback>
    this.STORAGE_KEY = 'sufa-inventory-data';
    this._saveTimer = null;
    this.load();
  }

  // ============================================
  // CORE
  // ============================================

  load() {
    try {
      const raw = SafeStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = SafeStorage.getJSON(this.STORAGE_KEY);
        if (!parsed) {
          throw new Error('Failed to parse stored data');
        }

        // Validate and sanitize data
        const defaults = this._getDefaultData();
        const validated = this._validateLoadedData(parsed, defaults);

        this.data = validated;
        return;
      }
    } catch (e) {
      const error = new DataIntegrityError(
        `Failed to load data from localStorage: ${e.message}`,
        'store',
        { originalError: e.message }
      );
      errorLogger.log(error, 'Using default data');
    }
    this.data = this._getDefaultData();
  }

  /**
   * Validate and sanitize loaded data structure
   * Removes corrupted entries, validates required fields
   */
  _validateLoadedData(parsed, defaults) {
    const data = {
      settings: this._validateSettings(parsed.settings || {}, defaults.settings),
      categories: this._validateEntityArray(parsed.categories || [], 'category'),
      products: this._validateEntityArray(parsed.products || [], 'product'),
      customers: this._validateEntityArray(parsed.customers || [], 'customer'),
      suppliers: this._validateEntityArray(parsed.suppliers || [], 'supplier'),
      invoices: this._validateEntityArray(parsed.invoices || [], 'invoice'),
      purchases: this._validateEntityArray(parsed.purchases || [], 'purchase'),
      stockMovements: this._validateEntityArray(parsed.stockMovements || [], 'stockMovement'),
      transactions: this._validateEntityArray(parsed.transactions || [], 'transaction'),
    };

    return data;
  }

  /**
   * Validate settings object
   */
  _validateSettings(settings, defaults) {
    const validated = { ...defaults };

    // Whitelist allowed settings keys
    const allowedKeys = Object.keys(defaults);
    for (const key of allowedKeys) {
      if (key in settings && settings[key] !== null && settings[key] !== undefined) {
        const value = settings[key];

        // Type validation
        if (typeof value === typeof defaults[key]) {
          validated[key] = value;
        } else if (key === 'taxRate' || key === 'lowStockThreshold') {
          // Numeric fields
          const num = parseFloat(value);
          if (!isNaN(num) && num >= 0) {
            validated[key] = num;
          }
        }
      }
    }

    return validated;
  }

  /**
   * Validate array of entities
   * Removes items with missing required id, filters out non-objects
   */
  _validateEntityArray(arr, entityType) {
    if (!Array.isArray(arr)) {
      return [];
    }

    const validated = [];
    const invalidCount = 0;

    for (const item of arr) {
      // Must be object
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      // Must have id
      if (!item.id) {
        continue;
      }

      // Type-specific validation
      const isValid = this._validateEntity(item, entityType);
      if (isValid) {
        validated.push(item);
      }
    }

    // Log if items were removed
    if (arr.length > validated.length) {
      errorLogger.log(
        new DataIntegrityError(
          `Removed ${arr.length - validated.length} corrupted ${entityType} entries`,
          entityType
        ),
        null
      );
    }

    return validated;
  }

  /**
   * Validate individual entity based on type
   */
  _validateEntity(item, entityType) {
    // All entities require id
    if (!item.id) return false;

    switch (entityType) {
      case 'product':
        // Required: name, quantity, costPrice, sellingPrice
        return (
          item.name &&
          typeof item.quantity === 'number' &&
          typeof item.costPrice === 'number' &&
          typeof item.sellingPrice === 'number'
        );

      case 'customer':
      case 'supplier':
        // Required: name
        return item.name && typeof item.name === 'string';

      case 'category':
        // Required: name
        return item.name && typeof item.name === 'string';

      case 'invoice':
      case 'purchase':
        // Required: number, items array
        return (
          (item.invoiceNumber || item.purchaseNumber) &&
          Array.isArray(item.items) &&
          item.items.length > 0
        );

      case 'transaction':
        // Required: type, amount, date
        return (
          item.type &&
          typeof item.amount === 'number' &&
          item.date
        );

      case 'stockMovement':
        // Required: productId, type, quantity
        return (
          item.productId &&
          item.type &&
          typeof item.quantity === 'number'
        );

      default:
        return true; // Unknown type, allow it
    }
  }


  _getDefaultData() {
    return {
      settings: {
        companyName: 'SuFa Inventory',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 10,
        theme: 'light',
        invoicePrefix: 'INV',
        purchasePrefix: 'PO',
        lowStockThreshold: 10,
      },
      categories: [],
      products: [],
      customers: [],
      suppliers: [],
      invoices: [],
      purchases: [],
      stockMovements: [],
      transactions: [],
    };
  }

  /**
   * Debounced save to localStorage (300ms).
   * Rapid successive calls within the window are coalesced into one write.
   * Uses SafeStorage for error handling.
   */
  save() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      const success = SafeStorage.setJSON(this.STORAGE_KEY, this.data);
      if (!success) {
        errorLogger.log(
          new DataIntegrityError('Failed to persist data to localStorage', 'store'),
          'Data changes may not be saved'
        );
      }
      this._saveTimer = null;
    }, CONFIG.STORE_DEBOUNCE_MS);
  }

  // ============================================
  // EVENT SYSTEM — critical for cross-module data sync
  // ============================================

  /**
   * Subscribe to a named event.
   * @param {string} event   e.g. 'products:changed', 'invoices:changed'
   * @param {Function} callback  receives (data) payload
   * @returns {Function} unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return an unsubscribe function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(event);
      }
    };
  }

  /**
   * Emit a named event, calling every registered callback.
   * @param {string} event
   * @param {*} data   optional payload (the relevant slice of state)
   */
  emit(event, data) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Store: error in "${event}" listener`, e); }
      });
    }
  }

  // ============================================
  // GENERIC HELPERS
  // ============================================

  generateId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate the next sequential number for invoices / purchases.
   * Inspects existing items to find the highest numeric suffix.
   * @param {string} prefix   e.g. 'INV'
   * @param {Array}  items    the invoices or purchases array
   * @returns {string}  e.g. 'INV-0001'
   */
  getNextNumber(prefix, items) {
    const numField = prefix === this.data.settings.invoicePrefix ? 'invoiceNumber' : 'purchaseNumber';
    const nums = items.map(i => {
      const raw = i[numField] || '';
      const parts = raw.split('-');
      return parseInt(parts[parts.length - 1] || '0', 10);
    });
    const next = Math.max(0, ...nums) + 1;
    return `${prefix}-${String(next).padStart(4, '0')}`;
  }

  // ============================================
  // CATEGORY CRUD
  // ============================================

  getCategories() { return this.data.categories; }
  getCategoryById(id) { return this.data.categories.find(c => c.id === id); }

  addCategory(category) {
    const newCategory = {
      id: this.generateId(),
      name: category.name || '',
      description: category.description || '',
      createdAt: new Date().toISOString(),
    };
    // Merge caller-provided fields (but never overwrite id/createdAt)
    if (category.name != null) newCategory.name = category.name;
    if (category.description != null) newCategory.description = category.description;
    this.data.categories.push(newCategory);
    this.save();
    this.emit('categories:changed', this.data.categories);
    return newCategory;
  }

  updateCategory(id, updates) {
    const category = this.data.categories.find(c => c.id === id);
    if (!category) return null;
    Object.assign(category, updates);
    this.save();
    this.emit('categories:changed', this.data.categories);
    return category;
  }

  deleteCategory(id) {
    const idx = this.data.categories.findIndex(c => c.id === id);
    if (idx === -1) return;
    this.data.categories.splice(idx, 1);
    // Unlink products that belonged to this category
    this.data.products.forEach(p => {
      if (p.categoryId === id) p.categoryId = null;
    });
    this.save();
    this.emit('categories:changed', this.data.categories);
    this.emit('products:changed', this.data.products);
  }

  // ============================================
  // PRODUCT CRUD
  // ============================================

  getProducts() { return this.data.products; }
  getProductById(id) { return this.data.products.find(p => p.id === id); }

  getLowStockProducts() {
    const threshold = this.data.settings.lowStockThreshold;
    return this.data.products.filter(p => p.quantity <= (p.lowStockThreshold || threshold));
  }

  addProduct(product) {
    const now = new Date().toISOString();
    const newProduct = {
      id: this.generateId(),
      name: product.name || '',
      sku: product.sku || '',
      categoryId: product.categoryId || null,
      costPrice: Number(product.costPrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
      quantity: Number(product.quantity) || 0,
      unit: product.unit || '',
      description: product.description || '',
      lowStockThreshold: product.lowStockThreshold != null ? Number(product.lowStockThreshold) : null,
      createdAt: now,
      updatedAt: now,
    };
    this.data.products.push(newProduct);
    this.save();
    this.emit('products:changed', this.data.products);
    return newProduct;
  }

  updateProduct(id, updates) {
    const product = this.data.products.find(p => p.id === id);
    if (!product) return null;
    Object.assign(product, updates, { updatedAt: new Date().toISOString() });
    this.save();
    this.emit('products:changed', this.data.products);
    return product;
  }

  deleteProduct(id) {
    const idx = this.data.products.findIndex(p => p.id === id);
    if (idx === -1) return;
    this.data.products.splice(idx, 1);
    this.save();
    this.emit('products:changed', this.data.products);
  }

  // ============================================
  // CUSTOMER CRUD
  // ============================================

  getCustomers() { return this.data.customers; }
  getCustomerById(id) { return this.data.customers.find(c => c.id === id); }

  addCustomer(customer) {
    const newCustomer = {
      id: this.generateId(),
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      balance: Number(customer.balance) || 0,
      createdAt: new Date().toISOString(),
    };
    this.data.customers.push(newCustomer);
    this.save();
    this.emit('customers:changed', this.data.customers);
    return newCustomer;
  }

  updateCustomer(id, updates) {
    const customer = this.data.customers.find(c => c.id === id);
    if (!customer) return null;
    Object.assign(customer, updates);
    this.save();
    this.emit('customers:changed', this.data.customers);
    return customer;
  }

  deleteCustomer(id) {
    const idx = this.data.customers.findIndex(c => c.id === id);
    if (idx === -1) return;
    this.data.customers.splice(idx, 1);
    this.save();
    this.emit('customers:changed', this.data.customers);
  }

  // ============================================
  // SUPPLIER CRUD
  // ============================================

  getSuppliers() { return this.data.suppliers; }
  getSupplierById(id) { return this.data.suppliers.find(s => s.id === id); }

  addSupplier(supplier) {
    const newSupplier = {
      id: this.generateId(),
      name: supplier.name || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      balance: Number(supplier.balance) || 0,
      createdAt: new Date().toISOString(),
    };
    this.data.suppliers.push(newSupplier);
    this.save();
    this.emit('suppliers:changed', this.data.suppliers);
    return newSupplier;
  }

  updateSupplier(id, updates) {
    const supplier = this.data.suppliers.find(s => s.id === id);
    if (!supplier) return null;
    Object.assign(supplier, updates);
    this.save();
    this.emit('suppliers:changed', this.data.suppliers);
    return supplier;
  }

  deleteSupplier(id) {
    const idx = this.data.suppliers.findIndex(s => s.id === id);
    if (idx === -1) return;
    this.data.suppliers.splice(idx, 1);
    this.save();
    this.emit('suppliers:changed', this.data.suppliers);
  }

  // ============================================
  // INVOICE CRUD (WITH CROSS-MODULE SIDE EFFECTS)
  // ============================================

  getInvoices() { return this.data.invoices; }
  getInvoiceById(id) { return this.data.invoices.find(i => i.id === id); }

  addInvoice(invoiceData) {
    const id = this.generateId();
    const invoiceNumber = this.getNextNumber(this.data.settings.invoicePrefix, this.data.invoices);
    const {
      items = [],
      customerId,
      customerName,
      date,
      dueDate,
      notes,
      status = 'draft',
    } = invoiceData;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxAmount = subtotal * (this.data.settings.taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const invoice = {
      id,
      invoiceNumber,
      customerId,
      customerName,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName || '',
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.price) || 0),
      })),
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      date: date || new Date().toISOString().split('T')[0],
      dueDate,
      notes,
      status,
      createdAt: new Date().toISOString(),
    };

    this.data.invoices.unshift(invoice);

    // --- SIDE EFFECT 1: Create sale transaction ---
    this.data.transactions.unshift({
      id: this.generateId(),
      type: 'sale',
      amount: invoice.totalAmount,
      date: invoice.date,
      description: `Invoice ${invoiceNumber} - ${customerName || 'Unknown'}`,
      referenceId: id,
      referenceType: 'invoice',
      accountId: customerId || null,
      accountName: customerName || '',
      createdAt: new Date().toISOString(),
    });

    // --- SIDE EFFECT 2: Decrement stock for each invoice item ---
    const now = new Date().toISOString();
    items.forEach(item => {
      const product = this.getProductById(item.productId);
      if (product) {
        const prevQty = product.quantity;
        product.quantity = Math.max(0, prevQty - (Number(item.quantity) || 0));
        product.updatedAt = now;

        this.data.stockMovements.unshift({
          id: this.generateId(),
          productId: item.productId,
          productName: item.productName || product.name,
          type: 'out',
          quantity: Number(item.quantity) || 0,
          previousQuantity: prevQty,
          newQuantity: product.quantity,
          note: `Invoice ${invoiceNumber}`,
          referenceId: id,
          referenceType: 'invoice',
          createdAt: now,
        });
      }
    });

    // --- SIDE EFFECT 3: Increment customer balance ---
    const customer = this.getCustomerById(customerId);
    if (customer) {
      customer.balance = (customer.balance || 0) + invoice.totalAmount;
    }

    this.save();
    this.emit('invoices:changed', this.data.invoices);
    this.emit('transactions:changed', this.data.transactions);
    this.emit('stockmovements:changed', this.data.stockMovements);
    this.emit('products:changed', this.data.products);
    this.emit('customers:changed', this.data.customers);
    this.emit('dashboard:refresh');

    return invoice;
  }

  updateInvoice(id, updates) {
    const invoice = this.data.invoices.find(i => i.id === id);
    if (!invoice) return null;

    // If items changed, recalculate totals
    if (updates.items) {
      updates.items = updates.items.map(item => ({
        productId: item.productId,
        productName: item.productName || '',
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));
      updates.subtotal = updates.items.reduce((sum, item) => sum + item.total, 0);
      updates.taxAmount = Math.round(updates.subtotal * (this.data.settings.taxRate / 100) * 100) / 100;
      updates.totalAmount = Math.round((updates.subtotal + updates.taxAmount) * 100) / 100;
    }

    Object.assign(invoice, updates);
    this.save();
    this.emit('invoices:changed', this.data.invoices);
    return invoice;
  }

  markInvoicePaid(id) {
    const invoice = this.getInvoiceById(id);
    if (!invoice || invoice.status === 'paid') return;

    invoice.status = 'paid';

    // Create payment_in transaction
    this.data.transactions.unshift({
      id: this.generateId(),
      type: 'payment_in',
      amount: invoice.totalAmount,
      date: new Date().toISOString().split('T')[0],
      description: `Payment received - Invoice ${invoice.invoiceNumber}`,
      referenceId: id,
      referenceType: 'invoice',
      accountId: invoice.customerId || null,
      accountName: invoice.customerName || '',
      createdAt: new Date().toISOString(),
    });

    // Decrement customer balance
    const customer = this.getCustomerById(invoice.customerId);
    if (customer) {
      customer.balance = Math.max(0, (customer.balance || 0) - invoice.totalAmount);
    }

    this.save();
    this.emit('invoices:changed', this.data.invoices);
    this.emit('transactions:changed', this.data.transactions);
    this.emit('customers:changed', this.data.customers);
    this.emit('dashboard:refresh');
  }

  deleteInvoice(id) {
    const invoice = this.getInvoiceById(id);
    if (!invoice) return;

    // Reverse side effects (only if the invoice was active)
    if (invoice.status !== 'cancelled') {
      // Restore stock for each item
      invoice.items.forEach(item => {
        const product = this.getProductById(item.productId);
        if (product) {
          const prevQty = product.quantity;
          product.quantity = prevQty + (Number(item.quantity) || 0);
          product.updatedAt = new Date().toISOString();

          this.data.stockMovements.unshift({
            id: this.generateId(),
            productId: item.productId,
            productName: item.productName || product.name,
            type: 'in',
            quantity: Number(item.quantity) || 0,
            previousQuantity: prevQty,
            newQuantity: product.quantity,
            note: `Invoice ${invoice.invoiceNumber} deleted - stock restored`,
            referenceId: id,
            referenceType: 'invoice',
            createdAt: new Date().toISOString(),
          });
        }
      });

      // Decrement customer balance
      const customer = this.getCustomerById(invoice.customerId);
      if (customer) {
        customer.balance = Math.max(0, (customer.balance || 0) - invoice.totalAmount);
      }
    }

    // Remove the invoice
    this.data.invoices = this.data.invoices.filter(i => i.id !== id);

    // Remove related transactions (sale + any payment_in for this invoice)
    this.data.transactions = this.data.transactions.filter(t => t.referenceId !== id);

    this.save();
    this.emit('invoices:changed', this.data.invoices);
    this.emit('transactions:changed', this.data.transactions);
    this.emit('stockmovements:changed', this.data.stockMovements);
    this.emit('products:changed', this.data.products);
    this.emit('customers:changed', this.data.customers);
    this.emit('dashboard:refresh');
  }

  // ============================================
  // PURCHASE CRUD (WITH CROSS-MODULE SIDE EFFECTS)
  // ============================================

  getPurchases() { return this.data.purchases; }
  getPurchaseById(id) { return this.data.purchases.find(p => p.id === id); }

  addPurchase(purchaseData) {
    const id = this.generateId();
    const purchaseNumber = this.getNextNumber(this.data.settings.purchasePrefix, this.data.purchases);
    const {
      items = [],
      supplierId,
      supplierName,
      date,
      dueDate,
      notes,
      status = 'pending',
    } = purchaseData;

    const totalAmount = items.reduce(
      (sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.costPrice) || 0)),
      0
    );

    const purchase = {
      id,
      purchaseNumber,
      supplierId,
      supplierName,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.productName || '',
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.costPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.costPrice) || 0),
      })),
      totalAmount: Math.round(totalAmount * 100) / 100,
      date: date || new Date().toISOString().split('T')[0],
      dueDate,
      notes,
      status,
      createdAt: new Date().toISOString(),
    };

    this.data.purchases.unshift(purchase);

    // Create purchase transaction
    this.data.transactions.unshift({
      id: this.generateId(),
      type: 'purchase',
      amount: purchase.totalAmount,
      date: purchase.date,
      description: `Purchase ${purchaseNumber} - ${supplierName || 'Unknown'}`,
      referenceId: id,
      referenceType: 'purchase',
      accountId: supplierId || null,
      accountName: supplierName || '',
      createdAt: new Date().toISOString(),
    });

    this.save();
    this.emit('purchases:changed', this.data.purchases);
    this.emit('transactions:changed', this.data.transactions);
    this.emit('dashboard:refresh');

    return purchase;
  }

  receivePurchase(id) {
    const purchase = this.getPurchaseById(id);
    if (!purchase || purchase.status === 'received') return;

    purchase.status = 'received';

    // Increment stock for each item and create stock movements
    const now = new Date().toISOString();
    purchase.items.forEach(item => {
      const product = this.getProductById(item.productId);
      if (product) {
        const prevQty = product.quantity;
        product.quantity = prevQty + (Number(item.quantity) || 0);
        product.updatedAt = now;

        this.data.stockMovements.unshift({
          id: this.generateId(),
          productId: item.productId,
          productName: item.productName || product.name,
          type: 'in',
          quantity: Number(item.quantity) || 0,
          previousQuantity: prevQty,
          newQuantity: product.quantity,
          note: `Purchase ${purchase.purchaseNumber} received`,
          referenceId: id,
          referenceType: 'purchase',
          createdAt: now,
        });
      }
    });

    // Increment supplier balance
    const supplier = this.getSupplierById(purchase.supplierId);
    if (supplier) {
      supplier.balance = (supplier.balance || 0) + purchase.totalAmount;
    }

    this.save();
    this.emit('purchases:changed', this.data.purchases);
    this.emit('products:changed', this.data.products);
    this.emit('stockmovements:changed', this.data.stockMovements);
    this.emit('suppliers:changed', this.data.suppliers);
    this.emit('dashboard:refresh');
  }

  updatePurchase(id, updates) {
    const purchase = this.data.purchases.find(p => p.id === id);
    if (!purchase) return null;

    // Recalculate if items changed
    if (updates.items) {
      updates.items = updates.items.map(item => ({
        productId: item.productId,
        productName: item.productName || '',
        quantity: Number(item.quantity) || 0,
        costPrice: Number(item.costPrice) || 0,
        total: (Number(item.quantity) || 0) * (Number(item.costPrice) || 0),
      }));
      updates.totalAmount = Math.round(
        updates.items.reduce((sum, item) => sum + item.total, 0) * 100
      ) / 100;
    }

    Object.assign(purchase, updates);
    this.save();
    this.emit('purchases:changed', this.data.purchases);
    return purchase;
  }

  deletePurchase(id) {
    const purchase = this.getPurchaseById(id);
    if (!purchase) return;

    // If received, reverse stock increments
    if (purchase.status === 'received') {
      purchase.items.forEach(item => {
        const product = this.getProductById(item.productId);
        if (product) {
          product.quantity = Math.max(0, product.quantity - (Number(item.quantity) || 0));
          product.updatedAt = new Date().toISOString();
        }
      });

      // Decrement supplier balance
      const supplier = this.getSupplierById(purchase.supplierId);
      if (supplier) {
        supplier.balance = Math.max(0, (supplier.balance || 0) - purchase.totalAmount);
      }
    }

    // Remove purchase
    this.data.purchases = this.data.purchases.filter(p => p.id !== id);

    // Remove related transactions
    this.data.transactions = this.data.transactions.filter(t => t.referenceId !== id);

    // Remove related stock movements
    this.data.stockMovements = this.data.stockMovements.filter(s => s.referenceId !== id);

    this.save();
    this.emit('purchases:changed', this.data.purchases);
    this.emit('transactions:changed', this.data.transactions);
    this.emit('products:changed', this.data.products);
    this.emit('stockmovements:changed', this.data.stockMovements);
    this.emit('suppliers:changed', this.data.suppliers);
    this.emit('dashboard:refresh');
  }

  // ============================================
  // TRANSACTIONS (read-only from side effects; manual add supported)
  // ============================================

  getTransactions() { return this.data.transactions; }

  addTransaction(txData) {
    const tx = {
      id: this.generateId(),
      type: txData.type || 'adjustment',
      amount: Number(txData.amount) || 0,
      date: txData.date || new Date().toISOString().split('T')[0],
      description: txData.description || '',
      referenceId: txData.referenceId || null,
      referenceType: txData.referenceType || 'manual',
      accountId: txData.accountId || null,
      accountName: txData.accountName || '',
      createdAt: new Date().toISOString(),
    };
    this.data.transactions.unshift(tx);
    this.save();
    this.emit('transactions:changed', this.data.transactions);
    this.emit('dashboard:refresh');
    return tx;
  }

  // ============================================
  // STOCK MOVEMENTS (read-only from side effects; manual add supported)
  // ============================================

  getStockMovements() { return this.data.stockMovements; }

  getProductStockMovements(productId) {
    return this.data.stockMovements.filter(s => s.productId === productId);
  }

  addStockMovement(movementData) {
    const { productId, type, quantity, note = '' } = movementData;
    const product = this.getProductById(productId);
    if (!product) return null;

    const prevQty = product.quantity;
    let newQty;

    if (type === 'in') {
      newQty = prevQty + (Number(quantity) || 0);
    } else if (type === 'out') {
      newQty = Math.max(0, prevQty - (Number(quantity) || 0));
    } else if (type === 'adjustment') {
      // quantity is the target quantity for adjustments
      newQty = Number(quantity) || 0;
    } else {
      return null;
    }

    product.quantity = newQty;
    product.updatedAt = new Date().toISOString();

    const movement = {
      id: this.generateId(),
      productId,
      productName: product.name,
      type,
      quantity: type === 'adjustment' ? newQty - prevQty : (Number(quantity) || 0),
      previousQuantity: prevQty,
      newQuantity: newQty,
      note,
      referenceId: null,
      referenceType: 'manual',
      createdAt: new Date().toISOString(),
    };

    this.data.stockMovements.unshift(movement);

    this.save();
    this.emit('stockmovements:changed', this.data.stockMovements);
    this.emit('products:changed', this.data.products);
    this.emit('dashboard:refresh');

    return movement;
  }

  // ============================================
  // SETTINGS
  // ============================================

  getSettings() { return this.data.settings; }

  updateSettings(updates) {
    Object.assign(this.data.settings, updates);
    this.save();
    this.emit('settings:changed', this.data.settings);
  }

  // ============================================
  // COMPUTED / HELPER METHODS
  // ============================================

  getCustomerTransactions(customerId) {
    return this.data.transactions.filter(t => t.accountId === customerId);
  }

  getSupplierTransactions(supplierId) {
    return this.data.transactions.filter(t => t.accountId === supplierId);
  }

  getTotalReceivables() {
    return this.data.customers.reduce((sum, c) => sum + (c.balance || 0), 0);
  }

  getTotalPayables() {
    return this.data.suppliers.reduce((sum, s) => sum + (s.balance || 0), 0);
  }

  getInventoryValue() {
    return this.data.products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.costPrice || 0)), 0);
  }

  getTotalRevenue() {
    return this.data.invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  }

  getStorageSize() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? new Blob([raw]).size : 0;
    } catch (e) {
      return 0;
    }
  }

  // ============================================
  // DATA MANAGEMENT — export / import / reset
  // ============================================

  exportData() {
    return JSON.stringify({
      ...this.data,
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  importData(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (!imported || typeof imported !== 'object') return false;

      // Merge carefully — preserve defaults for missing keys
      const defaults = this._getDefaultData();
      this.data.settings = { ...defaults.settings, ...imported.settings };
      this.data.categories = Array.isArray(imported.categories) ? imported.categories : [];
      this.data.products = Array.isArray(imported.products) ? imported.products : [];
      this.data.customers = Array.isArray(imported.customers) ? imported.customers : [];
      this.data.suppliers = Array.isArray(imported.suppliers) ? imported.suppliers : [];
      this.data.invoices = Array.isArray(imported.invoices) ? imported.invoices : [];
      this.data.purchases = Array.isArray(imported.purchases) ? imported.purchases : [];
      this.data.stockMovements = Array.isArray(imported.stockMovements) ? imported.stockMovements : [];
      this.data.transactions = Array.isArray(imported.transactions) ? imported.transactions : [];

      this.save();

      // Emit every event so all open pages refresh
      this._emitAll();
      return true;
    } catch (e) {
      console.error('Store: import failed', e);
      return false;
    }
  }

  resetAllData() {
    try { localStorage.removeItem(this.STORAGE_KEY); } catch (e) { /* noop */ }
    this.data = this._getDefaultData();
    this.save();

    // Emit every event so all open pages refresh
    this._emitAll();
  }

  /**
   * Helper: emit all known events — used after import / reset.
   */
  _emitAll() {
    const events = [
      'categories:changed',
      'products:changed',
      'customers:changed',
      'suppliers:changed',
      'invoices:changed',
      'purchases:changed',
      'transactions:changed',
      'stockmovements:changed',
      'settings:changed',
      'dashboard:refresh',
    ];
    events.forEach(e => this.emit(e));
  }

}

// ============================================
// EXPORTS
// ============================================

// Singleton instance — all pages import this as `{ Store }`
const Store = new _Store();

// Standalone generateId for backward compatibility
// (several pages import { Store, generateId } from '../store.js')
function generateId() {
  return Store.generateId();
}

export default Store;
export { Store, generateId };
