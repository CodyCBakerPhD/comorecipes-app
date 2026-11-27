// The line at the foot of every page saying which database it shows, rendered by the site's own
// dataVersionHtml.
import { dataVersionHtml } from "../site/js/layout.js";
import { database, withCard } from "./utils.js";

/**
 * @param {"network" | "saved"} source
 * @returns {HTMLElement}
 */
function buildDataVersion(source) {
    const element = document.createElement("div");
    element.innerHTML = dataVersionHtml(database, source);
    return withCard(element);
}

export default { title: "Components/Data version" };

// One export per state, with a human-readable name. Both themes come from the Chromatic modes in
// configs/storybook/preview.js, so a dark-only regression is caught without a second set of exports.
export const Fetched = { name: "Fetched just now", render: () => buildDataVersion("network") };
export const Saved = { name: "Shown from the saved copy", render: () => buildDataVersion("saved") };
