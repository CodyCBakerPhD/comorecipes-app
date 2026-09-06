// Loads the site in a real browser against a database bundle at tests/fixtures/database.json.gz
// (the published one, or one built from a database checkout) and checks that each page renders
// what the data says it should.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { expect, test } from "@playwright/test";

import { buildDatabase, toShoppingRecipe, totalShoppingItems } from "../site/js/models.js";

const FIXTURE_GZ = new URL("./fixtures/database.json.gz", import.meta.url);
const FIXTURE_JSON = new URL("./fixtures/database.json", import.meta.url);
// Served by scripts/serve.js from the repo root, alongside the site
const BUNDLE_PATH = "/tests/fixtures/database.json.gz";
const INFLATED_BUNDLE_PATH = "/tests/fixtures/database.json";

if (!existsSync(FIXTURE_GZ)) {
    throw new Error(
        "Put a database bundle at tests/fixtures/database.json.gz first. The published one:\n" +
            "  curl -fsSL -o tests/fixtures/database.json.gz " +
            "https://raw.githubusercontent.com/CodyCBakerPhD/comorecipes-database/dist/database.json.gz\n" +
            "or one built from a database checkout:\n" +
            "  python <database>/scripts/build_bundle.py tests/fixtures/database.json.gz <database>",
    );
}
const bundle = JSON.parse(gunzipSync(readFileSync(FIXTURE_GZ)).toString("utf-8"));
writeFileSync(FIXTURE_JSON, JSON.stringify(bundle));
const database = buildDatabase(bundle);
const recipeCount = database.recipes.size;

// A recipe made from another recipe, so both directions of the cross-link can be checked
const [userStem, components] = [...database.componentRecipes][0];
const componentStem = [...components.values()][0];
const userRecipe = database.recipes.get(userStem) ?? fail(`no recipe ${userStem}`);
const componentRecipe = database.recipes.get(componentStem) ?? fail(`no recipe ${componentStem}`);

/**
 * @param {string[]} stems
 * @returns {number}
 */
function expectedItemCount(stems) {
    return totalShoppingItems(stems.map((stem) => toShoppingRecipe(database.recipes.get(stem) ?? fail(stem), database)))
        .length;
}

test.beforeEach(async ({ page }) => {
    await page.addInitScript((url) => {
        /** @type {any} */ (globalThis).COMO_BUNDLE_URL = url;
    }, BUNDLE_PATH);
});

test("the index lists every recipe and says which database it shows", async ({ page }) => {
    await page.goto("index.html");
    await expect(page).toHaveTitle("CoMo Recipes");
    await expect(page.locator(".tagline")).toHaveText(`Our household cookbook · ${recipeCount} recipes`);
    await expect(page.locator(".letter-section li")).toHaveCount(recipeCount);
    await expect(page.locator(".tag-filter .tag")).toHaveCount(database.tags.length);
    await expect(page.locator(".data-version")).toContainText(bundle.commit.slice(0, 7));
    await expect(page.locator(".data-version")).toContainText("recipes as of");
});

test("search and tag chips filter the index", async ({ page }) => {
    await page.goto("index.html");
    await page.fill("#recipe-search", userRecipe.name);
    await expect(page.locator(".letter-section li:visible")).toContainText([userRecipe.name]);
    await expect(page.locator(".letter-nav")).toBeHidden();

    await page.fill("#recipe-search", "");
    const tag = database.tags[0];
    const taggedCount = [...database.recipes.values()].filter((recipe) => recipe.tags.includes(tag)).length;
    await page.locator(".tag-filter .tag", { hasText: tag }).first().click();
    await expect(page.locator(".letter-section li:visible")).toHaveCount(taggedCount);

    await page.goto(`index.html?tag=${encodeURIComponent(tag)}`);
    await expect(page.locator(".tag-filter .tag.selected")).toHaveText(tag);
    await expect(page.locator(".letter-section li:visible")).toHaveCount(taggedCount);
});

