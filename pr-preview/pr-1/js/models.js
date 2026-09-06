// The recipe data models: the shapes of the records in the database bundle, the derived
// views the pages need (tags, cross-links, display units), and the shopping-list reduction.
// Nothing in here knows about HTML or the DOM, so it all runs under node:test too.

/**
 * One ingredient of a recipe, with its amount.
 * @typedef {object} Measurement
 * @property {string | number} amount  A non-negative number, usually as a string ('76'), or "enough"
 * @property {"grams" | "portions"} [unit]  Present exactly when the amount is measured
 * @property {string} [prefix]  Preparation shown before the ingredient, e.g. "minced"
 * @property {string} [suffix]  Qualifier shown after it, written as a continuation, e.g. ", room temperature"
 * @property {string} ingredient
 * @property {string} [recipe]  File stem of the recipe this ingredient is made from, when it is one.
 *   Links are always declared here, never inferred from the ingredient name.
 */

/**
 * @typedef {object} Recipe
 * @property {string} name
 * @property {string[]} tags
 * @property {Measurement[]} measurements
 * @property {string[]} instructions
 * @property {string[]} [notes]
 */

/**
 * A registered ingredient: one that carries package defaults, or spells out its portions.
 * @typedef {object} Ingredient
 * @property {string} name  Exactly as recipes refer to it in their measurements
 * @property {number} default_grams_per_package
 * @property {string} default_package_unit
 * @property {string} [portions_text]  How a "portions" unit of it reads, e.g. "cloves"
 */

/**
 * The file the database repo publishes: every record keyed by its file stem, which is its id.
 * @typedef {object} Bundle
 * @property {string | null} commit  The database commit it was built from
 * @property {string} generated_at  ISO 8601
 * @property {Record<string, Recipe>} recipes
 * @property {Record<string, Ingredient>} ingredients
 */

/**
 * @typedef {object} Database
 * @property {Map<string, Recipe>} recipes  File stem (the entry's id) to entry, alphabetized by stem
 * @property {Map<string, Ingredient>} ingredients
 * @property {string[]} tags  Every tag used by any recipe, alphabetized
 * @property {Map<string, Map<number, string>>} componentRecipes  Recipe stem to the stem of the
 *   recipe each of its measurements calls for, by measurement index; only measurements whose
 *   ingredient is itself a recipe have an entry
 * @property {Map<string, string[]>} usedIn  Recipe stem to the stems of the recipes that use it
 *   as an ingredient, in stem order
 * @property {string | null} commit  The database commit the bundle was built from
 * @property {string | null} generatedAt  When the bundle was built, ISO 8601
 */

/**
 * @template Entry
 * @param {Record<string, Entry>} entriesByStem
 * @returns {Map<string, Entry>}
 */
function alphabetized(entriesByStem) {
    return new Map(
        Object.keys(entriesByStem)
            .sort()
            .map((stem) => [stem, entriesByStem[stem]]),
    );
}

/**
 * The recipe a measurement declares it is made from, checked against the database.
 * @param {string} fileStem
 * @param {Measurement} measurement
 * @param {Map<string, Recipe>} recipes
 * @returns {string | undefined}
 */
function componentRecipeStem(fileStem, measurement, recipes) {
    if (measurement.recipe == null) {
        return undefined;
    }
    if (!recipes.has(measurement.recipe)) {
        throw new Error(
            `Recipe "${fileStem}" says its ingredient "${measurement.ingredient}" is made from the recipe ` +
                `"${measurement.recipe}", but no such recipe exists in the database.`,
        );
    }
    if (measurement.recipe === fileStem) {
        throw new Error(`Recipe "${fileStem}" says its ingredient "${measurement.ingredient}" is made from itself.`);
    }
    return measurement.recipe;
}

/**
 * The cross-links between recipes: which measurements are other recipes, and the reverse.
 * @param {Map<string, Recipe>} recipes
 * @returns {Pick<Database, "componentRecipes" | "usedIn">}
 */
function linkRecipes(recipes) {
    /** @type {Map<string, Map<number, string>>} */
    const componentRecipes = new Map();
    /** @type {Map<string, string[]>} */
    const usedIn = new Map();
    for (const [fileStem, recipe] of recipes) {
        /** @type {Map<number, string>} */
        const components = new Map();
        recipe.measurements.forEach((measurement, index) => {
            const componentStem = componentRecipeStem(fileStem, measurement, recipes);
            if (componentStem == null) {
                return;
            }
            components.set(index, componentStem);
            const users = usedIn.get(componentStem) ?? [];
            if (!users.includes(fileStem)) {
                users.push(fileStem);
            }
            usedIn.set(componentStem, users);
        });
        if (components.size > 0) {
            componentRecipes.set(fileStem, components);
        }
    }
    return { componentRecipes, usedIn };
}

/**
 * @param {Bundle} bundle
 * @returns {Database}
 */
export function buildDatabase(bundle) {
    const recipes = alphabetized(bundle.recipes);
    const ingredients = alphabetized(bundle.ingredients);
    const tags = [...new Set([...recipes.values()].flatMap((recipe) => recipe.tags ?? []))].sort();
    return {
        recipes,
        ingredients,
        tags,
        ...linkRecipes(recipes),
        commit: typeof bundle.commit === "string" ? bundle.commit : null,
        generatedAt: typeof bundle.generated_at === "string" ? bundle.generated_at : null,
    };
}

