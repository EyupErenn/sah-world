import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3010', channel: process.env.PW_USE_SYSTEM_CHROME ? 'chrome' : undefined, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } } },
  ],
  // Existing DEV-ONLY guest mode. These are UI/draft tests, NOT authenticated database tests.
  // Never add an auth bypass to production to make CI green.
  webServer: { command: 'npm run dev -- --port 3010', env: { SAH_E2E: '1' }, url: 'http://localhost:3010', reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
