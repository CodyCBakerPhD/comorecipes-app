// What every story shares: the fixture database, and the two ways a page reaches the canvas.
// None of the site's page behavior (search, list mode, the shopping list's totals) runs in a
// story; a state it would produce is applied by hand, and the Playwright snapshots under
// tests/chromatic/ cover the real thing.

import fixtureBundleText from "../tests/chromatic/fixtures/database.json?raw";
import { dataVersionHtml } from "../site/js/layout.js";
import { buildDatabase } from "../site/js/models.js";

/** @typedef {import("../site/js/layout.js").RenderedPage} RenderedPage */

/**
 * The bundle the Playwright snapshots load too, so a story and the page it mirrors show the
 * same recipes. Imported raw and parsed here, as bundle.js parses what it fetches.
 * @type {import("../site/js/models.js").Database}
 */
export const database = buildDatabase(JSON.parse(fixtureBundleText));

/**
 * Centers a component at a realistic width, the way the page around it would.
 * @param {HTMLElement} element
 * @returns {HTMLDivElement}
 */
export function withCard(element) {
    const wrapper = document.createElement("div");
    wrapper.style.maxWidth = "640px";
    wrapper.style.margin = "1.5rem auto";
    wrapper.appendChild(element);
    return wrapper;
}

/**
 * A page as site/js/app.js puts it in the document once the bundle has loaded: the rendered
 * page, then the line saying which database it shows. `apply` then reaches a page state by hand.
 * @param {RenderedPage} renderedPage  What one of the site's render*Page functions returned
 * @param {(page: HTMLElement) => void} [apply]
 * @returns {HTMLElement}
 */
export function buildPage(renderedPage, apply) {
    const page = document.createElement("div");
    page.innerHTML = `${renderedPage.html}\n${dataVersionHtml(database, "network")}\n`;
    apply?.(page);
    return page;
}

/**
 * A page shell as it is before any of the site's script has run (an `?raw` import of its HTML
 * file): the <body> content with the scripts removed, then whatever `apply` does.
 * @param {string} rawHtml
 * @param {(page: HTMLElement) => void} [apply]
 * @returns {HTMLElement}
 */
export function buildShell(rawHtml, apply) {
    const doc = new DOMParser().parseFromString(rawHtml, "text/html");
    doc.body.querySelectorAll("script").forEach((script) => script.remove());
    const page = document.createElement("div");
    page.innerHTML = doc.body.innerHTML;
    apply?.(page);
    return page;
}

/**
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
export function find(root, selector) {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
        throw new Error(`No ${selector} in the story's markup`);
    }
    return element;
}
