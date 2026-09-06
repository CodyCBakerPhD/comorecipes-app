// The pure data layer, checked against a small hand-written bundle.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gzipSync } from "node:zlib";

import { isGzip, parseBundle } from "../site/js/bundle.js";
import {
    amountText,
    buildDatabase,
    displayUnit,
    formatTotalAmount,
    toShoppingRecipe,
    totalShoppingItems,
} from "../site/js/models.js";

/** @type {import("../site/js/models.js").Bundle} */
const bundle = {
    commit: "0123456789abcdef0123456789abcdef01234567",
    generated_at: "2026-09-06T12:00:00+00:00",
    recipes: {
        spaghetti: {
            name: "Spaghetti",
            tags: ["Pasta", "Entree"],
            measurements: [
                { amount: "1", unit: "portions", ingredient: "thin spaghetti" },
                { amount: "1", unit: "portions", ingredient: "marinara sauce", recipe: "marinara_sauce" },
            ],
            instructions: ["Cook noodles.", "Warm sauce."],
        },
        marinara_sauce: {
            name: "Marinara Sauce",
            tags: ["Sauce", "Pasta"],
            measurements: [
                { amount: "76", unit: "grams", ingredient: "olive oil" },
                { amount: "3", unit: "portions", prefix: "minced", ingredient: "garlic" },
                { amount: "enough", ingredient: "salt" },
            ],
            instructions: ["Simmer."],
            notes: ["Do not scorch."],
        },
        garlic_bread: {
            name: "Garlic Bread",
            tags: ["Side"],
            measurements: [
                { amount: "2", unit: "portions", ingredient: "garlic", suffix: ", roasted" },
                { amount: "0.1", unit: "grams", ingredient: "Olive Oil" },
                { amount: 0.2, unit: "grams", ingredient: "olive oil" },
                { amount: "1", unit: "portions", ingredient: "marinara sauce", recipe: "marinara_sauce" },
            ],
            instructions: ["Toast."],
        },
    },
    ingredients: {
        garlic: { name: "garlic", default_grams_per_package: 40, default_package_unit: "heads", portions_text: "cloves" },
        thin_spaghetti: { name: "thin spaghetti", default_grams_per_package: 454, default_package_unit: "(16 oz.) packages" },
    },
};

const database = buildDatabase(bundle);
const marinara = bundle.recipes.marinara_sauce;
const garlicBread = bundle.recipes.garlic_bread;

describe("buildDatabase", () => {
    it("alphabetizes the records by stem and the tags by name", () => {
        assert.deepEqual([...database.recipes.keys()], ["garlic_bread", "marinara_sauce", "spaghetti"]);
        assert.deepEqual([...database.ingredients.keys()], ["garlic", "thin_spaghetti"]);
        assert.deepEqual(database.tags, ["Entree", "Pasta", "Sauce", "Side"]);
    });

    it("keeps the bundle's version", () => {
        assert.equal(database.commit, bundle.commit);
        assert.equal(database.generatedAt, bundle.generated_at);
    });

    it("links component recipes both ways from the declared recipe keys only", () => {
        assert.deepEqual(database.componentRecipes.get("spaghetti"), new Map([[1, "marinara_sauce"]]));
        assert.deepEqual(database.componentRecipes.get("garlic_bread"), new Map([[3, "marinara_sauce"]]));
        assert.equal(database.componentRecipes.has("marinara_sauce"), false);
        assert.deepEqual(database.usedIn.get("marinara_sauce"), ["garlic_bread", "spaghetti"]);
        // "garlic" is an ingredient name, not a recipe stem, so no link is inferred from it
        assert.equal(database.usedIn.has("garlic"), false);
    });

    it("rejects a link to a recipe that does not exist", () => {
        const broken = structuredClone(bundle);
        broken.recipes.spaghetti.measurements[1].recipe = "ketchup";
        assert.throws(() => buildDatabase(broken), /"ketchup", but no such recipe exists/);
    });

    it("rejects a recipe made from itself", () => {
        const broken = structuredClone(bundle);
        broken.recipes.spaghetti.measurements[1].recipe = "spaghetti";
        assert.throws(() => buildDatabase(broken), /made from itself/);
    });
});

