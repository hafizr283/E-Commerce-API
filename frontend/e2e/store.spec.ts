import { test, expect, Page } from "@playwright/test";

async function registerShopper(page: Page) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Recovery Test");
  await page
    .getByLabel("Email address")
    .fill(`recovery-${crypto.randomUUID()}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("BrowserTest123!");
  await page
    .getByRole("button", { name: "Create account →", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
}

async function authorization(page: Page) {
  const token = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem("atelier-session")!).token,
  );
  return { Authorization: `Bearer ${token}` };
}

async function prepareCheckout(page: Page) {
  await registerShopper(page);
  await page
    .getByRole("button", { name: "Add Stoneware Mug to bag", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Shopping bag", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Continue to checkout →" }).click();
  await page.getByLabel("Full name").fill("Recovery Test");
  await page.getByLabel("Phone number").fill("01700000000");
  await page.getByLabel("Street address").fill("12 Recovery Road");
  await page.getByLabel("City", { exact: true }).fill("Dhaka");
}

test("catalog search, empty state, and responsive layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good things. Great everyday." }),
  ).toBeVisible();
  await expect(page.locator(".product-card").first()).toBeVisible();
  await page
    .getByLabel("Search products", { exact: true })
    .fill("Stoneware Mug");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByLabel("Search products", { exact: true })
    .fill("no-product-exists-92847");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No matches just yet.")).toBeVisible();
  await page.getByRole("button", { name: "Show all products" }).click();
  await expect(page.locator(".product-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("register, cart, checkout, cancellation, and logout", async ({ page }) => {
  await page.goto("/login");
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Browser Test");
  await page
    .getByLabel("Email address")
    .fill(
      `browser-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`,
    );
  await page.getByLabel("Password", { exact: true }).fill("BrowserTest123!");
  await page
    .getByRole("button", { name: "Create account →", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add Stoneware Mug to bag", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Shopping bag", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Stoneware Mug", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Increase quantity of Stoneware Mug" })
    .click();
  await expect(page.locator(".stepper span")).toHaveText("2");
  await page.getByRole("link", { name: "Continue to checkout →" }).click();
  await page.getByLabel("Full name").fill("Browser Test");
  await page.getByLabel("Phone number").fill("01700000000");
  await page.getByLabel("Street address").fill("12 Portfolio Road");
  await page.getByLabel("City", { exact: true }).fill("Dhaka");
  await page.getByRole("button", { name: "Place order →" }).click();
  await expect(
    page.getByRole("heading", { name: "Good things are on their way." }),
  ).toBeVisible();
  await expect(page.locator(".order-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, cancel order", exact: true })
    .click();
  await expect(page.locator(".order-card .badge")).toHaveText("CANCELLED");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/$/);
});

test("admin creates and hides a product", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@atelier.local");
  await page.getByLabel("Password", { exact: true }).fill("AdminDemo123!");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await page.getByRole("link", { name: "Manage store", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Store studio." }),
  ).toBeVisible();
  await expect(
    page.getByText("Collected revenue", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add product" }).click();
  const name = "Browser essential " + Date.now();
  await page.getByLabel("Product name").fill(name);
  await page.getByLabel("Category", { exact: true }).fill("Everyday");
  await page.getByLabel("Price (BDT)").fill("975");
  await page.getByLabel("Stock quantity").fill("10");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A product created by the browser integration test.");
  await page.getByRole("button", { name: "Save product →" }).click();
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(row.getByText("Hidden", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Order fulfillment" }).click();
  await expect(
    page.getByRole("columnheader", { name: "Customer & delivery" }),
  ).toBeVisible();
});

test("checkout recovers a committed order after a lost response and reload", async ({
  page,
}) => {
  await prepareCheckout(page);
  let orderId: number | undefined;
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    orderId = (await response.json()).id;
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Place order →" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await page.unroute("**/api/orders");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Good things are on their way." }),
  ).toBeVisible();
  await expect(page.locator(".order-card")).toHaveCount(1);
  await expect(page).toHaveURL(new RegExp(`/orders\\?placed=${orderId}$`));
  const orders = await page.request.get("/api/orders", {
    headers: await authorization(page),
  });
  expect((await orders.json()).totalElements).toBe(1);
});

test("checkout retries the same order safely without reloading", async ({
  page,
}) => {
  await prepareCheckout(page);
  let dropped = false;
  const keys: string[] = [];
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().headers()["idempotency-key"]);
    if (!dropped) {
      dropped = true;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort("failed");
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Place order →" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await page.getByRole("button", { name: "Place order →" }).click();
  await expect(page.locator(".order-card")).toHaveCount(1);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("admin reviews current stock after an edit conflict", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@atelier.local");
  await page.getByLabel("Password", { exact: true }).fill("AdminDemo123!");
  await page.getByRole("button", { name: "Sign in →", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Manage store", exact: true }),
  ).toBeVisible();
  const headers = await authorization(page);
  const name = `Concurrent essential ${crypto.randomUUID()}`;
  const created = await page.request.post("/api/admin/products", {
    headers,
    data: {
      name,
      description: "Stock conflict fixture",
      category: "Everyday",
      price: 975,
      stock: 10,
      image: "/assets/mug.svg",
      active: true,
    },
  });
  expect(created.status()).toBe(201);
  const product = await created.json();
  await page.getByRole("link", { name: "Manage store", exact: true }).click();
  const row = page.getByRole("row").filter({ hasText: name });
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  const changed = await page.request.put(`/api/admin/products/${product.id}`, {
    headers,
    data: { ...product, stock: 7 },
  });
  expect(changed.status()).toBe(200);
  await page
    .getByLabel("Description", { exact: true })
    .fill("My updated description");
  await page.getByRole("button", { name: "Save product →" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "changed while you were editing",
  );
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Stock quantity")).toHaveValue("7");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Reviewed updated description");
  await page.getByRole("button", { name: "Save product →" }).click();
  await expect(
    page.getByText("Product saved. Your storefront is up to date."),
  ).toBeVisible();
  const result = await page.request.get(`/api/products/${product.id}`);
  expect((await result.json()).stock).toBe(7);
});

test("expired access token refreshes while opening a protected page", async ({
  page,
}) => {
  await registerShopper(page);
  await page
    .getByRole("button", { name: "Add Stoneware Mug to bag", exact: true })
    .click();
  await expect(page.locator(".bag b")).toHaveText("1");
  await page.evaluate(() => {
    const session = JSON.parse(sessionStorage.getItem("atelier-session")!);
    session.token = "expired-token";
    sessionStorage.setItem("atelier-session", JSON.stringify(session));
  });
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Stoneware Mug", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  const response = await page.request.get("/api/users/me", {
    headers: await authorization(page),
  });
  expect(response.status()).toBe(200);
});
