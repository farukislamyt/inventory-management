import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  AlertTriangle, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <h3 className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">{value}</h3>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-500" />
            )}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trendValue}%
            </span>
            <span className="text-xs text-slate-400 ml-1">vs last month</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { state } = useApp();

  const totalSales = state.invoices.reduce((acc, inv) => acc + inv.total, 0);
  const totalPurchases = state.purchases.reduce((acc, pur) => acc + pur.total, 0);
  const totalStockValue = state.products.reduce((acc, prod) => acc + (prod.stockQuantity * prod.price), 0);
  const lowStockCount = state.products.filter(p => p.stockQuantity <= p.minStock).length;

  // Mock data for charts if no real data exists
  const chartData = [
    { name: 'Jan', sales: 4000, purchases: 2400 },
    { name: 'Feb', sales: 3000, purchases: 1398 },
    { name: 'Mar', sales: 2000, purchases: 9800 },
    { name: 'Apr', sales: 2780, purchases: 3908 },
    { name: 'May', sales: 1890, purchases: 4800 },
    { name: 'Jun', sales: 2390, purchases: 3800 },
  ];

  const recentTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="text-slate-500 dark:text-slate-400">Welcome back, Faruk! Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Sales" 
          value={`${state.settings.currency} ${totalSales.toLocaleString()}`}
          icon={TrendingUp}
          trend="up"
          trendValue="12.5"
          color="bg-blue-600"
        />
        <StatCard 
          title="Total Purchases" 
          value={`${state.settings.currency} ${totalPurchases.toLocaleString()}`}
          icon={TrendingDown}
          trend="down"
          trendValue="4.2"
          color="bg-rose-600"
        />
        <StatCard 
          title="Stock Value" 
          value={`${state.settings.currency} ${totalStockValue.toLocaleString()}`}
          icon={Package}
          color="bg-amber-600"
        />
        <StatCard 
          title="Low Stock Items" 
          value={lowStockCount}
          icon={AlertTriangle}
          color="bg-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Sales & Purchases</h3>
            <select className="bg-slate-50 dark:bg-slate-800 border-none text-sm rounded-lg focus:ring-0 text-slate-600 dark:text-slate-400">
              <option>Last 6 Months</option>
              <option>Last 12 Months</option>
            </select>
          </div>
          <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm italic">Chart visualization temporarily disabled for troubleshooting.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white">Recent Transactions</h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{tx.description}</p>
                      <p className="text-xs text-slate-500">{format(new Date(tx.date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'income' ? '+' : '-'}{state.settings.currency}{tx.amount.toLocaleString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">No transactions yet.</p>
              </div>
            )}
          </div>
          <button className="w-full mt-6 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
            View All Transactions
          </button>
        </div>
      </div>
    </div>
  );
};
