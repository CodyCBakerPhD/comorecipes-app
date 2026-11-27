import { expect, test } from "@chromatic-com/playwright";

import { FIXTURE_BUNDLE_PATH, MISSING_BUNDLE_PATH, open } from "./fixture.js";
import { expectNoHorizontalOverflow, forEachViewport } from "./viewports.js";

// The index's own states. The shared ones (light and dark) are in pages.chromatic.test.js.
// Each is reached the way a person would: a ?tag= link, typing in the search box, clicking List
// Mode and rows, or a database that cannot be reached.

forEachViewport(test, "Index - tag selected", async ({ page }) => {
    // The link a recipe page's tag chip leads to
    await open(page, "index.html?tag=Vegetarian");
    await expect(page.locator(".tag-filter .tag.selected")).toHaveText("Vegetarian");
    await expect(page.locator(".letter-nav")).toBeHidden();
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Index - search with no matches", async ({ page }) => {
    await open(page, "index.html");
    await page.fill("#recipe-search", "lasagna");
    await expect(page.locator(".no-results")).toBeVisible();
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Index - list mode with two picked", async ({ page }) => {
    await open(page, "index.html");
    await page.click("#list-mode-toggle");
    await page.locator('.letter-section li[data-file-stem="basic_tomato_sauce"]').click();
    await page.locator('.letter-section li[data-file-stem="garlic_bread"]').click();
    await expect(page.locator(".selection-count")).toHaveText("2 recipes selected");
    await expect(page.locator(".selection-bar")).toBeVisible();
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Index - loading", async ({ page }) => {
    // The bundle never answers, so the shell's loading notice stays up
    await page.route(`**${FIXTURE_BUNDLE_PATH}`, () => {});
    await open(page, "index.html");
    await expect(page.locator("#shell-status")).toHaveText("Loading the recipes…");
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Index - bundle could not be loaded", async ({ page }) => {
    await open(page, "index.html", { bundleUrl: MISSING_BUNDLE_PATH });
    await expect(page.locator("#shell-status")).toHaveClass(/error/);
    await expect(page.locator("#shell-status")).toContainText("Could not load the recipes");
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Index - shown from the saved copy", async ({ page }) => {
    // A copy saved by an earlier visit, then the database out of reach: bundle.js falls back to
    // the copy and the footer says so
    const response = await page.request.get(FIXTURE_BUNDLE_PATH);
    const saved = JSON.stringify({ url: MISSING_BUNDLE_PATH, commit: null, bundle: await response.json() });
    await page.addInitScript((saved) => localStorage.setItem("como-bundle", saved), saved);
    await open(page, "index.html", { bundleUrl: MISSING_BUNDLE_PATH });
    await expect(page.locator(".data-version")).toContainText("shown from the copy saved on this device");
    await expectNoHorizontalOverflow(page);
});
