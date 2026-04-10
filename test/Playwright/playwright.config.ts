import { defineConfig, devices } from '@playwright/test'
import { E2E_CONFIG } from './env'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 120_000,

  use: {
    baseURL: E2E_CONFIG.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // CDP virtual authenticator requires Chromium
        channel: undefined,
      },
    },
  ],

  // Start the dev server if not already running
  webServer: {
    command: 'yarn dev',
    url: E2E_CONFIG.baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
