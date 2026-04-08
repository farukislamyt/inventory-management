import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Category, Customer, Invoice, Product, Purchase, Supplier, Transaction, AuditLog } from '../types';

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
  completeOnboarding: () => void;
  exportData: () => void;
  importData: (data: string) => boolean;
  resetData: () => void;
}

const STORAGE_KEY = 'sufa_inventory_state';
const CURRENT_VERSION = '1.1.0';

const initialState: AppState = {
  version: CURRENT_VERSION,
  onboarded: false,
  categories: [],
  suppliers: [],
  customers: [],
  products: [],
  invoices: [],
  purchases: [],
  transactions: [],
  auditLogs: [],
  settings: {
    businessName: 'SuFa Inventory',
    currency: 'USD',
    darkMode: false,
    language: 'en',
  },
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return initialState;
      
      const parsed = JSON.parse(saved);
      // Deep merge with initialState to ensure all new fields exist
      return {
        ...initialState,
        ...parsed,
        settings: {
          ...initialState.settings,
          ...(parsed.settings || {}),
        },
        // Ensure arrays exist even if missing in old state
        categories: parsed.categories || [],
        suppliers: parsed.suppliers || [],
        customers: parsed.customers || [],
        products: parsed.products || [],
        invoices: parsed.invoices || [],
        purchases: parsed.purchases || [],
        transactions: parsed.transactions || [],
        auditLogs: parsed.auditLogs || [],
      };
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
      return initialState;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
    
    if (state.settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addAuditLog = (action: string, details: string) => {
    const log: AuditLog = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action,
      details,
      user: 'Admin',
    };
    setState(prev => ({
      ...prev,
      auditLogs: [log, ...prev.auditLogs].slice(0, 100), // Keep last 100 logs
    }));
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, onboarded: true }));
    addAuditLog('Onboarding', 'System setup completed');
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `sufa_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    addAuditLog('Export', 'Data backup exported');
  };

  const importData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version) {
        setState(parsed);
        addAuditLog('Import', 'Data backup imported');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const resetData = () => {
    if (window.confirm('Are you sure you want to reset ALL data? This cannot be undone.')) {
      setState(initialState);
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };

  const addCategory = (category: Omit<Category, 'id'>) => {
    setState(prev => ({
      ...prev,
      categories: [...prev.categories, { ...category, id: generateId() }],
    }));
    addAuditLog('Category', `Added category: ${category.name}`);
  };

  const updateCategory = (id: string, category: Partial<Category>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(c => (c.id === id ? { ...c, ...category } : c)),
    }));
    addAuditLog('Category', `Updated category ID: ${id}`);
  };

  const deleteCategory = (id: string) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
    }));
    addAuditLog('Category', `Deleted category ID: ${id}`);
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    setState(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, { ...supplier, id: generateId() }],
    }));
    addAuditLog('Supplier', `Added supplier: ${supplier.name}`);
  };

  const updateSupplier = (id: string, supplier: Partial<Supplier>) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.map(s => (s.id === id ? { ...s, ...supplier } : s)),
    }));
    addAuditLog('Supplier', `Updated supplier ID: ${id}`);
  };

  const deleteSupplier = (id: string) => {
    setState(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== id),
    }));
    addAuditLog('Supplier', `Deleted supplier ID: ${id}`);
  };

  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    setState(prev => ({
      ...prev,
      customers: [...prev.customers, { ...customer, id: generateId() }],
    }));
    addAuditLog('Customer', `Added customer: ${customer.name}`);
  };

  const updateCustomer = (id: string, customer: Partial<Customer>) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.map(c => (c.id === id ? { ...c, ...customer } : c)),
    }));
    addAuditLog('Customer', `Updated customer ID: ${id}`);
  };

  const deleteCustomer = (id: string) => {
    setState(prev => ({
      ...prev,
      customers: prev.customers.filter(c => c.id !== id),
    }));
    addAuditLog('Customer', `Deleted customer ID: ${id}`);
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    setState(prev => ({
      ...prev,
      products: [...prev.products, { ...product, id: generateId() }],
    }));
    addAuditLog('Product', `Added product: ${product.name}`);
  };

  const updateProduct = (id: string, product: Partial<Product>) => {
    setState(prev => ({
      ...prev,
      products: prev.products.map(p => (p.id === id ? { ...p, ...product } : p)),
    }));
    addAuditLog('Product', `Updated product ID: ${id}`);
  };

  const deleteProduct = (id: string) => {
    setState(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }));
    addAuditLog('Product', `Deleted product ID: ${id}`);
  };

  const addInvoice = (invoice: Omit<Invoice, 'id'>) => {
    const id = generateId();
    setState(prev => {
      const updatedProducts = prev.products.map(p => {
        const item = invoice.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stockQuantity: p.stockQuantity - item.quantity };
        }
        return p;
      });

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
    addAuditLog('Invoice', `Created invoice #${id}`);
  };

  const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
    const id = generateId();
    setState(prev => {
      const updatedProducts = prev.products.map(p => {
        const item = purchase.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stockQuantity: p.stockQuantity + item.quantity };
        }
        return p;
      });

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
    addAuditLog('Purchase', `Created purchase order #${id}`);
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setState(prev => ({
      ...prev,
      transactions: [...prev.transactions, { ...transaction, id: generateId() }],
    }));
    addAuditLog('Transaction', `Added ${transaction.type}: ${transaction.description}`);
  };

  const updateSettings = (settings: Partial<AppState['settings']>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
    addAuditLog('Settings', 'System settings updated');
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
        completeOnboarding,
        exportData,
        importData,
        resetData,
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
