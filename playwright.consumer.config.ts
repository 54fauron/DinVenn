import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/consumer",
  use: { baseURL: "http://127.0.0.1:5178", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: devices["Desktop Chrome"] },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm exec -w @dinvenn/mobile -- vite --host 127.0.0.1 --port 5178",
    url: "http://127.0.0.1:5178",
    reuseExistingServer: false,
    env: {
      EXPO_PUBLIC_SUPABASE_URL: "https://dinvenn-test.supabase.co",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-browser-test-key",
    },
  },
});
