// The alphabetized recipe index with live search, tag filters, and list mode.

import { escapeHtml, pageHtml, recipePageUrl, tagHue } from "../layout.js";
import { setUpListMode } from "../list_mode.js";
import { setUpSearch } from "../search.js";

/** @typedef {import("../models.js").Database} Database */
/** @typedef {import("../models.js").Recipe} Recipe */
/** @typedef {import("../app.js").Page} Page */

/**
 * @param {string} fileStem
 * @param {Recipe} recipe
 * @returns {string}
 */
function recipeItemHtml(fileStem, recipe) {
    const tags = escapeHtml((recipe.tags ?? []).join(","));
    return (
        `<li data-tags="${tags}" data-file-stem="${escapeHtml(fileStem)}">` +
        `<a href="${recipePageUrl(fileStem)}">${escapeHtml(recipe.name)}</a></li>`
    );
}

/**
 * Recipes grouped by the first letter of their name, in the database's alphabetical order.
 * @param {Database} database
 * @returns {Map<string, string[]>}
 */
function groupByLetter(database) {
    /** @type {Map<string, string[]>} */
    const itemsByLetter = new Map();
    for (const [fileStem, recipe] of database.recipes) {
        const letter = recipe.name[0].toUpperCase();
        const items = itemsByLetter.get(letter) ?? [];
        items.push(recipeItemHtml(fileStem, recipe));
        itemsByLetter.set(letter, items);
    }
    return itemsByLetter;
}

/**
 * @param {Database} database
 * @returns {import("../layout.js").RenderedPage}
 */
export function renderIndexPage(database) {
    const itemsByLetter = groupByLetter(database);

    const tagButtons = database.tags.map((tag) => {
        const escapedTag = escapeHtml(tag);
        return `<button class="tag" type="button" style="--tag-hue: ${tagHue(tag, database)}" data-tag="${escapedTag}">${escapedTag}</button>`;
    });
    const letterLinks = [...itemsByLetter.keys()].map((letter) => `<a href="#letter-${letter}">${letter}</a>`);
    const letterSections = [...itemsByLetter].map(
        ([letter, items]) => `<section class="letter-section" id="letter-${letter}">
            <h2>${letter}</h2>
            <ul>
                ${items.join("\n                ")}
            </ul>
        </section>`,
    );

    return pageHtml({
        title: "CoMo Recipes",
        topBarLead:
            '<button class="list-mode-toggle" id="list-mode-toggle" type="button" aria-pressed="false">List Mode</button>',
        body: `    <header class="site-header">
        <img class="site-logo" src="assets/como_logo.jpg" alt="CoMo logo">
        <h1>CoMo Recipes</h1>
        <p class="tagline">Our household cookbook &middot; ${database.recipes.size} recipes</p>
        <div class="search-bar">
            <input id="recipe-search" type="search" placeholder="Search recipes" aria-label="Search recipes">
        </div>
        <div class="tag-filter">
            ${tagButtons.join("\n            ")}
        </div>
    </header>
    <nav class="letter-nav">
        ${letterLinks.join("\n        ")}
    </nav>
    <main class="index-grid">
        ${letterSections.join("\n        ")}
    </main>
    <p class="no-results" hidden>No recipes match your search.</p>
    <div class="selection-bar" hidden>
        <p class="selection-count">0 recipes selected</p>
        <div class="selection-actions">
            <button class="selection-button clear-selection" type="button">Clear</button>
            <a class="selection-button build-list" href="shopping_list.html" aria-disabled="true">Build Shopping List</a>
        </div>
    </div>`,
    });
}

/**
 * @param {Database} database
 * @returns {Page}
 */
export function buildIndexPage(database) {
    return {
        ...renderIndexPage(database),
        mount() {
            setUpSearch();
            setUpListMode();
        },
    };
}
