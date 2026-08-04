import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'docs/04-test-report-data.json' }]
  ],
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3021',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // When TEST_BASE_URL points elsewhere (e.g. the live Vercel deployment),
  // don't spin up a redundant local server — just run against that URL.
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        // Serves an already-built app, not `next dev` — under `fullyParallel`
        // a dev server JIT-compiles each route on first hit, and many routes
        // compiling at once under concurrent test load produced multi-second
        // stalls that flaked the UI-driven spec. Run `npm run build` before
        // `npm run test:e2e` (see package.json).
        command: 'npm run start',
        url: 'http://localhost:3021/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 180 * 1000,
      },
});
