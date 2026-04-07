import store from './store.js';
import { checkOnboarding } from './onboarding.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderAccounting } from './pages/accounting.js';
import { renderInvoice } from './pages/invoice.js';
import { renderProduct } from './pages/product.js';
import { renderCustomer } from './pages/customer.js';
import { renderCategory } from './pages/category.js';
import { renderSupplier } from './pages/supplier.js';
import { renderPurchase } from './pages/purchase.js';
import { renderStock } from './pages/stock.js';
import { renderReport } from './pages/report.js';
import { renderSettings } from './pages/settings.js';

// Page registry
const pages = {
  dashboard: renderDashboard,
  accounting: renderAccounting,
  invoice: renderInvoice,
  product: renderProduct,
  customer: renderCustomer,
  category: renderCategory,
  supplier: renderSupplier,
  purchase: renderPurchase,
  stock: renderStock,
  report: renderReport,
  settings: renderSettings,
};

const pageTitles = {
  dashboard: 'Dashboard',
  accounting: 'Accounting',
  invoice: 'Invoice',
  product: 'Products',
  customer: 'Customers',
  category: 'Categories',
  supplier: 'Suppliers',
  purchase: 'Purchases',
  stock: 'Stock',
  report: 'Reports',
  settings: 'Settings',
};

let currentPage = null;
let currentPageName = '';
let cleanupFn = null;

// DOM Elements
const pageContainer = document.getElementById('page-container');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuToggle = document.getElementById('menu-toggle');
const mobilePageTitle = document.getElementById('mobile-page-title');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleMobile = document.getElementById('theme-toggle-mobile');
const lowStockBadge = document.getElementById('low-stock-badge');

// ===== Router =====
function navigate(pageName) {
  if (currentPageName === pageName) return;

  // Cleanup previous page
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }

  currentPageName = pageName;
  window.location.hash = pageName;

  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  // Update mobile title
  mobilePageTitle.textContent = pageTitles[pageName] || pageName;

  // Close mobile sidebar
  closeSidebar();

  // Animate page transition
  pageContainer.classList.remove('page-enter');
  pageContainer.classList.add('page-exit');

  setTimeout(() => {
    // Render new page
    const renderFn = pages[pageName];
    if (renderFn) {
      cleanupFn = renderFn(pageContainer);
    } else {
      pageContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📄</div><div class="empty-state-title">Page Not Found</div></div>';
    }

    pageContainer.classList.remove('page-exit');
    pageContainer.classList.add('page-enter');

    // Scroll to top
    document.querySelector('.main-content')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, 150);
}

// Hash change handler
function handleHashChange() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigate(hash);
}

// ===== Sidebar =====
function openSidebar() {
  sidebar.classList.add('mobile-open');
  sidebarOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  sidebar.classList.remove('mobile-open');
  sidebarOverlay.classList.remove('active');
  document.body.style.overflow = '';
}

menuToggle.addEventListener('click', openSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Nav item clicks
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) navigate(page);
  });
});

// ===== Theme =====
function initTheme() {
  const settings = store.getSettings();
  const theme = settings.theme || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeUI(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  store.updateSettings({ theme: next });
  updateThemeUI(next);
}

function updateThemeUI(theme) {
  const icon = theme === 'dark' ? '☀️' : '🌙';
  const label = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
  document.querySelectorAll('.theme-icon').forEach(el => el.textContent = icon);
  document.querySelectorAll('.theme-label').forEach(el => el.textContent = label);
}

themeToggle.addEventListener('click', toggleTheme);
themeToggleMobile.addEventListener('click', toggleTheme);

// ===== Low Stock Badge =====
function updateLowStockBadge() {
  const count = store.getLowStockProducts().length;
  if (count > 0) {
    lowStockBadge.textContent = count;
    lowStockBadge.style.display = '';
  } else {
    lowStockBadge.style.display = 'none';
  }
}

// Subscribe to product changes to update badge
store.subscribe('products:changed', updateLowStockBadge);
store.subscribe('stockmovements:changed', updateLowStockBadge);

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
  // Ctrl+K or Cmd+K for search (future)
  // ESC to close modals
  if (e.key === 'Escape') {
    closeSidebar();
  }
});

// ===== Onboarding Check =====
const onboardingShown = checkOnboarding();

// ===== Initialize =====
initTheme();
updateLowStockBadge();

// Handle initial hash or default to dashboard
if (!window.location.hash) {
  window.location.hash = 'dashboard';
} else {
  handleHashChange();
}

window.addEventListener('hashchange', handleHashChange);

// Update badge on load
store.subscribe('dashboard:refresh', updateLowStockBadge);
