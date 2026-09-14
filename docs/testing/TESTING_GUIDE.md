# Manual testing guide

This application is intentionally designed as a System Under Test for a three-person manual QA team. Use Chrome, Edge, and Firefox at desktop and mobile widths. Testers should create isolated customer accounts and keep an admin account separate.

## Suggested exploratory tours

- Authentication: valid/invalid registration, duplicate email, weak password, login persistence, logout.
- Catalog: search partial names, category filtering, all sort options, zero-stock product, direct product URL.
- Cart: duplicate adds, quantity limits, remove/clear, refresh synchronization, sign-out behavior.
- Checkout: required-field validation, phone validation, payment choices, stock changed before checkout, order confirmation.
- Authorization: guest routes, customer visiting `/admin`, customer profile-field editing, Firestore ownership boundaries.
- Administration: CRUD products/categories, invalid values, order status transitions, user visibility.

## Evidence and reporting

Record browser, viewport, account role, timestamp, and Firestore state when relevant. Capture the visible toast/message and a screenshot for failures. Use the included templates and do not store passwords in test evidence.
