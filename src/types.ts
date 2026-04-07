export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  email: string;
  address: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  supplierId: string;
  price: number;
  cost: number;
  stockQuantity: number;
  minStock: number;
}

export interface InvoiceItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  status: 'paid' | 'pending' | 'cancelled';
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  cost: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  date: string;
  items: PurchaseItem[];
  total: number;
  status: 'received' | 'pending' | 'cancelled';
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  category: string;
}

export interface AppState {
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  purchases: Purchase[];
  transactions: Transaction[];
  settings: {
    businessName: string;
    currency: string;
    darkMode: boolean;
  };
}
