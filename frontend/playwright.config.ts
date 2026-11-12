import { defineConfig, devices } from "@playwright/test";

const frontendUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const retries = Number(process.env.PLAYWRIGHT_RETRIES ?? "0");
const webServerCommand = process.env.CI
  ? "pnpm build && pnpm start --hostname localhost --port 3000"
  : "pnpm dev --hostname localhost --port 3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: frontendUrl,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: webServerCommand,
    url: `${frontendUrl}/courses`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_API_BASE_URL:
        process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1",
      NEXT_PUBLIC_IS_E2E: "true",
    },
  },
});
