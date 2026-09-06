// The smoke tests serve the repo root with scripts/serve.js, so the site is at /site/ and the
// fixture bundle at /tests/fixtures/. Set CHROMIUM_EXECUTABLE to use a Chromium you already
// have instead of the one Playwright downloads.

import { defineConfig } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
    testDir: "tests",
    testMatch: "**/*.spec.js",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: `http://127.0.0.1:${PORT}/site/`,
        browserName: "chromium",
        launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE || undefined },
        trace: "retain-on-failure",
    },
    webServer: {
        command: `node scripts/serve.js ${PORT}`,
        url: `http://127.0.0.1:${PORT}/site/index.html`,
        reuseExistingServer: !process.env.CI,
    },
});
