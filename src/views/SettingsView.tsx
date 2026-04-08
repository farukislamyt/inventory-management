import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Save, 
  Building, 
  Moon, 
  Sun, 
  Shield, 
  Info, 
  Download, 
  Upload, 
  RefreshCcw, 
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

export const SettingsView: React.FC = () => {
  const { state, updateSettings, exportData, importData, resetData } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    businessName: state.settings.businessName,
    currency: state.settings.currency,
    darkMode: state.settings.darkMode
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      setImportStatus(success ? 'success' : 'error');
      setTimeout(() => setImportStatus('idle'), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure your industry-grade inventory system.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" /> Export Backup
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" /> Import Data
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
            accept=".json"
          />
        </div>
      </div>

      {importStatus !== 'idle' && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
          importStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {importStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">
            {importStatus === 'success' ? 'Data imported successfully! The page will refresh.' : 'Failed to import data. Invalid file format.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Business Profile */}
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

              <div className="flex items-center justify-between pt-6">
                {showSuccess && (
                  <span className="text-sm font-medium text-emerald-600">
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

          {/* Audit Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <History className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Audit Logs</h3>
            </div>
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {state.auditLogs.map((log) => (
                    <tr key={log.id} className="text-sm">
                      <td className="px-6 py-3 text-slate-500 font-mono whitespace-nowrap">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </td>
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{log.action}</td>
                      <td className="px-6 py-3 text-slate-500">{log.details}</td>
                    </tr>
                  ))}
                  {state.auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-500">No logs available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Data Management */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Danger Zone</h3>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Resetting the system will permanently delete all your data, including products, customers, and transactions. This action cannot be undone.
            </p>
            <button 
              onClick={resetData}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/10 text-rose-600 border border-rose-100 dark:border-rose-900/30 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors text-sm font-bold"
            >
              <RefreshCcw className="w-4 h-4" /> Reset System Data
            </button>
          </div>

          {/* System Info */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <Info className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">System Info</h3>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Version</span>
                <span className="font-medium text-slate-900 dark:text-white">{state.version}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Storage</span>
                <span className="font-medium text-slate-900 dark:text-white">Local-First</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Developer</span>
                <span className="font-medium text-slate-900 dark:text-white">Faruk Islam</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
