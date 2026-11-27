// Browser coverage of site/js from the smoke tests, for Codecov. Most of the site (the pages,
// search, list mode, the shopping list) only ever runs in a browser, so the unit tests' own
// coverage reaches just bundle.js and models.js. Off unless COVERAGE is set, so an ordinary
// local run pays nothing for it.
//
// Each test hands Chromium's V8 coverage to monocart-coverage-reports, which caches it per
// worker; the global teardown merges the caches into coverage/e2e/lcov.info.

import { CoverageReport } from "monocart-coverage-reports";

/** @typedef {import("@playwright/test").Page} Page */

export const COVERAGE_ENABLED = !!process.env.COVERAGE;

/** @type {import("monocart-coverage-reports").CoverageReportOptions} */
const OPTIONS = {
    name: "Smoke tests",
    outputDir: "coverage/e2e",
    reports: ["lcovonly", "console-summary"],
    // Only the site's own modules: not the inline <script type="module"> in each HTML shell,
    // nor assets/theme.js, which is a classic script outside site/js
    entryFilter: (entry) => new URL(entry.url).pathname.startsWith("/site/js/"),
    // http://127.0.0.1:4173/site/js/app.js is reported as site/js/app.js, the path Codecov
    // matches against the repository
    sourcePath: (filePath) => filePath.replace(/^.*?(site\/js\/)/, "$1"),
    // Modules no test loaded count as uncovered rather than going unmentioned
    all: { dir: "site/js" },
};

/**
 * @param {Page} page
 */
export async function startCoverage(page) {
    if (COVERAGE_ENABLED) {
        await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }
}

/**
 * @param {Page} page
 */
export async function stopCoverage(page) {
    if (COVERAGE_ENABLED) {
        await new CoverageReport(OPTIONS).add(await page.coverage.stopJSCoverage());
    }
}

/** Playwright's globalTeardown: merges every worker's coverage into one report. */
export default async function generateCoverageReport() {
    if (COVERAGE_ENABLED) {
        await new CoverageReport(OPTIONS).generate();
    }
}
