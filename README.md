# Haven & Co. — Firebase Online Store

A deliberately manageable React/Vite + Firebase e-commerce application for a Software Testing and Quality Assurance course. The product is a stable, realistic System Under Test for manual testing; it does not include Playwright, Cypress, Selenium, or an automated QA suite.

## Stack and architecture

- React, Vite, JavaScript, React Router, responsive CSS
- Firebase Authentication (email/password) and Cloud Firestore
- Firebase Storage is configured but not required; product images use public URLs
- Client-side catalog filtering/sorting; Firestore-backed carts and orders

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

## Seed sample data

The seed script is intentionally non-destructive: it stops when products already exist.

```powershell
npm run seed
```

It creates four categories and sixteen products, including varied prices, low-stock products, and one out-of-stock product. To reset a test project, remove its product/category documents in the Firebase console and run the seed again.

## Admin setup

1. Register an account through the website (this always creates a `customer`).
2. In Firestore, open `users/{uid}` for that account and change only `role` to `admin` from the Firebase console or a trusted initialization script. Never expose passwords or Admin SDK credentials in this repository.
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
- The seed utility uses the browser-compatible Firebase SDK and should be run only against a disposable development/test project.
- Firestore queries may ask for the included composite index on first use; deploy `firestore.indexes.json` as shown above.
