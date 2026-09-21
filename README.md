# Haven & Co. — Firebase Online Store

A deliberately manageable React/Vite + Firebase e-commerce application for a Software Testing and Quality Assurance course. The product is a stable, realistic System Under Test for manual testing; it does not include Playwright, Cypress, Selenium, or an automated QA suite.

## Stack and architecture

- React, Vite, JavaScript, React Router, responsive CSS
- Firebase Authentication (email/password) and Cloud Firestore
- Firebase Storage is configured but not required; product images use public URLs
- Client-side catalog filtering/sorting; Firestore-backed carts and orders

The React frontend uses the Firebase Client SDK and `VITE_FIREBASE_*` variables. Trusted maintenance scripts use the Firebase Admin SDK from `scripts/` only. The Admin SDK is never imported by `src/` and is not included in the Vite browser bundle.

## Environment configuration

A single root-level `.env` file is the only source of environment-specific configuration for both local development and the VPS. It is git-ignored; `.env.example` is the tracked template.

There are two independent pipelines that read `.env`:

```text
.env --(npm run build / Vite, build time)--> VITE_FIREBASE_* embedded in dist/ --> Firebase Client SDK (browser)
.env --(dotenv, runtime)-------------------> FIREBASE_ADMIN_CREDENTIALS -------> Firebase Admin SDK (scripts/)
.env --(dotenv in ecosystem.config.cjs)---> PORT / HOST / FIREBASE_ADMIN_CREDENTIALS --> PM2 (vite preview)
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_FIREBASE_API_KEY` | Browser (Vite) | Embedded at build time |
| `VITE_FIREBASE_AUTH_DOMAIN` | Browser (Vite) | Embedded at build time |
| `VITE_FIREBASE_PROJECT_ID` | Browser (Vite) | Embedded at build time |
| `VITE_FIREBASE_STORAGE_BUCKET` | Browser (Vite) | Embedded at build time |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Browser (Vite) | Embedded at build time |
| `VITE_FIREBASE_APP_ID` | Browser (Vite) | Embedded at build time |
| `FIREBASE_ADMIN_CREDENTIALS` | Node scripts | Path to service-account JSON, never prefixed with `VITE_` |
| `HOST` | PM2 / `vite preview` | Defaults to `0.0.0.0` |
| `PORT` | PM2 / `vite preview` | Defaults to `7000` |

> **IMPORTANT — Vite variables are resolved at BUILD time.**
> `VITE_FIREBASE_*` values are replaced inside the generated JavaScript during `npm run build`. Editing `.env` and then only restarting PM2 (`pm2 restart ecommerce`) does **not** update an already-built `dist/`. After changing any `VITE_*` value you **must** run `npm run build` again, then restart PM2.

Validate the environment at any time (prints names and status only, never values):

```powershell
npm run env:check          # browser/Vite variables
npm run env:check:admin    # also checks FIREBASE_ADMIN_CREDENTIALS exists
```

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
   npm run env:check
   npm run dev
   ```

7. Install Firebase CLI if needed (`npm install -g firebase-tools`), sign in, select the project, and deploy rules/indexes:

   ```powershell
   firebase login
   firebase use YOUR_PROJECT_ID
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   If the browser reports `Missing or insufficient permissions`, deploy the repository rules while signed in with a Firebase user that has permission to manage the project:

   ```powershell
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project ecommerce-121c8
   ```

   The Admin service account may read/write Firestore while still lacking permission to deploy Firebase configuration. Use your Firebase CLI account for this deployment step.

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

   If a script reports `SERVICE_DISABLED`, open the Google Cloud API page for the project, enable **Cloud Firestore API**, create the Firestore database in the Firebase console, and run the script again. Admin SDK credentials can be valid even while the Firestore API is disabled.

### Linux VPS

Keep the service-account JSON outside the served project directory and point `.env` at it:

```bash
sudo mkdir -p /opt/ecommerce/secrets
sudo chmod 700 /opt/ecommerce/secrets
sudo cp firebase-admin.json /opt/ecommerce/secrets/firebase-admin.json
sudo chmod 600 /opt/ecommerce/secrets/firebase-admin.json
```

```env
# /opt/ecommerce/.env
FIREBASE_ADMIN_CREDENTIALS=/opt/ecommerce/secrets/firebase-admin.json
```

Relative paths in `FIREBASE_ADMIN_CREDENTIALS` are resolved from the repository root, so `./ecommerce-firebase-adminsdk.json` works when the JSON lives next to `package.json`. Do not copy the service account into `dist/`, `public/`, or another downloadable directory.

### Deployment (first install)

```bash
git clone https://github.com/NAUTH05/ecommerce.git
cd ecommerce
npm install
cp .env.example .env
nano .env          # fill in VITE_FIREBASE_* and FIREBASE_ADMIN_CREDENTIALS

npm run env:check  # verify client variables (and env:check:admin for Admin)
npm run build      # bakes VITE_FIREBASE_* into dist/
```

### PM2

`ecosystem.config.cjs` loads the root `.env` itself (`dotenv` + `path`), so `PORT`, `HOST`, and `FIREBASE_ADMIN_CREDENTIALS` come from `.env` — you do not need to `export` anything before starting PM2:

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
```

The PM2 app runs `vite preview --host <HOST> --port <PORT>` in the repository root and serves the already-built `dist/`. It does not rebuild the project and does not expose the Admin JSON to the browser.

### Updating the deployment

```bash
git pull
npm install
npm run build
pm2 restart ecosystem.config.cjs --env production --update-env
pm2 save
```

If **only** `VITE_FIREBASE_*` values changed, PM2 alone is not enough because those values live inside the built bundle:

```bash
npm run build
pm2 restart ecosystem.config.cjs --env production --update-env
```

### Debug commands

```bash
pm2 status
pm2 logs ecommerce --lines 100
npm run env:check
```

For local Vite development, the PM2 ecosystem file is not used. Start the dev server with:

```powershell
npm run dev -- --port 7000
```

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

## Admin Flow

The admin flow is part of the existing React application and is protected by both the frontend route guard and Firestore Security Rules. A user must be signed in and have `role: "admin"` in `users/{uid}`. Customers cannot change their own role or write products, categories, orders, or other users.

### Admin routes

- `/admin` — dashboard totals, recent orders, and low/out-of-stock products
- `/admin/products` — search, category filter, create link, edit, and confirmed delete
- `/admin/products/new` — validated product creation
- `/admin/products/:id/edit` — validated product editing while preserving the product ID
- `/admin/categories` — add, edit, search-free list, duplicate-name validation, and protected delete
- `/admin/orders` — search, status filter, status updates, and order detail links
- `/admin/orders/:id` — customer, shipping, payment, items, total, date, and status
- `/admin/users` — search and basic customer/role/account information

The admin sidebar includes Dashboard, Products, Categories, Orders, Users, Back to Store, and Logout. Admin operations show observable success or error messages, including invalid product values, duplicate categories, category references, invalid statuses, and denied access.

### Development workflow

```powershell
npm install
npm run dev
npm run firebase:admin -- --email admin@example.com
```

After signing out and in again, open `/admin`. Manual test cases can cover guest/customer/admin route access, product CRUD and validation, category reference protection, order search/details/status updates, user search, and attempted customer role escalation. The `firebase:admin` command is the only documented role-promotion path and runs with the trusted Firebase Admin SDK from Node.js.

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
