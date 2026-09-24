const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
  });
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  await page.goto("http://127.0.0.1:4200/");
  await page.getByRole("heading", { name: "The collection." }).waitFor();
  await page.locator(".product-card").first().waitFor();
  await page.screenshot({
    path: "../docs/storefront-desktop.png",
    fullPage: true,
  });
  console.log("Product cards:", await page.locator(".product-card").count());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "../docs/storefront-mobile.png",
    fullPage: true,
  });
  console.log(
    "Mobile overflow:",
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
