# SuFa Inventory Management System

An industry-grade, local-first inventory management system built with React, Vite, Tailwind CSS, and Lucide icons.

## 🚀 Features

- **Dashboard**: Real-time overview of sales, purchases, and stock levels.
- **Inventory Management**: Track products, categories, and stock alerts.
- **Sales & Purchases**: Manage invoices and purchase orders with automated stock updates.
- **Accounting**: Track income and expenses with detailed transaction logs.
- **Reports**: Visual analytics for monthly performance and category distribution.
- **Local-First**: Data is stored securely in your browser's local storage.
- **Dark Mode**: Fully responsive design with dark mode support.
- **Data Portability**: Export and import your data as JSON backups.

## 📦 Deployment to GitHub Pages

This project is configured for automatic deployment to GitHub Pages.

### Automatic Deployment (Recommended)

1. Push your changes to the `main` branch.
2. The GitHub Action in `.github/workflows/deploy.yml` will automatically build and deploy the site to the `gh-pages` branch.
3. Go to your repository settings > Pages and ensure the source is set to the `gh-pages` branch.

### Manual Deployment

Run the following command in your terminal:

```bash
npm run deploy
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint the project
npm run lint
```

## 📄 License

MIT
