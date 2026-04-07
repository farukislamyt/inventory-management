import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Save, User, Building, Globe, Moon, Sun, Shield, Info } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { state, updateSettings } = useApp();
  const [formData, setFormData] = useState({
    businessName: state.settings.businessName,
    currency: state.settings.currency,
    darkMode: state.settings.darkMode
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Configure your system preferences.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Building className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">Business Profile</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
              <input 
                type="text" required
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Symbol</label>
              <select 
                value={formData.currency}
                onChange={(e) => setFormData({...formData, currency: e.target.value})}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="BDT">BDT (৳)</option>
                <option value="INR">INR (₹)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Sun className="w-4 h-4" /> Appearance
            </h4>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-xs text-slate-500">Toggle between light and dark themes.</p>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, darkMode: !formData.darkMode})}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.darkMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.darkMode ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4" /> Security & Data
            </h4>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-400">
                All your data is stored locally in your browser. Clearing your browser cache or using Incognito mode will reset the system. We recommend backing up your data regularly.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6">
            {showSuccess && (
              <span className="text-sm font-medium text-emerald-600 animate-fade-in">
                Settings saved successfully!
              </span>
            )}
            <button 
              type="submit"
              className="ml-auto flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">About System</h3>
        </div>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">System Version</span>
            <span className="font-medium text-slate-900 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Developer</span>
            <span className="font-medium text-slate-900 dark:text-white">Faruk Islam</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Website</span>
            <a href="https://farukislamyt.github.io" target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline">
              farukislamyt.github.io
            </a>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-slate-500">Storage Type</span>
            <span className="font-medium text-slate-900 dark:text-white">Browser Local Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
