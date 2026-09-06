// The chrome every page shares: the top bar, the tag colors, and the line that says which
// database the page is showing. The markup matches the old build-time site so style.css
// keeps working unchanged.

/** @typedef {import("./models.js").Database} Database */

const GITHUB_REPOSITORY_URL = "https://github.com/CodyCBakerPhD/comorecipes-app";
export const DATABASE_REPOSITORY_URL = "https://github.com/CodyCBakerPhD/comorecipes-database";

// The GitHub "mark" octicon, inlined so pages have no external image dependencies
const GITHUB_ICON_PATH =
    "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49" +
    "-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58" +
    " 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59" +
    ".82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27" +
    " 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65" +
    " 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8" +
    "c0-4.42-3.58-8-8-8z";

const GITHUB_LINK_HTML =
    `<a class="icon-link" href="${GITHUB_REPOSITORY_URL}" aria-label="View source on GitHub">` +
    `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${GITHUB_ICON_PATH}"/></svg></a>`;

const THEME_TOGGLE_HTML =
    '<button class="theme-toggle" type="button" onclick="comoToggleTheme()" aria-label="Toggle color theme"></button>';

/**
 * Mirrors Python's `html.escape` (quote=True), which the original site generator used.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#x27;");
}

/**
 * Hues are spread evenly over the alphabetized tag universe so every tag chip gets a distinct color.
 * @param {string} tag
 * @param {Database} database
 * @returns {number}
 */
export function tagHue(tag, database) {
    const index = database.tags.indexOf(tag);
    return index < 0 ? 0 : Math.floor((index * 360) / database.tags.length);
}

/**
 * The page a recipe is shown on. Every page sits at the site root, so links are plain
 * relative paths that work under the Pages path prefix.
 * @param {string} fileStem
 * @returns {string}
 */
export function recipePageUrl(fileStem) {
    return `recipe.html?id=${encodeURIComponent(fileStem)}`;
}

/**
 * @typedef {object} PageOptions
 * @property {string} title
 * @property {string[]} [scripts]  Kept for parity with the old renderer; the shells load their own modules
 * @property {string} [topBarLead]  Leading top-bar content; defaults to the brand link back to the index
 * @property {string[]} [topBarActions]  Top-bar actions placed before the theme toggle and GitHub link
 * @property {string} body
 */

/**
 * @typedef {object} RenderedPage
 * @property {string} title  For document.title
 * @property {string} html  The body's contents: the top bar, then the page
 */

/**
 * @param {PageOptions} options
 * @returns {RenderedPage}
 */
export function pageHtml(options) {
    const brandHtml = `<a class="brand" href="index.html">
            <img class="brand-logo" src="assets/como_logo.jpg" alt="CoMo logo">
            <span>CoMo Recipes</span>
        </a>`;
    const topBarActions = [...(options.topBarActions ?? []), THEME_TOGGLE_HTML, GITHUB_LINK_HTML];

    return {
        title: options.title,
        html: `    <nav class="top-bar">
        ${options.topBarLead ?? brandHtml}
        <div class="top-actions">
            ${topBarActions.join("\n            ")}
        </div>
    </nav>
${options.body}`,
    };
}

/**
 * "2026-09-06 12:00 UTC" for the bundle's ISO 8601 timestamp, which is always in UTC.
 * @param {string} generatedAt
 * @returns {string}
 */
function formatGeneratedAt(generatedAt) {
    const match = generatedAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|\+00:00)$/);
    return match == null ? generatedAt : `${match[1]} ${match[2]} UTC`;
}

/**
 * The unobtrusive line at the foot of every page saying which database it is showing.
 * @param {Database} database
 * @param {"network" | "saved"} source
 * @returns {string}
 */
export function dataVersionHtml(database, source) {
    const parts = [];
    if (database.generatedAt != null) {
        parts.push(
            `recipes as of <time datetime="${escapeHtml(database.generatedAt)}">` +
                `${escapeHtml(formatGeneratedAt(database.generatedAt))}</time>`,
        );
    }
    if (database.commit != null) {
        parts.push(
            `database <a href="${DATABASE_REPOSITORY_URL}/commit/${encodeURIComponent(database.commit)}">` +
                `${escapeHtml(database.commit.slice(0, 7))}</a>`,
        );
    }
    if (source === "saved") {
        parts.push("shown from the copy saved on this device because the database could not be reached");
    }
    if (parts.length === 0) {
        return "";
    }
    return `    <footer class="data-version">${parts.join(" &middot; ")}</footer>`;
}
