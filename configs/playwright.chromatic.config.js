// The Chromatic snapshot suite: playwright.config.js at the repository root (the smoke tests)
// with a different testDir and report folder, so a page renders the same under both. Like the
// smoke tests it serves the repo root with scripts/serve.js, so the site is at /site/; the
// bundle is the fixed one at tests/chromatic/fixtures/database.json, never the published one,
// so a recipe change in the database does not re-snapshot every page.

import { fileURLToPath } from "node:url";

import { defineConfig } from "@playwright/test";

const PORT = 4173;
const REPOSITORY_ROOT = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
    // Paths here are relative to this file, so ../ reaches the repository root.
    testDir: "../tests/chromatic",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never", outputFolder: "../playwright-report-chromatic" }]] : "list",
    // outputDir is left alone on purpose: the Chromatic fixture writes its archives under it and
    // build-archive-storybook reads them from test-results/ at the repository root. Setting it
    // means also setting CHROMATIC_ARCHIVE_LOCATION.
    use: {
        baseURL: `http://127.0.0.1:${PORT}/site/`,
        launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE || undefined },
        trace: "retain-on-failure",
    },
    // One Chromium project, deliberately. Chromatic names a Playwright archive by the test's
    // file, describe and title, never its project, so several projects write over one story file
    // (viewport-only projects are recovered as modes on upload; anything else that differs is
    // lost). Viewports are set per test instead (tests/chromatic/viewports.js), never as projects.
    projects: [{ name: "chromium", use: { browserName: "chromium" } }],
    webServer: {
        command: `node scripts/serve.js ${PORT}`,
        // The server serves the directory it is started in, and webServer otherwise starts it in
        // configs/.
        cwd: REPOSITORY_ROOT,
        url: `http://127.0.0.1:${PORT}/site/index.html`,
        reuseExistingServer: !process.env.CI,
    },
});
