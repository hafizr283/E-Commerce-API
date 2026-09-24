# AI handoff — Atelier commerce project

Status: implemented and verified on 2026-09-17. See Verification results below.

## User intent
Build a CV-worthy full-stack e-commerce application from the existing Spring Boot scaffold, with Angular and the user's installed MySQL. Do not use Lombok. User explicitly requested this file as `summery.md` (keep that spelling). Prefer demonstrated engineering and honest claims over inflated metrics.

## Architecture and decisions
- Root: E:/java_development/demo; original working directory is its src subdirectory.
- Spring Boot 4.1.1, Java release 21, Spring Security OAuth2 resource server, JPA, Flyway.
- Angular 22.1.6, standalone lazy-loaded pages, strict TypeScript 6, signals, zoneless Angular, CSS design system.
- MySQL 8.0 on this device. Dedicated `atelier_store` and `atelier_store_test` schemas. Existing databases are not migrated or altered.
- Credentials and signing secrets exist only in ignored config/application-local.properties and config/application-mysqltest.properties. NEVER print their contents, copy them into documentation, or commit them.
- local is the default profile. demo uses optional H2 file database; test uses isolated H2 in memory; prod requires environment variables.
- Local sample users/catalog are opt-in via app.seed-demo=true, enabled in this machine's ignored local configuration and the optional demo profile.
- Access tokens expire after 15 minutes. Refresh tokens are random, stored hashed, rotate on use, and expire after seven days. Resource-server validation checks the database session; logout revokes that session immediately.
- Prices use BigDecimal; BDT currency. Shipping is BDT 120, free from BDT 5000. No extra tax is added. Cash on delivery is implemented; online payments are NOT implemented.
- Checkout serializes per user, locks products in ID order, refreshes locked state to avoid stale first-level-cache values, snapshots price/address, clears the cart, and persists the order within one transaction.
- Checkout idempotency is scoped to user and key, with a delivery-details fingerprint. Cancellation restores stock once. Allowed order transitions: CONFIRMED -> SHIPPED -> DELIVERED, or CONFIRMED -> CANCELLED.
- ADMIN can manage products and fulfillment. Customer resource ownership is enforced server-side. Product deletion means deactivation.
- No Lombok. Entities and request DTOs have explicit constructors/accessors; immutable response DTOs use Java's native records.
- Preserve the user's existing unrelated changes to DemoApplication, practice files, and discussion files. RegisterController is retained under the explicit practice profile.

## Verification results (2026-09-17)
All four verification commands were executed on this machine and passed.

| Command | Result |
|---|---|
| `mvn package` (H2, `test` profile) | 12 tests passed; executable JAR produced |
| `mvn -Dtest.profile=mysqltest test` (MySQL 8.0 service on this device) | 12 tests passed |
| `ng build` (production) | Succeeded; 312.83 kB initial, 84.45 kB transfer |
| `playwright test` | 14 runs passed (7 specs x desktop and mobile Chromium) |

Backend coverage is 11 integration tests plus the context test: registration/uniqueness, refresh rotation and logout revocation, role and cart ownership, checkout retry and cancellation stock accounting, whole-order rollback, concurrent last-unit purchase, snapshot durability with restricted fulfillment, changed-price rejection, admin catalog validation and soft delete, stale-edit inventory protection, and owner-scoped checkout recovery.

Defect found and fixed during this verification pass: `message()` in `frontend/src/app/models.ts` read `error.error.message` before testing `status === 0`. On a dropped connection Angular's fetch backend sets `status: 0` and puts the browser's own `TypeError` in `error`, so the UI showed the raw string "Failed to fetch" instead of the intended "temporarily unavailable" copy. Two Playwright specs covering lost-response recovery and checkout retry were failing on both projects because of it. The status check now runs first, and a non-string or `Error`-shaped body falls through to the generic message. All 14 runs pass after the fix.

Not executed here: the Docker/Compose build (Docker is not on this machine's PATH) and the GitHub Actions workflow (never dispatched). Both remain unproven claims and README says so.

## Environment gotchas
- Default PATH Node is 20 and is too old for Angular 22. Bundled Node 24.19 is at C:/Users/hafiz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe.
- npm CLI can be run with that Node and E:/Tools/node-v20.18.0-win-x64/node_modules/npm/bin/npm-cli.js. Use frontend as working directory.
- Python defaults to Windows encoding. Use python -X utf8 and explicit UTF-8 writes.
- Maven is available. Run from repository root; local configuration is loaded relative to that root.
- API development server was started on localhost:8081; inspect processes before starting duplicates.

## Remaining housekeeping
- `scripts/scaffold_api.py`, `scaffold_backend.py`, and `scaffold_services.py` are the one-shot generators that produced the original source. They are referenced by nothing and re-running one would overwrite hand-finished code, so they should be deleted. Left in place pending the owner's confirmation because they are untracked and deletion is unrecoverable.
- The whole application is still uncommitted in Git (one large untracked/modified working tree on `main`). Commit when the owner asks.
- The Codex-side task heartbeat `continue-e-commerce-implementation` was created by a different tool and cannot be removed from a Claude Code session. Delete it there.
- Docker and CI remain unexecuted; run `docker compose up --build` and dispatch the workflow before claiming either works.
