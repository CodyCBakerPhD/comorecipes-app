// How every snapshot opens a page: against the fixed bundle beside this file, never the
// published one (whose every recipe change would re-snapshot every page), and with the color
// theme pinned. No production code is involved: the site already reads its bundle URL from
// window.COMO_BUNDLE_URL, and assets/theme.js applies the theme stored under "como-theme".

/** @typedef {import("@playwright/test").Page} Page */

// Served by scripts/serve.js from the repository root, alongside the site
export const FIXTURE_BUNDLE_PATH = "/tests/chromatic/fixtures/database.json";
// Nothing is served here, for the states where the bundle cannot be fetched
export const MISSING_BUNDLE_PATH = "/tests/chromatic/fixtures/missing.json";

/**
 * @typedef {object} OpenOptions
 * @property {"light" | "dark"} [theme]  Seeded the way a returning visitor's choice would be.
 *   Always set, since without a stored choice the stylesheet follows the OS preference, and the
 *   archive carries only the DOM, so whichever browser Chromatic renders it in would decide.
 * @property {string} [bundleUrl]  What the page fetches instead of the fixture bundle
 * @property {(window: any) => void} [beforeLoad]  Runs in the page before any of its scripts
 */

/**
 * @param {Page} page
 * @param {string} path  Relative to the baseURL, which ends in /site/
 * @param {OpenOptions} [options]
 */
export async function open(page, path, { theme = "light", bundleUrl = FIXTURE_BUNDLE_PATH, beforeLoad } = {}) {
    await page.addInitScript(
        ({ theme, bundleUrl }) => {
            localStorage.setItem("como-theme", theme);
            /** @type {any} */ (globalThis).COMO_BUNDLE_URL = bundleUrl;
        },
        { theme, bundleUrl },
    );
    if (beforeLoad != null) {
        await page.addInitScript(beforeLoad);
    }
    await page.goto(path);
}
