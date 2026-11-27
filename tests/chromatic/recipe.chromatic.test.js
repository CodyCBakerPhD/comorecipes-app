import { expect, test } from "@chromatic-com/playwright";

import { open } from "./fixture.js";
import { expectNoHorizontalOverflow, forEachViewport } from "./viewports.js";

// The recipe page's own states. The shared ones (light and dark, for a recipe made from another
// recipe) are in pages.chromatic.test.js.

forEachViewport(test, "Recipe - with notes and used in", async ({ page }) => {
    await open(page, "recipe.html?id=basic_tomato_sauce");
    await expect(page.locator(".note-list li")).toHaveCount(1);
    await expect(page.locator(".used-in-list li")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Recipe - long name, two ingredients ticked", async ({ page }) => {
    await open(page, "recipe.html?id=roasted_squash_risotto");
    await expect(page.locator("h1")).toHaveText("Roasted Butternut Squash and Sage Risotto with Brown Butter");
    await page.locator(".ingredient-list .ingredient input").nth(0).check();
    await page.locator(".ingredient-list .ingredient input").nth(1).check();
    await expect(page.locator(".ingredient-list .ingredient input:checked")).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Recipe - not found", async ({ page }) => {
    await open(page, "recipe.html?id=not_a_recipe");
    await expect(page.locator("h1")).toHaveText("Recipe not found");
    await expectNoHorizontalOverflow(page);
});
