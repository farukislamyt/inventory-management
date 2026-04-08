import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

export const ReportView: React.FC = () => {
  const { state } = useApp();

  // Calculate monthly sales for the last 6 months
  const last6Months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date()
  });

  const monthlyData = last6Months.map(month => {
    const monthStr = format(month, 'MMM');
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const sales = state.invoices
      .filter(inv => {
        const date = new Date(inv.date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((acc, inv) => acc + inv.total, 0);

    const purchases = state.purchases
      .filter(pur => {
        const date = new Date(pur.date);
        return date >= monthStart && date <= monthEnd;
      })
      .reduce((acc, pur) => acc + pur.total, 0);

    return { name: monthStr, sales, purchases };
  });

  // Calculate category distribution
  const categoryData = state.categories.map(cat => {
    const count = state.products.filter(p => p.categoryId === cat.id).length;
    return { name: cat.name, value: count };
  }).filter(c => c.value > 0);

  const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0891b2'];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400">Detailed insights into your business performance.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white">Monthly Performance</h3>
          <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm italic">Chart visualization temporarily disabled.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white">Category Distribution</h3>
          <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm italic">Chart visualization temporarily disabled.</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-lg mb-6 text-slate-900 dark:text-white">Profit Trend</h3>
          <div className="h-[300px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm italic">Chart visualization temporarily disabled.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
