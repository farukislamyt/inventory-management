import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Category, Customer, Invoice, Product, Purchase, Supplier, Transaction } from '../types';

interface AppContextType {
  state: AppState;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addInvoice: (invoice: Omit<Invoice, 'id'>) => void;
  addPurchase: (purchase: Omit<Purchase, 'id'>) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  updateSettings: (settings: Partial<AppState['settings']>) => void;
}

const STORAGE_KEY = 'sufa_inventory_state';

const initialState: AppState = {
  categories: [],
  suppliers: [],
  customers: [],
  products: [],
  invoices: [],
  purchases: [],
  transactions: [],
  settings: {
    businessName: 'SuFa Inventory',
    currency: 'USD',
    darkMode: false,
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (state.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addCategory = (category: Omit<Category, 'id'>) => {
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, { ...category, id: generateId() }],
    }));
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => (c.id === id ? { ...c, ...category } : c)),
    }));
  };

  const deleteCategory = (id: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
    }));
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    setState(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, { ...supplier, id: generateId() }],
    }));
  };

  const updateSupplier = (id: string, supplier: Partial<Supplier>) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => (s.id === id ? { ...s, ...supplier } : s)),
    }));
  };

  const deleteSupplier = (id: string) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== id),
    }));
  };

  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    setState(prev => ({
      ...prev,
      customers: [...prev.customers, { ...customer, id: generateId() }],
    }));
  };

  const updateCustomer = (id: string, customer: Partial<Customer>) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.map(c => (c.id === id ? { ...c, ...customer } : c)),
    }));
  };

  const deleteCustomer = (id: string) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== id),
    }));
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    setState(prev => ({
      ...prev,
      products: [...prev.products, { ...product, id: generateId() }],
    }));
  };

  const updateProduct = (id: string, product: Partial<Product>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => (p.id === id ? { ...p, ...product } : p)),
    }));
  };

  const deleteProduct = (id: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }));
  };

  const addInvoice = (invoice: Omit<Invoice, 'id'>) => {
    const id = generateId();
    setState(prev => {
      // Update stock
      const updatedProducts = prev.products.map(p => {
        const item = invoice.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stockQuantity: p.stockQuantity - item.quantity };
        }
        return p;
      });

      // Add transaction
      const transaction: Transaction = {
        id: generateId(),
        type: 'income',
        amount: invoice.total,
        date: invoice.date,
        description: `Invoice #${id}`,
        category: 'Sales',
      };

      return {
        ...prev,
        invoices: [...prev.invoices, { ...invoice, id }],
        products: updatedProducts,
        transactions: [...prev.transactions, transaction],
      };
    });
  };

  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const id = generateId();
    setState(prev => {
      // Update stock
      const updatedProducts = prev.products.map(p => {
        const item = purchase.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stockQuantity: p.stockQuantity + item.quantity };
        }
        return p;
      });

      // Add transaction
      const transaction: Transaction = {
        id: generateId(),
        type: 'expense',
        amount: purchase.total,
        date: purchase.date,
        description: `Purchase #${id}`,
        category: 'Inventory',
      };

      return {
        ...prev,
        purchases: [...prev.purchases, { ...purchase, id }],
        products: updatedProducts,
        transactions: [...prev.transactions, transaction],
      };
    });
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, { ...transaction, id: generateId() }],
    }));
  };

  const updateSettings = (settings: Partial<AppState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  };

  return (
    <AppContext.Provider
      value={{
        state,
        addCategory,
        updateCategory,
        deleteCategory,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addProduct,
        updateProduct,
        deleteProduct,
        addInvoice,
        addPurchase,
        addTransaction,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