/**
 * The unit as it should read on the page: registered ingredients spell out their own
 * "portions" (e.g. "cloves" for garlic), and "enough" has no unit at all.
 * @param {Measurement} measurement
 * @param {Database} database
 * @returns {string}
 */
export function displayUnit(measurement, database) {
    if (measurement.amount === "enough") {
        return "";
    }
    if (measurement.unit === "portions") {
        for (const ingredient of database.ingredients.values()) {
            if (ingredient.name === measurement.ingredient && ingredient.portions_text != null) {
                return ingredient.portions_text;
            }
        }
    }
    return measurement.unit ?? "";
}

// Units the pages leave unwritten, either because there is none or because the amount
// already reads naturally without it (e.g. "1 thin spaghetti").
export const UNWRITTEN_UNITS = new Set(["", "portions"]);

/**
 * An amount and its unit as they read on the page: "76 grams", "3 cloves", "1", "enough".
 * @param {string | number} amount
 * @param {string} unit  The display unit
 * @returns {string}
 */
export function amountText(amount, unit) {
    return UNWRITTEN_UNITS.has(unit) ? `${amount}` : `${amount} ${unit}`;
}

/**
 * A recipe reduced to what the shopping list needs: an amount per unit, the prep
 * qualifiers worth carrying to the store, and nothing else.
 * @typedef {object} ShoppingItem
 * @property {number | null} amount  null for "enough", which has no measurable amount to total
 * @property {string} unit
 * @property {string} ingredient
 * @property {string} [qualifier]
 */

/**
 * @typedef {object} ShoppingRecipe
 * @property {string} name
 * @property {ShoppingItem[]} items
 */

/**
 * @param {Recipe} recipe
 * @param {Database} database
 * @returns {ShoppingRecipe}
 */
export function toShoppingRecipe(recipe, database) {
    const items = recipe.measurements.map((measurement) => {
        const parsedAmount = Number(measurement.amount);
        const qualifierWords = [
            measurement.prefix,
            // Suffixes are written as continuations of the ingredient, e.g. ", room temperature"
            measurement.suffix?.replace(/^,\s*/, ""),
        ].filter((word) => word != null && word !== "");

        /** @type {ShoppingItem} */
        const item = {
            amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
            unit: displayUnit(measurement, database),
            ingredient: measurement.ingredient,
        };
        if (qualifierWords.length > 0) {
            item.qualifier = qualifierWords.join(", ");
        }
        return item;
    });

    return { name: recipe.name, items };
}

/**
 * One ingredient across every selected recipe, with a running total per unit so grams and
 * portions of the same thing stay distinguishable ("454 grams + 1 thin spaghetti").
 * @typedef {object} ShoppingTotal
 * @property {string} ingredient  As first spelled
 * @property {Map<string, number>} amountByUnit
 * @property {boolean} needsUnmeasuredAmount  Some recipe wants "enough" of it
 * @property {Set<string>} qualifiers
 * @property {Set<string>} recipeNames
 */

/**
 * Ingredients are matched by name, ignoring case and surrounding space.
 * @param {string} ingredient
 * @returns {string}
 */
export function ingredientKeyOf(ingredient) {
    return ingredient.trim().toLowerCase();
}

/**
 * Totals the ingredients of the given recipes, alphabetized by ingredient key.
 * @param {ShoppingRecipe[]} recipes
 * @returns {[string, ShoppingTotal][]}
 */
export function totalShoppingItems(recipes) {
    /** @type {Map<string, ShoppingTotal>} */
    const totalByIngredientKey = new Map();
    for (const recipe of recipes) {
        for (const item of recipe.items) {
            const ingredientKey = ingredientKeyOf(item.ingredient);
            let total = totalByIngredientKey.get(ingredientKey);
            if (total == null) {
                total = {
                    ingredient: item.ingredient,
                    amountByUnit: new Map(),
                    needsUnmeasuredAmount: false,
                    qualifiers: new Set(),
                    recipeNames: new Set(),
                };
                totalByIngredientKey.set(ingredientKey, total);
            }

            if (item.amount == null) {
                total.needsUnmeasuredAmount = true;
            } else {
                total.amountByUnit.set(item.unit, (total.amountByUnit.get(item.unit) ?? 0) + item.amount);
            }
            if (item.qualifier != null) {
                total.qualifiers.add(item.qualifier);
            }
            total.recipeNames.add(recipe.name);
        }
    }

    return [...totalByIngredientKey.entries()].sort(([left], [right]) => left.localeCompare(right));
}

/**
 * Sums of fractional gram amounts pick up floating point dust, so trim it off.
 * @param {number} amount
 * @returns {string}
 */
function formatAmount(amount) {
    return `${Math.round(amount * 100) / 100}`;
}

/**
 * A total as it reads on the list: "454 grams + 1", or "enough" when nothing is measured.
 * @param {ShoppingTotal} total
 * @returns {string}
 */
export function formatTotalAmount(total) {
    const parts = [...total.amountByUnit].map(([unit, amount]) => amountText(formatAmount(amount), unit));
    if (total.needsUnmeasuredAmount) {
        parts.push("enough");
    }
    return parts.join(" + ");
}
