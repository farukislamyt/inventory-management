// ============================================
// __tests__/validation.test.js — Validation Tests
// Example test suite for input validation
// ============================================

import {
  validateProduct,
  validateCustomer,
  validateCategory,
  validateInvoice,
} from '../js/validation.js';
import { TestSuite, TestData, Assert, validateFormResults } from './test-utils.js';

const suite = new TestSuite('Input Validation');

// ===== PRODUCT VALIDATION =====

suite.test('product: valid product passes validation', () => {
  const product = TestData.product({
    name: 'Valid Product',
    sku: 'VALID-001',
    quantity: 50,
    costPrice: 10,
    sellingPrice: 20,
  });

  const result = validateProduct(product);
  validateFormResults(result, 0); // Expect 0 errors
});

suite.test('product: missing name fails validation', () => {
  const product = TestData.product({ name: '' });
  const result = validateProduct(product);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'name');
});

suite.test('product: name too short fails', () => {
  const product = TestData.product({ name: 'X' });
  const result = validateProduct(product);
  validateFormResults(result, 1);
});

suite.test('product: negative quantity fails', () => {
  const product = TestData.product({ quantity: -5 });
  const result = validateProduct(product);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'quantity');
});

suite.test('product: non-integer quantity fails', () => {
  const product = TestData.product({ quantity: 5.5 });
  const result = validateProduct(product);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'quantity');
});

suite.test('product: negative cost price fails', () => {
  const product = TestData.product({ costPrice: -10 });
  const result = validateProduct(product);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'costPrice');
});

suite.test('product: invalid SKU format fails', () => {
  const product = TestData.product({
    sku: 'invalid@sku!', // Invalid characters
  });
  const result = validateProduct(product);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'sku');
});

// ===== CUSTOMER VALIDATION =====

suite.test('customer: valid customer passes validation', () => {
  const customer = TestData.customer({
    name: 'Valid Customer',
    email: 'customer@example.com',
    phone: '+1-555-0123',
  });

  const result = validateCustomer(customer);
  validateFormResults(result, 0);
});

suite.test('customer: missing name fails', () => {
  const customer = TestData.customer({ name: '' });
  const result = validateCustomer(customer);
  validateFormResults(result, 1);
});

suite.test('customer: invalid email fails', () => {
  const customer = TestData.customer({ email: 'not-an-email' });
  const result = validateCustomer(customer);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'email');
});

suite.test('customer: invalid phone fails', () => {
  const customer = TestData.customer({ phone: 'abc' });
  const result = validateCustomer(customer);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'phone');
});

suite.test('customer: negative balance fails', () => {
  const customer = TestData.customer({ balance: -50 });
  const result = validateCustomer(customer);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'balance');
});

// ===== CATEGORY VALIDATION =====

suite.test('category: valid category passes', () => {
  const category = TestData.category({
    name: 'Valid Category',
    description: 'Category description',
  });

  const result = validateCategory(category);
  validateFormResults(result, 0);
});

suite.test('category: missing name fails', () => {
  const category = TestData.category({ name: '' });
  const result = validateCategory(category);
  validateFormResults(result, 1);
});

suite.test('category: description too long fails', () => {
  const category = TestData.category({
    description: 'x'.repeat(501), // 501 chars (max 500)
  });
  const result = validateCategory(category);
  validateFormResults(result, 1);
  Assert.ok(result.errors[0].field === 'description');
});

// ===== INVOICE VALIDATION =====

suite.test('invoice: valid invoice passes', () => {
  const invoice = TestData.invoice({
    customerId: 'cust-123',
    items: [
      {
        productId: 'prod-123',
        productName: 'Product',
        quantity: 5,
        price: 20,
      },
    ],
  });

  const result = validateInvoice(invoice);
  validateFormResults(result, 0);
});

suite.test('invoice: missing customer fails', () => {
  const invoice = TestData.invoice({
    customerId: '',
    customerName: '',
  });
  const result = validateInvoice(invoice);
  validateFormResults(result, 1);
});

suite.test('invoice: no items fails', () => {
  const invoice = TestData.invoice({ items: [] });
  const result = validateInvoice(invoice);
  validateFormResults(result, 1);
});

suite.test('invoice: item missing product fails', () => {
  const invoice = TestData.invoice({
    items: [{ productId: '', quantity: 5, price: 20 }],
  });
  const result = validateInvoice(invoice);
  validateFormResults(result, 1);
});

suite.test('invoice: zero quantity fails', () => {
  const invoice = TestData.invoice({
    items: [
      {
        productId: 'prod-123',
        quantity: 0,
        price: 20,
      },
    ],
  });
  const result = validateInvoice(invoice);
  validateFormResults(result, 1);
});

suite.test('invoice: negative price fails', () => {
  const invoice = TestData.invoice({
    items: [
      {
        productId: 'prod-123',
        quantity: 5,
        price: -20,
      },
    ],
  });
  const result = validateInvoice(invoice);
  validateFormResults(result, 1);
});

// Run all tests
(async () => {
  await suite.run();
})();
