import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Search, AlertTriangle, ArrowUp, ArrowDown, Package } from 'lucide-react';

export const StockView: React.FC = () => {
  const { state } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  const filteredProducts = state.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'low') return matchesSearch && p.stockQuantity <= p.minStock && p.stockQuantity > 0;
    if (filter === 'out') return matchesSearch && p.stockQuantity <= 0;
    return matchesSearch;
  });

  const totalItems = state.products.reduce((acc, p) => acc + p.stockQuantity, 0);
  const lowStockItems = state.products.filter(p => p.stockQuantity <= p.minStock && p.stockQuantity > 0).length;
  const outOfStockItems = state.products.filter(p => p.stockQuantity <= 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stock Management</h1>
        <p className="text-slate-500 dark:text-slate-400">Monitor inventory levels and stock alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Stock Items</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalItems.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Low Stock Alerts</p>
              <h3 className="text-2xl font-bold text-amber-600">{lowStockItems}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Out of Stock</p>
              <h3 className="text-2xl font-bold text-rose-600">{outOfStockItems}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search stock..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full text-slate-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('low')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'low' ? 'bg-amber-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              Low Stock
            </button>
            <button 
              onClick={() => setFilter('out')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${filter === 'out' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
            >
              Out of Stock
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Level</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{p.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-500">{p.sku}</td>
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {state.categories.find(c => c.id === p.categoryId)?.name || 'Uncategorized'}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">{p.stockQuantity}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{p.minStock}</td>
                  <td className="px-6 py-4">
                    {p.stockQuantity <= 0 ? (
                      <span className="px-2 py-1 bg-rose-100 text-rose-600 rounded text-xs font-medium">Out of Stock</span>
                    ) : p.stockQuantity <= p.minStock ? (
                      <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded text-xs font-medium">Low Stock</span>
                    ) : (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded text-xs font-medium">In Stock</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
