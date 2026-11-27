// Runs once before the smoke tests, in the runner rather than in every worker: checks that the
// fixture bundle is there and writes the inflated copy one of the tests loads. Writing it from the
// spec module would rewrite it in every worker while another may be fetching it.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { DEFAULT_BUNDLE_URL } from "../site/js/bundle.js";

export const FIXTURE_GZ = new URL("./fixtures/database.json.gz", import.meta.url);
const FIXTURE_JSON = new URL("./fixtures/database.json", import.meta.url);

export default function globalSetup() {
    if (!existsSync(FIXTURE_GZ)) {
        throw new Error(
            "Put a database bundle at tests/fixtures/database.json.gz first. The published one:\n" +
                `  curl -fsSL -o tests/fixtures/database.json.gz ${DEFAULT_BUNDLE_URL}\n` +
                "or one built from a database checkout:\n" +
                "  python <database>/scripts/build_bundle.py tests/fixtures/database.json.gz <database>",
        );
    }
    writeFileSync(FIXTURE_JSON, gunzipSync(readFileSync(FIXTURE_GZ)));
}
