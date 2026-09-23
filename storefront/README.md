# Storefront

Customer-facing React website for the admin panel. Reads categories, subcategories, products, banners, and FAQs from the admin panel's backend, and lets customers place orders. No login required for customers — only the admin panel needs a login.

## Run locally

The admin panel backend must be running first (`npm start` from the project root, on port 3000).

```
cd storefront
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Configuration

`.env` sets which backend to talk to:

```
VITE_API_URL=http://localhost:3000
```

For a deployed backend (e.g. Render), set this to the live URL before building.

## Build for production

```
npm run build
```

Outputs static files to `dist/`, which can be deployed to Netlify, Vercel, or any static host.

## Pages

- `/` — Home: banners, category shortcuts, featured products
- `/products` — Full product catalog with category/subcategory filters
- `/products/:id` — Product detail with a "Place Order" form
- `/faq` — FAQ accordion

All data is managed from the admin panel (Categories, Subcategories, Products, Banners, FAQ pages).
