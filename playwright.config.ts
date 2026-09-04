import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './tests/browser',
    fullyParallel: false,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:3219',
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
            ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
            : undefined,
    },
    webServer: {
        command: 'npm run dev -- --hostname 127.0.0.1 --port 3219',
        url: 'http://127.0.0.1:3219/render-harness?fixture=empty',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
            AUTH_SECRET: 'render-harness-test-secret',
            RENDER_TEST_HARNESS: 'true',
        },
    },
    expect: {
        timeout: 15_000,
        toHaveScreenshot: { animations: 'disabled', caret: 'hide' },
    },
})
