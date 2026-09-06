// Builds the combined shopping list from the recipes named in ?recipes=<file stems>.
// The totalling happens right here from the loaded database, so the list stays live as
// recipes are dropped or items are ticked off.

import { requireElement } from "./dom.js";
import { recipePageUrl } from "./layout.js";
import { formatTotalAmount, totalShoppingItems } from "./models.js";

/** @typedef {import("./models.js").ShoppingRecipe} ShoppingRecipe */
/** @typedef {import("./models.js").ShoppingTotal} ShoppingTotal */

const RECIPES_PARAMETER = "recipes";
// Shared with list_mode.js so the index reopens in list mode with whatever is on this list,
// however the reader gets back there — the link below, the logo, or the back button.
const SELECTION_STORAGE_KEY = "como-list-selection";
const LIST_MODE_STORAGE_KEY = "como-list-mode";

/**
 * @param {Record<string, ShoppingRecipe>} recipesByFileStem
 */
export function setUpShoppingList(recipesByFileStem) {
    const recipeChips = requireElement("#recipe-chips");
    const shoppingItems = requireElement("#shopping-items");
    const listSummary = requireElement("#list-summary");
    const listCard = requireElement(".shopping-card");
    const emptyState = requireElement(".empty-state");
    const editLink = /** @type {HTMLAnchorElement} */ (requireElement(".edit-selection"));

    const requestedFileStems = (new URLSearchParams(location.search).get(RECIPES_PARAMETER) ?? "").split(",");
    let selectedFileStems = [...new Set(requestedFileStems)].filter((fileStem) => fileStem in recipesByFileStem);

    // Ticked-off ingredients are remembered by name so they survive a re-total
    /** @type {Set<string>} */
    const purchasedIngredientKeys = new Set();

    function renderRecipeChips() {
        recipeChips.replaceChildren();
        for (const fileStem of selectedFileStems) {
            const chip = document.createElement("li");
            chip.className = "recipe-chip";

            const link = document.createElement("a");
            link.href = recipePageUrl(fileStem);
            link.textContent = recipesByFileStem[fileStem].name;
            chip.append(link);

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "remove-recipe";
            removeButton.textContent = "×";
            removeButton.setAttribute("aria-label", `Remove ${recipesByFileStem[fileStem].name} from the list`);
            removeButton.addEventListener("click", () => {
                selectedFileStems = selectedFileStems.filter((candidate) => candidate !== fileStem);
                render();
            });
            chip.append(removeButton);

            recipeChips.append(chip);
        }
    }

    /**
     * @param {string} ingredientKey
     * @param {ShoppingTotal} total
     */
    function renderIngredient(ingredientKey, total) {
        const item = document.createElement("li");
        item.className = "ingredient shopping-item";
        item.classList.toggle("purchased", purchasedIngredientKeys.has(ingredientKey));

        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = purchasedIngredientKeys.has(ingredientKey);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                purchasedIngredientKeys.add(ingredientKey);
            } else {
                purchasedIngredientKeys.delete(ingredientKey);
            }
            item.classList.toggle("purchased", checkbox.checked);
            renderSummary();
        });

        const text = document.createElement("span");
        text.className = "ingredient-text";
        const amount = document.createElement("span");
        amount.className = "amount";
        amount.textContent = formatTotalAmount(total);
        text.append(amount, ` ${total.ingredient}`);

        label.append(checkbox, text);
        item.append(label);

        if (total.qualifiers.size > 0) {
            const qualifiers = document.createElement("span");
            qualifiers.className = "item-qualifiers";
            qualifiers.textContent = [...total.qualifiers].join(", ");
            item.append(qualifiers);
        }

        const sources = document.createElement("span");
        sources.className = "item-sources";
        sources.textContent = [...total.recipeNames].join(", ");
        item.append(sources);

        return item;
    }

    function renderSummary() {
        const totalCount = shoppingItems.children.length;
        const remainingCount = totalCount - purchasedIngredientKeys.size;
        const recipeCount = selectedFileStems.length;
        const recipeText = recipeCount === 1 ? "1 recipe" : `${recipeCount} recipes`;
        const itemText = totalCount === 1 ? "1 ingredient" : `${totalCount} ingredients`;
        listSummary.textContent = `${recipeText} · ${itemText} · ${remainingCount} left to buy`;
    }

    function render() {
        const totals = totalShoppingItems(selectedFileStems.map((fileStem) => recipesByFileStem[fileStem]));

        // Ingredients only from recipes that have since been removed are no longer ticked off
        const ingredientKeys = new Set(totals.map(([ingredientKey]) => ingredientKey));
        for (const ingredientKey of purchasedIngredientKeys) {
            if (!ingredientKeys.has(ingredientKey)) {
                purchasedIngredientKeys.delete(ingredientKey);
            }
        }

        renderRecipeChips();
        shoppingItems.replaceChildren(...totals.map(([ingredientKey, total]) => renderIngredient(ingredientKey, total)));
        renderSummary();

        const isEmpty = selectedFileStems.length === 0;
        listCard.hidden = isEmpty;
        emptyState.hidden = !isEmpty;

        const query = new URLSearchParams({ [RECIPES_PARAMETER]: selectedFileStems.join(",") });
        editLink.href = `index.html?${query}`;
        history.replaceState(null, "", isEmpty ? location.pathname : `?${query}`);

        try {
            sessionStorage.setItem(SELECTION_STORAGE_KEY, selectedFileStems.join(","));
            sessionStorage.setItem(LIST_MODE_STORAGE_KEY, "on");
        } catch {
            // Private browsing modes can refuse session storage; the selection just will not persist
        }
    }

    render();
}
