# Portfolio evidence and interview guide

## Suggested CV entry

**Atelier — Full-stack E-commerce Application** | Angular 22, Java 21, Spring Boot, Spring Security, MySQL, JPA, Flyway, Playwright

- Built a responsive Angular storefront and admin workspace backed by a Spring Boot REST API, supporting catalog search, persistent carts, cash-on-delivery checkout, and order fulfillment.
- Implemented transactional inventory reservation, idempotent checkout, and one-time stock restoration; reproduced and fixed a MySQL concurrency bug with a simultaneous last-unit purchase test.
- Added role-based access control, hashed rotating refresh tokens, immediate session revocation, and customer ownership checks; verified workflows with 10 backend tests on H2/MySQL and 6 desktop/mobile browser tests.

Use only claims you understand and can demonstrate. No measured throughput, production users, uptime, or public deployment is claimed. CI and container configuration exist, but their hosted/container runs have not yet been verified.

## Evidence map

| Claim | Source / demonstration |
|---|---|
| Full customer journey | frontend/e2e/store.spec.ts; register -> bag -> checkout -> orders |
| Admin management | frontend/src/app/admin.ts; ProductController and OrderController |
| Atomic inventory and idempotency | OrderService; ProductRepository.reserveStock; checkout integration tests |
| MySQL-specific regression | CommerceIntegrationTests.concurrentCustomersCannotBuyTheSameLastUnit |
| Transaction rollback | checkoutRollsBackAllItemsWhenOneIsUnavailable |
| Reviewed totals | checkoutRejectsChangedPricesWithoutChargingAnUnreviewedTotal |
| Session security | AuthService, JwtConfig, SecurityConfig; refreshRotationAndLogoutRevokeAccess |
| Ownership checks | rolesAndCartOwnershipAreEnforced |
| Historical order data | snapshotsSurviveProductChangesAndFulfillmentIsRestricted |
| API contract | docs/openapi.json, 24 operations |
| Delivery configuration | Dockerfile, compose.yaml, frontend/nginx.conf, .github/workflows/ci.yml |

## Five-minute demonstration

1. Open the storefront at desktop and mobile widths. Filter a category and search for a product.
2. Register a customer, add an item, change quantity, and complete cash-on-delivery checkout.
3. Show the order snapshot, then cancel an unshipped order and demonstrate stock restoration.
4. Sign in as the local demo admin. Create/edit/hide a product and advance a separate order through shipping and paid delivery.
5. Run the MySQL integration suite. Explain why the last-unit concurrency regression mattered and how the conditional SQL update solves it.

## Prepare to answer

- Why is a Java `if (stock >= quantity)` insufficient under concurrent requests?
- What rolls back when the second product in an order becomes unavailable?
- Why are shipping details and unit prices copied into order items?
- How does checkout retry protection differ from disabling the submit button?
- Why did a test pass on H2 but fail on MySQL?
- Why check JWT sessions in the database, and what is the cost?
- What are the security tradeoffs of browser sessionStorage?
- How would you add verified payment webhooks, stock reservation expiry, and refunds?

## Highest-value next improvements

1. Deploy a public demo with HTTPS, isolated demo data, monitoring, and a repeatable reset process.
2. Integrate a provider sandbox (for example SSLCommerz) with signed webhooks, event deduplication, and refunds.
3. Add email verification/password reset, authenticated image uploads, and optimistic concurrency for admin inventory edits.
4. Run and document a reproducible load test before adding performance numbers to the CV.
