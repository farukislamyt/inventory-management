import { z } from 'zod';

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Category name is required"),
});

export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Supplier name is required"),
  contact: z.string().min(1, "Contact is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
});

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Customer name is required"),
  contact: z.string().min(1, "Contact is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  categoryId: z.string(),
  supplierId: z.string(),
  price: z.number().min(0),
  cost: z.number().min(0),
  stockQuantity: z.number().int(),
  minStock: z.number().int().min(0),
});

export const InvoiceItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  price: z.number().min(0),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  date: z.string(),
  items: z.array(InvoiceItemSchema),
  total: z.number().min(0),
  status: z.enum(['paid', 'pending', 'cancelled']),
});

export const PurchaseItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().min(1),
  cost: z.number().min(0),
});

export const PurchaseSchema = z.object({
  id: z.string(),
  supplierId: z.string(),
  date: z.string(),
  items: z.array(PurchaseItemSchema),
  total: z.number().min(0),
  status: z.enum(['received', 'pending', 'cancelled']),
});

export const TransactionSchema = z.object({
  id: z.string(),
  type: z.enum(['income', 'expense']),
  amount: z.number().min(0),
  date: z.string(),
  description: z.string(),
  category: z.string(),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.string(),
  details: z.string(),
  user: z.string(),
});

export type Category = z.infer<typeof CategorySchema>;
export type Supplier = z.infer<typeof SupplierSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type PurchaseItem = z.infer<typeof PurchaseItemSchema>;
export type Purchase = z.infer<typeof PurchaseSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;

export interface AppState {
  version: string;
  onboarded: boolean;
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  purchases: Purchase[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  settings: {
    businessName: string;
    currency: string;
    darkMode: boolean;
    language: string;
  };
}
