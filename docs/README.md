# Working on the site

## Commands

```bash
npm run serve              # the repo over HTTP at http://127.0.0.1:4173/ (the site is at /site/)
npm run typecheck          # tsc over the site, the scripts, the tests, the stories and configs/
npm test                   # the data layer, under node:test
npm run test:coverage      # the same, writing coverage/unit/lcov.info
npm run test:e2e           # the smoke tests, in Chromium, against tests/fixtures/database.json.gz
npm run test:e2e:coverage  # the same, writing Chromium's coverage of site/js to coverage/e2e/lcov.info
npm run storybook          # the component and page stories, live
npm run test:chromatic     # the page snapshots, in Chromium (nothing is uploaded)
```

## Coverage

CI uploads two coverage reports to [Codecov](https://codecov.io/gh/CodyCBakerPhD/comorecipes-app) on every push and pull request, and Codecov merges them.
The `unit` flag is the unit tests' coverage of the data layer, which is all they load (`bundle.js` and `models.js`).
The `e2e` flag is Chromium's coverage of all of `site/js` while the smoke tests run, collected by `tests/coverage.js`, since the pages, search, list mode and the shopping list only ever run in a browser.
The upload authenticates with GitHub's OIDC token, so there is no secret to keep; coverage changes are reported on pull requests but never block one (`codecov.yml`).

## Visual snapshots

Every push is rendered on [Chromatic](https://www.chromatic.com) and compared against the last accepted baseline, twice: once per story, once per page state.
The two feeds answer different questions, which is why there are two projects, two build workflows and two badges.
Both read the same small, fixed recipe database, `tests/chromatic/fixtures/database.json`, never the published one, so a recipe change in the database repo re-snapshots nothing.

### Stories versus Playwright snapshots

|                          | Storybook stories                                                                                                          | Playwright snapshots                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| What is captured         | One component or page in one state, rendered by the site's own `render*Page` functions, with none of its behavior running, in each theme | The real site, booted in Chromium and driven to a state the way a person would reach it, at desktop, tablet and phone sizes |
| Where it lives           | `stories/*.stories.js` (the pages under `stories/pages/`)                                                                  | `tests/chromatic/*.chromatic.test.js`                                                                                       |
| What a diff points at    | That component or page, in that state and theme                                                                            | The page as a whole: layout between components, overflow at narrow widths, what search, list mode and the shopping list did |
| How it reaches Chromatic | The built Storybook (`npm run build-storybook`)                                                                            | An archive of the DOM that `@chromatic-com/playwright` records at the end of each test (`npm run test:chromatic`)           |
| Workflow and badge       | Chromatic (Storybook)                                                                                                      | Chromatic (Playwright)                                                                                                      |

A story is the place for a component's own states (a shopping-list row to buy or bought), each rendered in light and dark by Chromatic.
A Playwright snapshot is the place for a page state (loading, the database out of reach, list mode with two recipes picked, a filled shopping list) on each page of the site, since only the running site knows how its pieces fit together.
Every snapshot test pins the theme through the `como-theme` key that `assets/theme.js` reads, and fails by name if anything reaches past the right edge of the screen.
No production code is involved: the snapshots point the site at the fixture through `window.COMO_BUNDLE_URL`, as the smoke tests do with theirs.
Neither keeps pixels in this repository: Chromatic renders both in its own browsers, holds the baselines, and a change is accepted or rejected in its review UI.

### Setup (once per repository)

1. Create two Chromatic projects for this repository: one for Storybook, then **Add project**, pick the same repository again, and name the second one for Playwright.
2. Add each project's token as a repository secret: `CHROMATIC_STORYBOOK_PROJECT_TOKEN` and `CHROMATIC_PLAYWRIGHT_PROJECT_TOKEN`.
3. Push. `chromatic-storybook.yml` and `chromatic-playwright.yml` under `.github/workflows/` build on every push without a token, and `chromatic-publish.yml` uploads each build from the default branch, which holds the tokens.
   The first upload comes from the merge that adds these files; that first build of each project is its baseline, so look it over in Chromatic once.
   After that, the default branch's builds are accepted on their own, since their changes were reviewed on their pull requests.

### Day to day

1. `npm run storybook` to look at the stories; `npm run test:chromatic` to run the page captures locally. Nothing is uploaded from a local run.
2. Push a branch, or open a pull request from a fork. Each build workflow captures its feed, `chromatic-publish.yml` uploads it, and Chromatic posts one status check per project once the upload is done.
3. Open the check and review each diff: accept what was intended, otherwise fix and push again. Chromatic diffs a branch against that branch's own last build, so merge `main` in first when the branch is behind, or `main`'s changes show up as yours.
4. A new component state gets a story; a new page state gets a `forEachViewport` test in `tests/chromatic/`, plus a way to reach it deterministically; a new page gets a story file under `stories/pages/`, a line in `configs/pages.js`, and a `tests/chromatic/<page>.chromatic.test.js` when it has states of its own.
   A state that needs a recipe the fixture lacks gets one added to `tests/chromatic/fixtures/database.json`, which re-snapshots the index.
