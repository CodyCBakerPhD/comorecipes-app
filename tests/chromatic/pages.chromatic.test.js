import { expect, test } from "@chromatic-com/playwright";

import { PAGES } from "../../configs/pages.js";
import { open } from "./fixture.js";
import { expectNoHorizontalOverflow, forEachViewport } from "./viewports.js";

// The states every page has, registered once per page from the one list of pages. A page's own
// states live beside this file in <page>.chromatic.test.js. The page's name leads every title:
// Chromatic groups captures by test file and title, so this one file stays readable by page, and
// Playwright rejects two identical titles in a file.
//
// The Chromatic fixture archives the page after each test body; the assertions are there so a
// capture of the wrong page or state fails here, by name, rather than turning up as a diff.

for (const { name, path, heading } of PAGES) {
    forEachViewport(test, `${name} - light theme`, async ({ page }) => {
        await open(page, path, { theme: "light" });
        await expect(page.locator("h1")).toHaveText(heading);
        await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
        await expectNoHorizontalOverflow(page);
    });

    forEachViewport(test, `${name} - dark theme`, async ({ page }) => {
        await open(page, path, { theme: "dark" });
        await expect(page.locator("h1")).toHaveText(heading);
        await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
        await expectNoHorizontalOverflow(page);
    });
}
