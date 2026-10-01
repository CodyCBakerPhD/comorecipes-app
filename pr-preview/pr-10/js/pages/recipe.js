// One recipe: its tags, tickable ingredients, notes, numbered instructions, and the
// cross-links to the recipes it is made from and the recipes made from it.

import { escapeHtml, pageHtml, recipePageUrl, tagHue } from "../layout.js";
import { amountText, displayUnit } from "../models.js";

/** @typedef {import("../models.js").Database} Database */
/** @typedef {import("../models.js").Measurement} Measurement */
/** @typedef {import("../models.js").Recipe} Recipe */
/** @typedef {import("../app.js").Page} Page */

// The query parameter naming the recipe to show, by file stem
export const RECIPE_PARAMETER = "id";

/**
 * Recipe pages link to each other by stem. The links open in a new tab so the reader keeps
 * their place (and ticked boxes) in this one.
 * @param {string} fileStem
 * @param {string} text
 * @param {Database} database
 * @returns {string}
 */
function recipeLinkHtml(fileStem, text, database) {
    const recipe = database.recipes.get(fileStem);
    const title = recipe == null ? "" : ` title="${escapeHtml(recipe.name)}"`;
    return (
        `<a class="recipe-link" href="${recipePageUrl(fileStem)}"${title} target="_blank" rel="noopener">` +
        `${escapeHtml(text)}</a>`
    );
}

/**
 * An ingredient that is itself a recipe links to that recipe's page; the prefix and suffix
 * stay plain text, since they describe this recipe's use of it ("chilled rice").
 * @param {Measurement} measurement
 * @param {string | undefined} componentStem
 * @param {Database} database
 * @returns {string}
 */
function ingredientHtml(measurement, componentStem, database) {
    const nameHtml =
        componentStem == null
            ? escapeHtml(measurement.ingredient)
            : recipeLinkHtml(componentStem, measurement.ingredient, database);
    const itemHtml = [
        measurement.prefix == null ? null : escapeHtml(measurement.prefix),
        nameHtml,
        measurement.suffix == null ? null : escapeHtml(measurement.suffix),
    ]
        .filter((part) => part != null)
        .join(" ");
    const amount = escapeHtml(amountText(measurement.amount, displayUnit(measurement, database)));

    return `<li class="ingredient"><label>
                        <input type="checkbox">
                        <span class="ingredient-text"><span class="amount">${amount}</span> ${itemHtml}</span>
                    </label></li>`;
}

/**
 * The reverse links: every recipe that calls for this one as an ingredient.
 * @param {string} fileStem
 * @param {Database} database
 * @returns {string}
 */
function usedInHtml(fileStem, database) {
    const userStems = database.usedIn.get(fileStem);
    if (userStems == null) {
        return "";
    }
    const userItems = userStems.map(
        (userStem) => `<li>${recipeLinkHtml(userStem, database.recipes.get(userStem)?.name ?? userStem, database)}</li>`,
    );
    return `
                <section class="used-in">
                    <h2>Used In</h2>
                    <ul class="used-in-list">
                        ${userItems.join("\n                        ")}
                    </ul>
                </section>`;
}

/**
 * @param {Recipe} recipe
 * @param {Database} database
 * @returns {string}
 */
function tagListHtml(recipe, database) {
    if (recipe.tags == null || recipe.tags.length === 0) {
        return "";
    }
    const tagItems = recipe.tags.map(
        (tag) =>
            `<li class="tag" style="--tag-hue: ${tagHue(tag, database)}">` +
            `<a href="index.html?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a></li>`,
    );
    return `
            <ul class="tag-list">
                ${tagItems.join("\n                ")}
            </ul>`;
}

/**
 * @param {Recipe} recipe
 * @returns {string}
 */
function notesHtml(recipe) {
    if (recipe.notes == null) {
        return "";
    }
    const noteItems = recipe.notes.map((note) => `<li>${escapeHtml(note)}</li>`);
    return `<section class="notes">
                    <h2>Notes</h2>
                    <ul class="note-list">
                        ${noteItems.join("\n                        ")}
                    </ul>
                </section>
                `;
}

/**
 * @param {string} fileStem
 * @param {Recipe} recipe
 * @param {Database} database
 * @returns {import("../layout.js").RenderedPage}
 */
export function renderRecipePage(fileStem, recipe, database) {
    const componentStems = database.componentRecipes.get(fileStem);
    const ingredientItems = recipe.measurements.map((measurement, index) =>
        ingredientHtml(measurement, componentStems?.get(index), database),
    );
    const instructionItems = recipe.instructions.map((instruction) => `<li>${escapeHtml(instruction)}</li>`);

    return pageHtml({
        title: `${recipe.name} · CoMo Recipes`,
        topBarActions: ['<a class="back-link" href="index.html">&larr; Recipe Index</a>'],
        body: `    <main class="recipe">
        <header class="recipe-header">
            <h1>${escapeHtml(recipe.name)}</h1>${tagListHtml(recipe, database)}
        </header>
        <div class="recipe-body">
            <section class="ingredients">
                <h2>Ingredients</h2>
                <ul class="ingredient-list">
                    ${ingredientItems.join("\n                    ")}
                </ul>
            </section>
            <div class="method">
                ${notesHtml(recipe)}<section class="instructions">
                    <h2>Instructions</h2>
                    <ol class="step-list">
                        ${instructionItems.join("\n                        ")}
                    </ol>
                </section>${usedInHtml(fileStem, database)}
            </div>
        </div>
    </main>`,
    });
}

/**
 * The page for a stem the database does not have (a mistyped link, or a recipe since renamed).
 * @param {string} fileStem
 * @returns {import("../layout.js").RenderedPage}
 */
export function renderMissingRecipePage(fileStem) {
    const what = fileStem === "" ? "No recipe was asked for." : `There is no recipe with the id "${escapeHtml(fileStem)}".`;
    return pageHtml({
        title: "Recipe not found · CoMo Recipes",
        topBarActions: ['<a class="back-link" href="index.html">&larr; Recipe Index</a>'],
        body: `    <main class="recipe">
        <header class="recipe-header">
            <h1>Recipe not found</h1>
        </header>
        <p class="shell-status">${what} <a href="index.html">Browse the recipe index</a> instead.</p>
    </main>`,
    });
}

/**
 * @param {Database} database
 * @returns {Page}
 */
export function buildRecipePage(database) {
    const fileStem = new URLSearchParams(location.search).get(RECIPE_PARAMETER) ?? "";
    const recipe = database.recipes.get(fileStem);
    return recipe == null ? renderMissingRecipePage(fileStem) : renderRecipePage(fileStem, recipe, database);
}
