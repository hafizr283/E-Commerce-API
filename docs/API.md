# API examples

Base URL: `http://localhost:8081`. JSON requests and responses. The full machine-readable contract is [openapi.json](openapi.json).

Register with `POST /api/auth/register`:

```json
{"name":"Example Customer","email":"example@example.com","password":"ChooseAStrongPassword"}
```

The response contains `token`, `refreshToken`, and a `user` object. Send `Authorization: Bearer <token>` for authenticated requests. Access tokens last 15 minutes; submit the refresh token to `POST /api/auth/refresh` and replace both returned tokens. Logout uses `POST /api/auth/logout` with the bearer token.

Browse products with `GET /api/products?q=mug&category=Home%20%26%20Living&sort=priceAsc&page=0&size=12`. Pages are zero-based. Page size is clamped to 1–48. Exact category names are returned by `GET /api/categories`.

Add a cart item with `POST /api/cart/items`:

```json
{"productId":4,"quantity":2}
```

`GET /api/cart` returns items, subtotal, shipping, and total. `PATCH /api/cart/items/{id}` sets quantity; DELETE removes the item. The item ID is different from the product ID.

Checkout with `POST /api/orders`, bearer authentication, and an `Idempotency-Key` header containing a new UUID:

```json
{
  "recipient":"Example Customer",
  "phone":"01700000000",
  "address":"12 Example Road",
  "city":"Dhaka",
  "expectedTotal":1480.00
}
```

Use the total actually returned by the cart endpoint. Reuse the same header and body when retrying a failed network request. A price mismatch, unavailable stock, or changed body with the same key returns 409. On success, the order is confirmed for cash on delivery and the cart is cleared.

After a lost response, `GET /api/orders/checkout/{key}` retrieves the order placed with that key by the current customer. It returns 404 if no matching order belongs to the caller and never creates an order. The storefront uses this lookup after a checkout page reload, retaining delivery details and the retry key in sessionStorage.

`GET /api/orders` lists the authenticated customer's orders. `POST /api/orders/{id}/cancel` cancels a confirmed order and restores stock. Customers cannot cancel shipped orders.

Admin endpoints require an ADMIN bearer token:

| Method | Path | Purpose |
|---|---|---|
| GET | /api/admin/dashboard | Collected revenue, order and inventory counts |
| GET / POST | /api/admin/products | List all / create |
| PUT / DELETE | /api/admin/products/{id} | Replace fields / deactivate |
| GET | /api/admin/orders | Paginated order management |
| PATCH | /api/admin/orders/{id}/status | Body: `{"status":"SHIPPED"}` or DELIVERED/CANCELLED |

DELIVERED also records cash collection as PAID. The admin UI labels the action “Delivered & paid”. There is no external payment gateway.

Product responses include `version`. Include that value in `PUT /api/admin/products/{id}` along with the editable fields. A missing version returns 400; a version made stale by another edit, purchase, cancellation, or deactivation returns 409. Reload the product and review its current stock before resubmitting. Product creation does not require a version.

Errors use `{"message":"..."}` and validation errors also contain a `fields` map. Typical status codes: 400 invalid request, 401 unauthenticated, 403 unauthorized role, 404 missing/not-owned record, 409 conflict.
