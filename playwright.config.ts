import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173", headless: true },
  webServer: [
    {
      command: "API_PORT=3101 DATA_DIR=.test-data node server/index.ts",
      url: "http://127.0.0.1:3101/api/prices",
      reuseExistingServer: false,
    },
    {
      command:
        "API_PORT=3101 npm run dev:web -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
  ],
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true },
    },
  ],
});
