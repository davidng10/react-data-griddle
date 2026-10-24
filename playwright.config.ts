import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const baseURL = "http://127.0.0.1:4310";

// Specs drive pages built from e2e/scenarios/*.tsx (see e2e/main.tsx), which mount the library
// source. Builds and previews in production mode, matching what consumers ship.
export default defineConfig({
  testDir: "e2e/specs",
  forbidOnly: CI,
  retries: 0,
  reporter: CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "vite build -c e2e/vite.config.ts && vite preview -c e2e/vite.config.ts --host 127.0.0.1 --port 4310 --strictPort",
    url: baseURL,
    reuseExistingServer: !CI,
  },
});
