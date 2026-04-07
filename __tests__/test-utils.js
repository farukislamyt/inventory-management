// ============================================
// __tests__/test-utils.js — Testing Utilities
// Helper functions for unit and integration tests
// ============================================

/**
 * Mock localStorage for testing
 */
export class MockStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

/**
 * Mock data generators for testing
 */
export const TestData = {
  /**
   * Create a mock product
   */
  product(overrides = {}) {
    return {
      id: 'prod-' + Math.random().toString(36).slice(2, 9),
      name: 'Test Product',
      sku: 'TST-001',
      categoryId: null,
      costPrice: 10.00,
      sellingPrice: 20.00,
      quantity: 100,
      unit: 'pcs',
      description: 'Test product description',
      lowStockThreshold: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock customer
   */
  customer(overrides = {}) {
    return {
      id: 'cust-' + Math.random().toString(36).slice(2, 9),
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+1-555-0123',
      address: '123 Main St',
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock supplier
   */
  supplier(overrides = {}) {
    return {
      id: 'supp-' + Math.random().toString(36).slice(2, 9),
      name: 'Test Supplier',
      email: 'supplier@test.com',
      phone: '+1-555-0456',
      address: '456 Business Ave',
      balance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock category
   */
  category(overrides = {}) {
    return {
      id: 'cat-' + Math.random().toString(36).slice(2, 9),
      name: 'Test Category',
      description: 'Test category description',
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock invoice
   */
  invoice(overrides = {}) {
    return {
      id: 'inv-' + Math.random().toString(36).slice(2, 9),
      invoiceNumber: 'INV-001',
      customerId: 'cust-123',
      customerName: 'Test Customer',
      items: [
        {
          productId: 'prod-123',
          productName: 'Test Product',
          quantity: 5,
          price: 20.00,
        },
      ],
      subtotal: 100.00,
      taxRate: 10,
      taxAmount: 10.00,
      totalAmount: 110.00,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'draft',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },

  /**
   * Create a mock purchase
   */
  purchase(overrides = {}) {
    return {
      id: 'po-' + Math.random().toString(36).slice(2, 9),
      purchaseNumber: 'PO-001',
      supplierId: 'supp-123',
      supplierName: 'Test Supplier',
      items: [
        {
          productId: 'prod-123',
          productName: 'Test Product',
          quantity: 50,
          costPrice: 10.00,
        },
      ],
      subtotal: 500.00,
      totalAmount: 500.00,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  },
};

/**
 * Test assertion helpers
 */
export const Assert = {
  /**
   * Assert that a value is truthy
   */
  ok(value, message = 'Expected truthy value') {
    if (!value) throw new Error(message);
  },

  /**
   * Assert that two values are equal
   */
  equal(actual, expected, message = `Expected ${expected}, got ${actual}`) {
    if (actual !== expected) throw new Error(message);
  },

  /**
   * Assert that value is in array
   */
  includes(array, value, message = `Expected array to include ${value}`) {
    if (!array.includes(value)) throw new Error(message);
  },

  /**
   * Assert that array has length
   */
  lengthEqual(array, length, message = `Expected length ${length}, got ${array.length}`) {
    if (array.length !== length) throw new Error(message);
  },

  /**
   * Assert that function throws
   */
  throws(fn, message = 'Expected function to throw') {
    let threw = false;
    try {
      fn();
    } catch (e) {
      threw = true;
    }
    if (!threw) throw new Error(message);
  },

  /**
   * Assert that two objects are deeply equal
   */
  deepEqual(actual, expected, message = 'Objects are not deeply equal') {
    const actualJson = JSON.stringify(actual);
    const expectedJson = JSON.stringify(expected);
    if (actualJson !== expectedJson) throw new Error(message);
  },
};

/**
 * Test runner for simple test suites
 */
export class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  /**
   * Add a test
   */
  test(name, fn) {
    this.tests.push({ name, fn });
  }

  /**
   * Run all tests
   */
  async run() {
    console.group(`📋 ${this.name}`);

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (e) {
        console.error(`✗ ${test.name}`);
        console.error(`  ${e.message}`);
        this.failed++;
      }
    }

    console.groupEnd();
    console.log(`\n📊 ${this.name}: ${this.passed} passed, ${this.failed} failed\n`);

    return this.failed === 0;
  }
}

/**
 * Create a fresh DOM for testing
 */
export function createTestContainer() {
  const container = document.createElement('div');
  container.id = 'test-container-' + Date.now();
  document.body.appendChild(container);
  return container;
}

/**
 * Clean up test containers
 */
export function cleanupTestContainer(container) {
  if (container && container.parentElement) {
    container.parentElement.removeChild(container);
  }
}

/**
 * Wait for async operations
 */
export function delay(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a spy function for tracking calls
 */
export function createSpy(fn = () => {}) {
  const spy = (...args) => fn(...args);
  spy.calls = [];
  spy.called = false;
  spy.callCount = 0;

  return new Proxy(spy, {
    apply(target, thisArg, args) {
      spy.calls.push(args);
      spy.called = true;
      spy.callCount++;
      return fn.apply(thisArg, args);
    },
  });
}

/**
 * Compare validation results
 */
export function validateFormResults(result, expectedErrors = 0) {
  Assert.ok(typeof result === 'object', 'Result should be object');
  Assert.ok('valid' in result, 'Result should have valid property');
  Assert.ok('errors' in result, 'Result should have errors property');
  Assert.ok(Array.isArray(result.errors), 'Errors should be array');

  if (expectedErrors === 0) {
    Assert.equal(result.valid, true, 'Should be valid');
  } else {
    Assert.equal(result.valid, false, 'Should be invalid');
    Assert.lengthEqual(result.errors, expectedErrors, `Expected ${expectedErrors} errors`);
  }

  return result;
}
