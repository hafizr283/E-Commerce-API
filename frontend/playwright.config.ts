import { defineConfig, devices } from "@playwright/test";
const externalBaseUrl = process.env["E2E_BASE_URL"];
export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseUrl || "http://127.0.0.1:4201",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: externalBaseUrl
    ? undefined
    : [
        {
          command:
            'java -jar ../target/demo-0.0.1-SNAPSHOT.jar --spring.profiles.active=demo --server.address=127.0.0.1 --server.port=8082 "--spring.datasource.url=jdbc:h2:mem:atelier-e2e;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1"',
          url: "http://127.0.0.1:8082/actuator/health",
          timeout: 120000,
          reuseExistingServer: false,
        },
        {
          command:
            "node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4201 --proxy-config e2e/proxy.conf.json",
          url: "http://127.0.0.1:4201",
          timeout: 120000,
          reuseExistingServer: false,
        },
      ],
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
});