describe("displayUnit", () => {
    it("is empty for an unmeasured amount", () => {
        assert.equal(displayUnit(marinara.measurements[2], database), "");
    });

    it("spells out the portions of a registered ingredient", () => {
        assert.equal(displayUnit(marinara.measurements[1], database), "cloves");
    });

    it("keeps the literal unit otherwise", () => {
        assert.equal(displayUnit(bundle.recipes.spaghetti.measurements[0], database), "portions");
        assert.equal(displayUnit(marinara.measurements[0], database), "grams");
    });
});

describe("amountText", () => {
    it("leaves unwritten units out", () => {
        assert.equal(amountText("1", "portions"), "1");
        assert.equal(amountText("enough", ""), "enough");
    });

    it("writes the others after the amount", () => {
        assert.equal(amountText("76", "grams"), "76 grams");
        assert.equal(amountText("3", "cloves"), "3 cloves");
    });
});

describe("toShoppingRecipe", () => {
    it("parses amounts, resolves units, and carries the prep qualifiers", () => {
        assert.deepEqual(toShoppingRecipe(marinara, database), {
            name: "Marinara Sauce",
            items: [
                { amount: 76, unit: "grams", ingredient: "olive oil" },
                { amount: 3, unit: "cloves", ingredient: "garlic", qualifier: "minced" },
                { amount: null, unit: "", ingredient: "salt" },
            ],
        });
    });

    it("turns a suffix continuation into a qualifier and accepts bare numbers", () => {
        const { items } = toShoppingRecipe(garlicBread, database);
        assert.equal(items[0].qualifier, "roasted");
        assert.equal(items[2].amount, 0.2);
    });
});

describe("totalShoppingItems", () => {
    const totals = totalShoppingItems([toShoppingRecipe(marinara, database), toShoppingRecipe(garlicBread, database)]);
    const totalByKey = new Map(totals);

    it("lists each ingredient once, alphabetized, matched without regard to case", () => {
        assert.deepEqual(
            totals.map(([key]) => key),
            ["garlic", "marinara sauce", "olive oil", "salt"],
        );
        assert.equal(totalByKey.get("olive oil")?.ingredient, "olive oil");
    });

    it("sums per unit and remembers which recipes want it", () => {
        const garlic = totalByKey.get("garlic");
        assert.deepEqual(garlic?.amountByUnit, new Map([["cloves", 5]]));
        assert.deepEqual([...(garlic?.qualifiers ?? [])], ["minced", "roasted"]);
        assert.deepEqual([...(garlic?.recipeNames ?? [])], ["Marinara Sauce", "Garlic Bread"]);
    });

    it("flags amounts that are only 'enough'", () => {
        const salt = totalByKey.get("salt");
        assert.equal(salt?.needsUnmeasuredAmount, true);
        assert.equal(salt?.amountByUnit.size, 0);
    });

    it("formats totals per unit, trimming floating point dust", () => {
        assert.equal(formatTotalAmount(totalByKey.get("olive oil") ?? fail()), "76.3 grams");
        assert.equal(formatTotalAmount(totalByKey.get("marinara sauce") ?? fail()), "1");
        assert.equal(formatTotalAmount(totalByKey.get("salt") ?? fail()), "enough");
    });

    it("joins measured and unmeasured amounts of the same ingredient", () => {
        const [[, total]] = totalShoppingItems([
            {
                name: "Soup",
                items: [
                    { amount: 200, unit: "grams", ingredient: "stock" },
                    { amount: null, unit: "", ingredient: "stock" },
                    { amount: 1, unit: "", ingredient: "stock" },
                ],
            },
        ]);
        assert.equal(formatTotalAmount(total), "200 grams + 1 + enough");
    });
});

describe("bundle bytes", () => {
    it("recognizes gzip by its magic bytes", () => {
        assert.equal(isGzip(new Uint8Array(gzipSync(Buffer.from("{}")))), true);
        assert.equal(isGzip(new TextEncoder().encode('{"recipes":{}}')), false);
        assert.equal(isGzip(new Uint8Array()), false);
    });

    it("parses a bundle and rejects anything else", () => {
        assert.deepEqual(parseBundle(JSON.stringify(bundle)), bundle);
        assert.throws(() => parseBundle("[]"), /not a recipe database bundle/);
        assert.throws(() => parseBundle('{"recipes": []}'), /not a recipe database bundle/);
        assert.throws(() => parseBundle("nonsense"), SyntaxError);
    });
});

/** @returns {never} */
function fail() {
    throw new Error("expected a total");
}
