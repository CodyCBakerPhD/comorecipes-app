// Fetches the recipe database bundle: the one gzipped JSON file that the database repo
// publishes after every merge (see scripts/README.md over there). Nothing here knows what
// is inside the bundle beyond "an object with recipes and ingredients"; models.js does.

/** @typedef {import("./models.js").Bundle} Bundle */

export const DEFAULT_BUNDLE_URL =
    "https://raw.githubusercontent.com/CodyCBakerPhD/comorecipes-database/dist/database.json.gz";

// A ?bundle= override is remembered for the rest of the tab, so links between pages keep it
const BUNDLE_URL_STORAGE_KEY = "como-bundle-url";
// The last bundle fetched, kept so the site still works when the database cannot be reached
const SAVED_BUNDLE_STORAGE_KEY = "como-bundle";
const GZIP_MAGIC_BYTES = [0x1f, 0x8b];

/**
 * Where to fetch the bundle from, in order of precedence: a `?bundle=` query parameter
 * (remembered for the rest of the tab; `?bundle=` with no value forgets it), a
 * `window.COMO_BUNDLE_URL` global, then the bundle the database repo publishes.
 * @returns {string}
 */
export function bundleUrl() {
    const parameters = new URLSearchParams(location.search);
    if (parameters.has("bundle")) {
        const requested = parameters.get("bundle") ?? "";
        writeStorage(sessionStorage, BUNDLE_URL_STORAGE_KEY, requested);
        if (requested !== "") {
            return requested;
        }
    } else {
        const remembered = readStorage(sessionStorage, BUNDLE_URL_STORAGE_KEY);
        if (remembered != null && remembered !== "") {
            return remembered;
        }
    }
    const configured = /** @type {{ COMO_BUNDLE_URL?: unknown }} */ (globalThis).COMO_BUNDLE_URL;
    if (typeof configured === "string" && configured !== "") {
        return configured;
    }
    return DEFAULT_BUNDLE_URL;
}

/**
 * @typedef {object} LoadedBundle
 * @property {Bundle} bundle
 * @property {"network" | "saved"} source  Fetched just now, or the copy saved the last time a fetch succeeded
 */

/** @type {Map<string, Promise<LoadedBundle>>} */
const pendingByUrl = new Map();

/**
 * Loads the bundle once per page: every call for the same URL shares one fetch.
 * @param {string} [url]
 * @returns {Promise<LoadedBundle>}
 */
export function loadBundle(url = bundleUrl()) {
    let pending = pendingByUrl.get(url);
    if (pending == null) {
        pending = fetchOrRestore(url);
        pendingByUrl.set(url, pending);
    }
    return pending;
}

/**
 * @param {string} url
 * @returns {Promise<LoadedBundle>}
 */
async function fetchOrRestore(url) {
    try {
        const bundle = await fetchBundle(url);
        saveBundle(url, bundle);
        return { bundle, source: "network" };
    } catch (error) {
        const saved = restoreBundle(url);
        if (saved == null) {
            throw error;
        }
        console.warn(`Could not fetch ${url}; showing the copy saved earlier.`, error);
        return { bundle: saved, source: "saved" };
    }
}

/**
 * Fetches and parses the bundle at a URL. The published file is gzipped and served as is,
 * but a CDN or a dev server may hand back the inflated JSON, so the bytes decide.
 * @param {string} url
 * @returns {Promise<Bundle>}
 */
export async function fetchBundle(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`The database bundle at ${url} answered ${response.status} ${response.statusText}.`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = isGzip(bytes) ? await gunzip(bytes) : new TextDecoder().decode(bytes);
    return parseBundle(text);
}

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
export function isGzip(bytes) {
    return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_BYTES[0] && bytes[1] === GZIP_MAGIC_BYTES[1];
}

/**
 * @param {Uint8Array<ArrayBuffer>} bytes
 * @returns {Promise<string>}
 */
async function gunzip(bytes) {
    const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(inflated).text();
}

/**
 * @param {string} text
 * @returns {Bundle}
 */
export function parseBundle(text) {
    const bundle = JSON.parse(text);
    if (!isRecord(bundle) || !isRecord(bundle.recipes) || !isRecord(bundle.ingredients)) {
        throw new Error("That is not a recipe database bundle: it has no recipes and ingredients in it.");
    }
    return /** @type {Bundle} */ (bundle);
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
    return typeof value === "object" && value != null && !Array.isArray(value);
}

/**
 * Keeps the bundle for offline use, keyed by the commit it was built from so an unchanged
 * database is not written out again on every load.
 * @param {string} url
 * @param {Bundle} bundle
 */
function saveBundle(url, bundle) {
    const saved = readSavedBundle();
    if (saved != null && saved.url === url && saved.commit === bundle.commit && bundle.commit != null) {
        return;
    }
    writeStorage(localStorage, SAVED_BUNDLE_STORAGE_KEY, JSON.stringify({ url, commit: bundle.commit, bundle }));
}

/**
 * @param {string} url
 * @returns {Bundle | null}
 */
function restoreBundle(url) {
    const saved = readSavedBundle();
    return saved != null && saved.url === url ? saved.bundle : null;
}

/**
 * @returns {{ url: string, commit: string | null, bundle: Bundle } | null}
 */
function readSavedBundle() {
    const text = readStorage(localStorage, SAVED_BUNDLE_STORAGE_KEY);
    if (text == null) {
        return null;
    }
    try {
        const saved = JSON.parse(text);
        if (isRecord(saved) && typeof saved.url === "string" && isRecord(saved.bundle)) {
            return /** @type {{ url: string, commit: string | null, bundle: Bundle }} */ (saved);
        }
    } catch {
        // A corrupt entry is as good as none
    }
    return null;
}

// Private browsing modes and some embedded views refuse storage; the site just will not remember

/**
 * @param {Storage} storage
 * @param {string} key
 * @returns {string | null}
 */
function readStorage(storage, key) {
    try {
        return storage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * @param {Storage} storage
 * @param {string} key
 * @param {string} value
 */
function writeStorage(storage, key, value) {
    try {
        if (value === "") {
            storage.removeItem(key);
        } else {
            storage.setItem(key, value);
        }
    } catch {
        // Nothing to do; the next load fetches again
    }
}
