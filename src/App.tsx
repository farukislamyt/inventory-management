import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { CategoryView } from './views/CategoryView';
import { SupplierView } from './views/SupplierView';
import { CustomerView } from './views/CustomerView';
import { ProductView } from './views/ProductView';
import { InvoiceView } from './views/InvoiceView';
import { PurchaseView } from './views/PurchaseView';
import { AccountingView } from './views/AccountingView';
import { StockView } from './views/StockView';
import { ReportView } from './views/ReportView';
import { SettingsView } from './views/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'accounting': return <AccountingView />;
      case 'invoice': return <InvoiceView />;
      case 'product': return <ProductView />;
      case 'customer': return <CustomerView />;
      case 'category': return <CategoryView />;
      case 'supplier': return <SupplierView />;
      case 'purchase': return <PurchaseView />;
      case 'stock': return <StockView />;
      case 'report': return <ReportView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <AppProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderView()}
      </Layout>
    </AppProvider>
  );
}
