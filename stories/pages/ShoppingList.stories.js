// The shopping list page, rendered by the site's own renderShoppingListPage. Its items are
// totalled and drawn by site/js/shopping_list.js, which does not run here; a filled list is a
// Playwright snapshot (tests/chromatic/shopping_list.chromatic.test.js), and one row on its own
// is Components/Shopping item.
import { renderShoppingListPage } from "../../site/js/pages/shopping_list.js";
import { buildPage, find } from "../utils.js";

export default { title: "Pages/Shopping list", parameters: { layout: "fullscreen", bodyClass: "shopping-page" } };

export const NothingSelected = {
    name: "Nothing selected",
    render: () =>
        buildPage(renderShoppingListPage(), (page) => {
            // What shopping_list.js does when ?recipes= names nothing it knows
            find(page, "#list-summary").textContent = "0 recipes · 0 ingredients · 0 left to buy";
            find(page, ".shopping-card").hidden = true;
            find(page, ".empty-state").hidden = false;
        }),
};
