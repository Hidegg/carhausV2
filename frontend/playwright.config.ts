import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5001',
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'gunicorn run:app --bind 0.0.0.0:5001 --workers 1 --timeout 60',
    cwd: '..',
    url: 'http://localhost:5001',
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || 'sqlite:///e2e_test.db',
      SECRET_KEY: process.env.SECRET_KEY || 'e2e-test-secret',
    },
    timeout: 30000,
  },
});
