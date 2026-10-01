import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /game-release\.spec\.ts/,
  fullyParallel: true,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'game-mobile', use: { ...devices['Pixel 5'] } },
    { name: 'game-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run toy:dev -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
  },
});
