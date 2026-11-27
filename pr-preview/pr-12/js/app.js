// Starts a page: loads the database bundle, builds the page from it, puts the markup in the
// document, and hands over to the page's behavior. Until the bundle arrives the shell shows
// its loading notice; if it never does, that notice becomes the error.

import { loadBundle } from "./bundle.js";
import { dataVersionHtml, escapeHtml } from "./layout.js";
import { buildDatabase } from "./models.js";

/** @typedef {import("./models.js").Database} Database */

/**
 * A rendered page, plus the behavior to wire up once its markup is in the document.
 * @typedef {import("./layout.js").RenderedPage & { mount?: () => void }} Page
 */

/**
 * @param {(database: Database) => Page} buildPage
 * @returns {Promise<void>}
 */
export async function startPage(buildPage) {
    try {
        const { bundle, source } = await loadBundle();
        const database = buildDatabase(bundle);
        const page = buildPage(database);
        document.title = page.title;
        document.body.innerHTML = `${page.html}\n${dataVersionHtml(database, source)}\n`;
        page.mount?.();
    } catch (error) {
        console.error(error);
        showError(error);
    }
}

/**
 * @param {unknown} error
 */
function showError(error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = document.getElementById("shell-status") ?? document.body.appendChild(document.createElement("p"));
    status.id = "shell-status";
    status.className = "shell-status error";
    status.innerHTML =
        `Could not load the recipes. ${escapeHtml(message)}<br>` +
        `<a href="${escapeHtml(location.href)}">Try again</a>`;
}