test("a recipe page shows its ingredients, steps, and cross-links", async ({ page }) => {
    await page.goto(`recipe.html?id=${userStem}`);
    await expect(page).toHaveTitle(`${userRecipe.name} · CoMo Recipes`);
    await expect(page.locator("h1")).toHaveText(userRecipe.name);
    await expect(page.locator(".ingredient-list .ingredient")).toHaveCount(userRecipe.measurements.length);
    await expect(page.locator(".step-list li")).toHaveCount(userRecipe.instructions.length);
    await expect(page.locator(".tag-list a").first()).toHaveAttribute(
        "href",
        `index.html?tag=${encodeURIComponent(userRecipe.tags[0])}`,
    );

    const componentLink = page.locator(`.ingredient-list a.recipe-link[href="recipe.html?id=${componentStem}"]`);
    await expect(componentLink).toBeVisible();

    await page.goto(`recipe.html?id=${componentStem}`);
    await expect(page.locator("h1")).toHaveText(componentRecipe.name);
    await expect(page.locator(`.used-in-list a[href="recipe.html?id=${userStem}"]`)).toHaveText(userRecipe.name);
});

test("an unknown recipe id says so", async ({ page }) => {
    await page.goto("recipe.html?id=not_a_recipe");
    await expect(page.locator("h1")).toHaveText("Recipe not found");
});

test("the shopping list totals the selected recipes and stays live", async ({ page }) => {
    await page.goto(`shopping_list.html?recipes=${userStem},${componentStem}`);
    await expect(page.locator(".recipe-chip")).toHaveCount(2);
    await expect(page.locator("#shopping-items .shopping-item")).toHaveCount(expectedItemCount([userStem, componentStem]));
    await expect(page.locator("#list-summary")).toContainText("2 recipes");

    await page.locator("#shopping-items .shopping-item input").first().check();
    await expect(page.locator("#shopping-items .shopping-item.purchased")).toHaveCount(1);

    await page.locator(".recipe-chip .remove-recipe").first().click();
    await expect(page.locator(".recipe-chip")).toHaveCount(1);
    await expect(page.locator("#list-summary")).toContainText("1 recipe ·");
    await expect(page.locator("#shopping-items .shopping-item")).toHaveCount(expectedItemCount([componentStem]));
    await expect(page).toHaveURL(new RegExp(`\\?recipes=${componentStem}$`));
});

test("list mode hands the picked recipes to the shopping list", async ({ page }) => {
    await page.goto("index.html");
    await page.click("#list-mode-toggle");
    await expect(page.locator("body")).toHaveClass(/list-mode/);
    await page.locator(`.letter-section li[data-file-stem="${userStem}"]`).click();
    await page.locator(`.letter-section li[data-file-stem="${componentStem}"]`).click();
    await expect(page.locator(".selection-count")).toHaveText("2 recipes selected");

    await page.click(".build-list");
    await expect(page).toHaveURL(/shopping_list\.html\?recipes=/);
    await expect(page.locator(".recipe-chip")).toHaveCount(2);
});

test("an already inflated bundle loads too", async ({ page }) => {
    await page.goto(`index.html?bundle=${INFLATED_BUNDLE_PATH}`);
    await expect(page.locator(".tagline")).toHaveText(`Our household cookbook · ${recipeCount} recipes`);
});

test("a bundle that cannot be fetched is reported, not a blank page", async ({ page }) => {
    await page.goto("index.html?bundle=/tests/fixtures/missing.json.gz");
    await expect(page.locator("#shell-status")).toHaveClass(/error/);
    await expect(page.locator("#shell-status")).toContainText("Could not load the recipes");
});

test("the old per-recipe pages redirect to the recipe", async ({ page }) => {
    await page.goto(`formatted_recipes/${userStem}.html`);
    await expect(page).toHaveURL(new RegExp(`/site/recipe\\.html\\?id=${userStem}$`));
    await expect(page.locator("h1")).toHaveText(userRecipe.name);
});

test("the theme toggle sticks across loads", async ({ page }) => {
    await page.goto("index.html");
    await page.click(".theme-toggle");
    const theme = await page.locator("html").getAttribute("data-theme");
    expect(theme).toMatch(/^(light|dark)$/);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme ?? "");
});

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
    throw new Error(message);
}
