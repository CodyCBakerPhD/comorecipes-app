// One row of the shopping list. The markup is built by hand, kept in sync with renderIngredient
// in site/js/shopping_list.js, which builds it with DOM calls; the two can drift.
import { withCard } from "./utils.js";

/**
 * @typedef {object} ShoppingItemState
 * @property {string} amount  As formatTotalAmount writes it
 * @property {string} ingredient
 * @property {string[]} qualifiers
 * @property {string[]} recipeNames
 * @property {boolean} purchased
 */

/**
 * @param {ShoppingItemState} state
 * @returns {HTMLElement}
 */
function buildShoppingItem(state) {
    const list = document.createElement("ul");
    list.className = "ingredient-list";

    const item = document.createElement("li");
    item.className = "ingredient shopping-item";
    item.classList.toggle("purchased", state.purchased);

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.purchased;
    const text = document.createElement("span");
    text.className = "ingredient-text";
    const amount = document.createElement("span");
    amount.className = "amount";
    amount.textContent = state.amount;
    text.append(amount, ` ${state.ingredient}`);
    label.append(checkbox, text);
    item.append(label);

    if (state.qualifiers.length > 0) {
        const qualifiers = document.createElement("span");
        qualifiers.className = "item-qualifiers";
        qualifiers.textContent = state.qualifiers.join(", ");
        item.append(qualifiers);
    }
    const sources = document.createElement("span");
    sources.className = "item-sources";
    sources.textContent = state.recipeNames.join(", ");
    item.append(sources);

    list.append(item);
    const card = document.createElement("section");
    card.className = "ingredients shopping-card";
    card.append(list);
    return withCard(card);
}

/** @type {ShoppingItemState} */
const garlic = {
    amount: "6 cloves",
    ingredient: "garlic",
    qualifiers: ["minced"],
    recipeNames: ["Basic Tomato Sauce", "Fried Rice"],
    purchased: false,
};

export default { title: "Components/Shopping item", parameters: { bodyClass: "shopping-page" } };

export const ToBuy = { name: "To buy", render: () => buildShoppingItem(garlic) };
export const Bought = { name: "Bought", render: () => buildShoppingItem({ ...garlic, purchased: true }) };
export const MeasuredAndEnough = {
    name: "Measured and enough",
    render: () =>
        buildShoppingItem({
            amount: "30 grams + enough",
            ingredient: "salt",
            qualifiers: [],
            recipeNames: ["Basic Tomato Sauce"],
            purchased: false,
        }),
};
