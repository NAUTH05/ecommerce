# Haven & Co. — Firebase Online Store

A deliberately manageable React/Vite + Firebase e-commerce application for a Software Testing and Quality Assurance course. The product is a stable, realistic System Under Test for manual testing; it does not include Playwright, Cypress, Selenium, or an automated QA suite.

## Stack and architecture

- React, Vite, JavaScript, React Router, responsive CSS
- Firebase Authentication (email/password) and Cloud Firestore
- Firebase Storage is configured but not required; product images use public URLs
- Client-side catalog filtering/sorting; Firestore-backed carts and orders

The React frontend uses the Firebase Client SDK and `VITE_FIREBASE_*` variables. Trusted maintenance scripts use the Firebase Admin SDK from `scripts/` only. The Admin SDK is never imported by `src/` and is not included in the Vite browser bundle.

## Windows setup

1. Install Node.js 18+ from https://nodejs.org/.
2. Create a Firebase project at https://console.firebase.google.com/.
3. In **Authentication → Sign-in method**, enable **Email/Password**.
4. Create a Firestore database in production mode, then download/copy the Web app configuration.
5. Copy `.env.example` to `.env` in PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   Fill each `VITE_FIREBASE_*` value with the Firebase Web app values.
6. Install and run:

   ```powershell
   npm install
   npm run dev
   ```

7. Install Firebase CLI if needed (`npm install -g firebase-tools`), sign in, select the project, and deploy rules/indexes:

   ```powershell
   firebase login
   firebase use YOUR_PROJECT_ID
   firebase deploy --only firestore:rules,firestore:indexes
   ```

## Firebase Admin SDK Setup

The service-account JSON is a secret. Never commit it, place it in `dist/` or `public/`, expose it through a `VITE_*` variable, or print its contents. If a key is exposed, revoke and regenerate it in Firebase / Google Cloud.

### Local Windows

1. Copy `.env.example` to `.env` and keep the existing `VITE_FIREBASE_*` values for the browser.
2. Set the Node-only credential path in `.env`:

   ```env
   FIREBASE_ADMIN_CREDENTIALS=./ecommerce-firebase-adminsdk.json
   ```

   An absolute path is also supported, for example `C:/Users/User/project/ecommerce-firebase-adminsdk.json` or `C:\\Users\\User\\project\\ecommerce-firebase-adminsdk.json`.
3. Run trusted scripts from the repository root:

   ```powershell
   npm run firebase:seed
   npm run firebase:admin -- --email admin@example.com
   ```

   `firebase:admin` updates only the target user's Firestore profile to `role: admin`; it does not create or change passwords.

### Linux VPS

Store the credential outside the publicly served project directory:

```bash
sudo mkdir -p /opt/ecommerce/secrets
sudo chmod 700 /opt/ecommerce/secrets
sudo cp firebase-admin.json /opt/ecommerce/secrets/firebase-admin.json
sudo chmod 600 /opt/ecommerce/secrets/firebase-admin.json
export FIREBASE_ADMIN_CREDENTIALS=/opt/ecommerce/secrets/firebase-admin.json
```

Run `npm run build` before serving the static site. Admin scripts can then be run with the exported variable. Do not copy the service account into `dist/`, `public/`, or another downloadable directory.

### PM2

This repository has no Node application server; Firebase Hosting can serve `dist` directly. `ecosystem.config.cjs` is provided only when a VPS needs PM2 to keep Vite's production preview process alive:

```bash
export FIREBASE_ADMIN_CREDENTIALS=/opt/ecommerce/secrets/firebase-admin.json
npm run build
pm2 start ecosystem.config.cjs --env production
pm2 save
```

The PM2 app serves `dist` on port `4173` and passes `FIREBASE_ADMIN_CREDENTIALS` to its process. It does not expose the JSON or turn Admin SDK code into frontend code. Update the fallback path in `ecosystem.config.cjs` or set the environment variable before starting PM2 when the VPS uses another location.

## Seed sample data

The seed script is intentionally non-destructive: it stops when products already exist.

```powershell
npm run firebase:seed
```

It creates four categories and sixteen products, including varied prices, low-stock products, and one out-of-stock product. To reset a test project, remove its product/category documents in the Firebase console and run the seed again.

## Admin setup

1. Register an account through the website (this always creates a `customer`).
2. Run `npm run firebase:admin -- --email admin@example.com` from a trusted Node environment, or use `--uid FIREBASE_UID`.
3. Sign out/in again; the Admin link appears after the profile is reloaded.

The frontend never lets a customer choose or update their role. `firestore.rules` also prevents customer role changes and protects product/category administration.

## Firestore collections

- `users/{uid}` — profile, email, role, phone, address, timestamps
- `categories/{categoryId}` — name and icon
- `products/{productId}` — catalog data, price, stock, category, image URL
- `carts/{uid}/items/{productId}` — current user cart snapshots
- `orders/{orderId}` — shipping, payment, status, total, and an order-item snapshot

Checkout re-reads products in a Firestore transaction, recalculates current prices, verifies stock, decrements stock, creates the order, and clears the cart. For stronger production guarantees, stock/order orchestration would normally move to a trusted Cloud Function; this course project keeps the architecture client-simple while rules restrict stock updates to decrement-only operations.

## Manual testing documentation

See `docs/testing/TESTING_GUIDE.md`, `TEST_CASE_TEMPLATE.md`, and `BUG_REPORT_TEMPLATE.md`. Important visible feedback includes invalid login, out-of-stock, stock-limit, missing checkout fields, successful cart operations, successful profile updates, order confirmation, and permission denial.

## Known limitations

- Product image upload is not implemented; public image URLs are used to keep the project small.
- No real payment gateway, email verification, password reset, or automated tests.
- The seed and maintenance utilities use Firebase Admin SDK credentials and should be run only from a trusted environment, preferably against a disposable development/test project.
- Firestore queries may ask for the included composite index on first use; deploy `firestore.indexes.json` as shown above.

## Trusted maintenance commands

```powershell
npm run firebase:seed
npm run firebase:admin -- --email admin@example.com
npm run firebase:reset-test-data -- --confirm
```

`firebase:reset-test-data` deletes test orders and carts, replaces products and categories with the seed data, and preserves all Firebase Authentication users. It requires `--confirm` and never runs during application startup.
