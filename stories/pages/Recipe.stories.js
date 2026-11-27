// One recipe, rendered by the site's own renderRecipePage from the fixture database.
import { renderMissingRecipePage, renderRecipePage } from "../../site/js/pages/recipe.js";
import { buildPage, database } from "../utils.js";

/**
 * @param {string} fileStem
 * @returns {HTMLElement}
 */
function recipe(fileStem) {
    const entry = database.recipes.get(fileStem);
    if (entry == null) {
        throw new Error(`The fixture database has no recipe ${fileStem}`);
    }
    return buildPage(renderRecipePage(fileStem, entry, database));
}

export default { title: "Pages/Recipe", parameters: { layout: "fullscreen", bodyClass: "recipe-page" } };

export const MadeFromAnotherRecipe = {
    name: "Made from another recipe",
    render: () => recipe("spaghetti_with_tomato_sauce"),
};

export const WithNotesAndUsedIn = {
    name: "With notes and used in",
    render: () => recipe("basic_tomato_sauce"),
};

export const LongName = {
    name: "Long name",
    render: () => recipe("roasted_squash_risotto"),
};

export const NotFound = {
    name: "Not found",
    render: () => buildPage(renderMissingRecipePage("not_a_recipe")),
};
