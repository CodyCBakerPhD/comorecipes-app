// The recipe index, rendered by the site's own renderIndexPage from the fixture database. The
// filtered states are what site/js/search.js does to the markup, applied by hand.
import { renderIndexPage } from "../../site/js/pages/index.js";
import { buildPage, database, find } from "../utils.js";

/**
 * Hides the rows and sections that do not match, the way search.js does.
 * @param {HTMLElement} page
 * @param {(item: HTMLElement) => boolean} matches
 */
function filterRows(page, matches) {
    let anyMatches = false;
    for (const section of page.querySelectorAll(".letter-section")) {
        let sectionMatches = false;
        for (const item of section.querySelectorAll("li")) {
            item.hidden = !matches(item);
            sectionMatches = sectionMatches || !item.hidden;
        }
        /** @type {HTMLElement} */ (section).hidden = !sectionMatches;
        anyMatches = anyMatches || sectionMatches;
    }
    find(page, ".letter-nav").hidden = true;
    find(page, ".no-results").hidden = anyMatches;
}

// Titles nest under "Pages/" so the page stories sit together, apart from the components.
// fullscreen: the page fills the canvas edge to edge, as in the browser.
export default { title: "Pages/Index", parameters: { layout: "fullscreen", bodyClass: "index-page" } };

export const Default = { name: "Default", render: () => buildPage(renderIndexPage(database)) };

export const TagSelected = {
    name: "Tag selected",
    render: () =>
        buildPage(renderIndexPage(database), (page) => {
            find(page, '.tag-filter .tag[data-tag="Breakfast"]').classList.add("selected");
            filterRows(page, (item) => (item.dataset.tags ?? "").split(",").includes("Breakfast"));
        }),
};

export const NoMatches = {
    name: "Search with no matches",
    render: () =>
        buildPage(renderIndexPage(database), (page) => {
            find(page, "#recipe-search").setAttribute("value", "lasagna");
            filterRows(page, () => false);
        }),
};
