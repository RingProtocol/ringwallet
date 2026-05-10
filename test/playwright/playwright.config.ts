import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, devices } from '@playwright/test'
import { E2E_CONFIG_EVM } from './env'

/** Repo root — webServer default cwd is the config file's directory; Next must run from root. */
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 120_000,

  // globalSetup starts Anvil for every chain in EVM_TESTNET_CHAINS before any test runs.
  // globalTeardown stops them afterwards.
  // Both fire in headless (yarn test:e2e) AND UI (yarn test:e2e:ui) mode.
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL: E2E_CONFIG_EVM.baseUrl,
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

  // Only the app dev server here — Anvil is managed by globalSetup/globalTeardown.
  webServer: {
    command: 'yarn dev',
    url: E2E_CONFIG_EVM.baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    cwd: repoRoot,
  },
})
