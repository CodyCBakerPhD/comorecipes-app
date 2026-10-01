// The shopping list, which totals the ingredients of the recipes picked in list mode.

import { pageHtml } from "../layout.js";
import { toShoppingRecipe } from "../models.js";
import { setUpShoppingList } from "../shopping_list.js";

/** @typedef {import("../models.js").Database} Database */
/** @typedef {import("../models.js").ShoppingRecipe} ShoppingRecipe */
/** @typedef {import("../app.js").Page} Page */

/**
 * @returns {import("../layout.js").RenderedPage}
 */
export function renderShoppingListPage() {
    return pageHtml({
        title: "Shopping List · CoMo Recipes",
        body: `    <main class="shopping">
        <header class="shopping-header">
            <div class="shopping-title">
                <h1>Shopping List</h1>
                <div class="shopping-actions">
                    <a class="page-button edit-selection" href="index.html">&larr; Edit selection</a>
                    <button class="page-button" type="button" onclick="window.print()">Print list</button>
                </div>
            </div>
            <p class="tagline" id="list-summary"></p>
            <ul class="recipe-chips" id="recipe-chips"></ul>
        </header>
        <section class="ingredients shopping-card">
            <h2>Ingredients</h2>
            <ul class="ingredient-list" id="shopping-items"></ul>
        </section>
        <p class="empty-state" hidden>No recipes selected yet. Open <a href="index.html">the recipe index</a>, switch on List Mode, and pick a few.</p>
    </main>`,
    });
}

/**
 * Every recipe reduced to what the list needs, keyed by file stem.
 * @param {Database} database
 * @returns {Record<string, ShoppingRecipe>}
 */
export function shoppingRecipesByFileStem(database) {
    /** @type {Record<string, ShoppingRecipe>} */
    const recipesByFileStem = {};
    for (const [fileStem, recipe] of database.recipes) {
        recipesByFileStem[fileStem] = toShoppingRecipe(recipe, database);
    }
    return recipesByFileStem;
}

/**
 * @param {Database} database
 * @returns {Page}
 */
export function buildShoppingListPage(database) {
    return {
        ...renderShoppingListPage(),
        mount() {
            setUpShoppingList(shoppingRecipesByFileStem(database));
        },
    };
}
