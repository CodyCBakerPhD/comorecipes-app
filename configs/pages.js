/**
 * Every page of the site, listed once. tests/chromatic/pages.chromatic.test.js visits `path`
 * (relative to the Playwright baseURL, which ends in /site/) and expects `heading` there. The
 * recipe and the shopping list name what to show in their query, from the fixture bundle at
 * tests/chromatic/fixtures/database.json, since without one they have nothing to render.
 */
export const PAGES = [
    { name: "Index", path: "index.html", heading: "CoMo Recipes" },
    {
        name: "Recipe",
        path: "recipe.html?id=spaghetti_with_tomato_sauce",
        heading: "Spaghetti with Tomato Sauce",
    },
    {
        name: "Shopping list",
        path: "shopping_list.html?recipes=spaghetti_with_tomato_sauce,garlic_bread",
        heading: "Shopping List",
    },
];
