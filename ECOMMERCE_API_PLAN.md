# E-commerce API implementation plan

This is the original roadmap, retained for context. The delivered portfolio application implements the cash-on-delivery scope: Spring Boot/MySQL API, Angular storefront and admin workspace, authentication, catalog, cart, transactional checkout, order fulfillment, schema migrations, automated tests, and local launch tooling. See README.md and summery.md for current verification and run instructions.

The broader commercial features below remain future work: online payment integration and refunds, saved addresses, a separate category entity, image uploads/object storage, email verification/password reset, notifications, and public production deployment. They are not required for the local cash-on-delivery demo. Explicit Java constructors and accessors are used throughout; no Lombok.

## 1. Make the foundation reliable

- Restore the Spring Security starter dependency: it is currently commented out although SecurityConfig and AuthService require it.
- Keep DemoApplication as the entry point; remove unused empty scaffolding when replacing it with real features.
- Add development, test, and production configuration. Read database credentials and JWT secrets from environment variables.
- Add Flyway migrations for schema changes; use Hibernate schema validation in production.
- Add a global exception handler with consistent errors: 400 for invalid input, 401 for unauthenticated requests, 403 for forbidden actions, 404 for missing resources, and 409 for conflicts.
- Use request and response DTOs rather than returning database entities. Never return password hashes.
- Document the API with OpenAPI and provide example requests.

Acceptance: application starts against a development database; migrations and validation run; errors have a consistent format.

## 2. Complete authentication and authorization

- Finish LoginRequest and implement password verification with BCrypt.
- Connect token verification to Spring Security using a JWT authentication filter or its resource-server support. A token utility alone does not authenticate HTTP requests.
- Review and upgrade the legacy JWT library before completing token handling.
- Keep registration and login public. Permit public product browsing; require USER or ADMIN access for customer actions and ADMIN for catalog management.
- Derive the current user's ID from authentication, never from a user-supplied ownership field.
- Add short-lived access tokens and rotating refresh tokens stored as hashes. Revoke refresh tokens on logout; define whether immediate access-token revocation is required.
- Enforce email uniqueness in the database and handle simultaneous duplicate registrations gracefully. Add login rate limiting, password reset, and email verification before public launch.
- Remove the /registernew demonstration endpoint from production.

Endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/users/me.

Acceptance: registration and login work; expired or invalid tokens fail; a customer cannot access admin routes or another customer's data.

## 3. Implement the product catalog

- Complete ProductRequest, ProductService, and ProductController; add a ProductResponse DTO.
- Change money fields from Double to BigDecimal with explicit database precision/scale and currency. Define rounding rules.
- Add a Category entity, product images, timestamps, and an active flag. Use object storage for images and store their references in the database.
- Validate price, stock, name, and category. Support pagination, sorting, keyword search, and category filtering with limits on page size.
- Allow admins to create, update, and deactivate products. Preserve historical order data when products change.

Endpoints: GET /api/products, GET /api/products/{id}, GET /api/categories; admin POST/PATCH/DELETE product routes.

Acceptance: public browsing works; only admins can modify products; invalid prices and stock quantities are rejected.

## 4. Implement the shopping cart

- Add Cart and CartItem entities. Each user has one cart; each item references a product and a positive quantity.
- Enforce one row per product per cart using a database constraint.
- Implement add, set quantity, remove, and clear operations. Check ownership on every operation.
- Calculate totals on the server. A cart does not reserve stock; availability and prices must be checked again during checkout.

Endpoints: GET /api/cart, POST /api/cart/items, PATCH /api/cart/items/{itemId}, DELETE /api/cart/items/{itemId}, DELETE /api/cart.

Acceptance: carts remain separate between users; quantities and totals are correct; inactive products cannot be added.

## 5. Implement transactional checkout and orders

- Add Address, Order, and OrderItem entities. Copy product name/SKU, unit price, currency, and shipping address into the order as historical snapshots.
- Calculate subtotal, discounts, shipping, tax, and final total on the server. Start with explicit fixed shipping rules and no coupons; define tax rules for the intended market.
- In one database transaction, validate the cart, reserve/decrement stock atomically, and create the order and items. Use conditional stock updates or locking to prevent two buyers purchasing the last unit.
- Require an idempotency key on checkout. Bind it to the authenticated user and request contents with a uniqueness constraint so retries cannot create duplicate orders.
- Define allowed order transitions: PENDING_PAYMENT -> CONFIRMED -> SHIPPED -> DELIVERED, with cancellation rules before shipment.
- Release reserved stock exactly once on cancellation or payment expiry. Define a scheduled expiry process and handle the race between expiry and late payment.
- Customers can see their own orders; admins can manage fulfillment. Support cash on delivery first if appropriate, keeping payment status separate from fulfillment status.

Endpoints: POST /api/orders, GET /api/orders, GET /api/orders/{id}, POST /api/orders/{id}/cancel; admin order-list and status-update routes.

Acceptance: checkout retries create one order; simultaneous checkout cannot oversell; transaction failures do not leave partial orders or stock changes.

## 6. Integrate payments and fulfillment

- Choose a provider for the intended market, such as SSLCommerz or Stripe, and integrate its sandbox first.
- Add Payment records with provider references, amount, currency, and payment status. Create payment sessions outside long database transactions and use provider idempotency support.
- Verify webhook signatures, amount, currency, and order references. Deduplicate webhook events and handle events arriving out of order.
- Mark payment successful only from verified provider evidence; a browser redirect is not proof of payment.
- Add reconciliation for uncertain or missed payment events, refunds with idempotency, shipment tracking, and order notifications through a retryable background queue/outbox.

Endpoints: POST /api/orders/{id}/payments, POST /api/payments/webhook; admin refund and shipment routes.

Acceptance: successful, failed, duplicated, delayed, and refunded payment scenarios behave correctly without duplicate charges or fulfillment.

## 7. Test and prepare for deployment

- Unit-test service rules for pricing, order transitions, and cancellation.
- Use controller/security tests for validation, HTTP responses, role checks, and ownership checks.
- Use Testcontainers with MySQL for migrations, database constraints, checkout concurrency, rollback, and payment-event deduplication. Keep tests isolated from the development and production databases.
- Run build and tests in CI. Add health/readiness checks, structured logs without credentials or tokens, monitoring, database backups, and a tested restore procedure.
- Deploy over HTTPS with explicit CORS rules. Configure CSRF protection according to how credentials are transported, particularly if using cookies.
- Publish OpenAPI documentation, an environment-variable example without secrets, and a deployment guide.

Acceptance: a customer can register, browse, add to cart, place an order, pay, and view its status; an admin can manage catalog, shipment, cancellation, and refund workflows; failure-path tests pass.

## Core relationships

- User has one Cart, many Orders, and many saved Addresses.
- Cart has many CartItems; each CartItem references a Product.
- Category has many Products.
- Order has many OrderItems and Payments, plus an address snapshot.
- OrderItems preserve purchase details even if a Product is changed or deactivated.

Recommended delivery order: foundation -> authentication -> catalog -> cart -> checkout with cash on delivery -> online payments -> production readiness. Add tests with each milestone. Reviews, coupons, wishlists, and recommendations can follow the complete purchase flow.
