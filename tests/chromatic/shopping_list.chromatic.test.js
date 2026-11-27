import { expect, test } from "@chromatic-com/playwright";

import { open } from "./fixture.js";
import { expectNoHorizontalOverflow, forEachViewport } from "./viewports.js";

// The shopping list's own states. The shared ones (light and dark, for two recipes) are in
// pages.chromatic.test.js.

forEachViewport(test, "Shopping list - three recipes, two items bought", async ({ page }) => {
    // Garlic and butter come from more than one recipe, so their totals and sources are shown
    await open(page, "shopping_list.html?recipes=basic_tomato_sauce,garlic_bread,fried_rice");
    await expect(page.locator(".recipe-chip")).toHaveCount(3);
    await page.locator("#shopping-items .shopping-item input").nth(0).check();
    await page.locator("#shopping-items .shopping-item input").nth(1).check();
    await expect(page.locator("#shopping-items .shopping-item.purchased")).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
});

forEachViewport(test, "Shopping list - nothing selected", async ({ page }) => {
    await open(page, "shopping_list.html");
    await expect(page.locator(".empty-state")).toBeVisible();
    await expectNoHorizontalOverflow(page);
});
