# CoMo Recipes App

The website for our household cookbook, published at https://codycbakerphd.github.io/comorecipes-app/.

It is a static shell: HTML, CSS, and plain JavaScript modules, with no build step. When a page loads it fetches the whole recipe database as one gzipped JSON bundle and renders everything in the browser. The recipes themselves live in [comorecipes-database](https://github.com/CodyCBakerPhD/comorecipes-database); after every merge there, that repo validates the records against their schemas and publishes them as `database.json.gz` on its `dist` branch, which this site reads from `https://raw.githubusercontent.com/CodyCBakerPhD/comorecipes-database/dist/database.json.gz`. Nothing here rebuilds when a recipe changes: the next page load shows it (the CDN caches for about five minutes). Every page says at the foot which database commit it is showing.



## Pages

- `index.html`: every recipe grouped by first letter, with a letter navigation, search, tag filters (`?tag=` preselects one), and List Mode for picking recipes to shop for.
- `recipe.html?id=<stem>`: one recipe, by its file stem in the database. Ingredients that are themselves recipes link to them, and a recipe lists the recipes it is used in.
- `shopping_list.html?recipes=<stem>,<stem>`: the totalled ingredients of the picked recipes.
- `404.html`: sends links to the old per-recipe pages (`formatted_recipes/<stem>.html`) on to `recipe.html?id=<stem>`.

Light and dark themes follow the OS until the toggle in the top bar picks one, which is remembered on the device.



## Layout

- `site/` is what gets deployed, exactly as it is.
  - `js/bundle.js` fetches the bundle, inflates it (checking for the gzip magic bytes first, in case it arrives already inflated), parses it, and keeps the last good copy in `localStorage` so the site still works when the database cannot be reached.
  - `js/models.js` is the data layer: the record shapes, tags, cross-links, display units, and the shopping-list reduction. It knows nothing about HTML.
  - `js/layout.js` and `js/pages/` render each page's markup from the data; `js/search.js`, `js/list_mode.js`, and `js/shopping_list.js` are the page behaviors; `js/app.js` ties a page together.
  - `assets/style.css` is the stylesheet carried over from the old build-time site unchanged, and `assets/shell.css` the few additions.
- `tests/` holds the `node:test` checks of the data layer and the Playwright smoke tests.
- `scripts/serve.js` is the static server the tests and local development use.



## Running locally

Any static file server will do, but the one in `scripts/` sends a `.json.gz` the way the CDN does and answers missing paths with `404.html` the way GitHub Pages does:

```sh
npm run serve                                    # http://127.0.0.1:4173/site/
```

That serves the published bundle. To work against a database checkout of your own, build a bundle from it (the script needs `pip install pyyaml jsonschema`) and point the site at it with `?bundle=`; the choice is remembered for the rest of the tab, and `?bundle=` with no value goes back to the published one:

```sh
git clone https://github.com/CodyCBakerPhD/comorecipes-database ../comorecipes-database
python ../comorecipes-database/scripts/build_bundle.py database.json.gz ../comorecipes-database
open "http://127.0.0.1:4173/site/index.html?bundle=/database.json.gz"
```



## Tests

```sh
npm ci
npm run typecheck                                # JSDoc types, checked by tsc
npm test                                         # the data layer, under node:test
```

The smoke tests load the pages in Chromium against a bundle built from a database checkout, at `tests/fixtures/database.json.gz`:

```sh
python ../comorecipes-database/scripts/build_bundle.py tests/fixtures/database.json.gz ../comorecipes-database
npx playwright install chromium                  # once; or set CHROMIUM_EXECUTABLE to one you have
npm run test:e2e
```

CI runs all three on every pull request, against the database repo's `main`.



## Deploying

Pushes to `main` publish `site/` to GitHub Pages through the [deploy workflow](.github/workflows/deploy_site.yml), which enables Pages for the repo (built by Actions) the first time it runs.
