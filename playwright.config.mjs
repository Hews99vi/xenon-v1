import { defineConfig } from '@playwright/test';
export default defineConfig({
    testDir: './tests/browser', testMatch: '**/*.spec.mjs', fullyParallel: false, workers: 1, retries: 0,
    timeout: 60000, expect: { timeout: 12000 }, reporter: 'list', outputDir: '.impeccable/review/test-results',
    use: { baseURL: `http://127.0.0.1:${process.env.XENON_BROWSER_PORT || 3000}`, viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', launchOptions: { executablePath: process.env.XENON_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' }, trace: 'retain-on-failure' },
});
