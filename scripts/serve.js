#!/usr/bin/env node
// Serves the repo over plain HTTP for local development and the smoke tests. Files are sent
// as they are, with no caching and no content encoding, so a .json.gz is delivered as the
// gzipped bytes it is, the way raw.githubusercontent.com delivers the published bundle. A
// missing path answers with the nearest 404.html above it, the way GitHub Pages does.
//
// Usage: node scripts/serve.js [port] [directory]   (defaults: 4173 and the repo root)

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_TYPES = new Map([
    [".html", "text/html; charset=utf-8"],
    [".js", "text/javascript; charset=utf-8"],
    [".css", "text/css; charset=utf-8"],
    [".json", "application/json; charset=utf-8"],
    [".gz", "application/gzip"],
    [".jpg", "image/jpeg"],
    [".ico", "image/x-icon"],
    [".svg", "image/svg+xml"],
    [".txt", "text/plain; charset=utf-8"],
]);

const port = Number(process.argv[2] ?? 4173);
const root = resolve(process.argv[3] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));

/**
 * @param {string} path
 * @returns {Promise<string | null>}  The file to send for a request path, or null if there is none
 */
async function resolveFile(path) {
    const file = join(root, normalize(path));
    if (!file.startsWith(root)) {
        return null;
    }
    try {
        const stats = await stat(file);
        if (stats.isDirectory()) {
            return path.endsWith("/") ? resolveFile(`${path}index.html`) : null;
        }
        return stats.isFile() ? file : null;
    } catch {
        return null;
    }
}

/**
 * @param {string} path
 * @returns {Promise<string | null>}  The nearest 404.html at or above the request path's directory
 */
async function resolveNotFoundPage(path) {
    let directory = path.endsWith("/") ? path : dirname(path);
    for (;;) {
        const candidate = await resolveFile(join(directory, "404.html").replaceAll("\\", "/"));
        if (candidate != null) {
            return candidate;
        }
        if (directory === "/" || directory === ".") {
            return null;
        }
        directory = dirname(directory);
    }
}

/**
 * @param {import("node:http").ServerResponse} response
 * @param {string} file
 * @param {number} status
 */
function send(response, file, status) {
    response.writeHead(status, {
        "Content-Type": CONTENT_TYPES.get(extname(file)) ?? "application/octet-stream",
        "Cache-Control": "no-store",
    });
    createReadStream(file).pipe(response);
}

const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const file = await resolveFile(path);
    if (file != null) {
        send(response, file, 200);
        return;
    }
    const notFoundPage = await resolveNotFoundPage(path);
    if (notFoundPage != null) {
        send(response, notFoundPage, 404);
        return;
    }
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Not found: ${path}\n`);
});

server.listen(port, "127.0.0.1", () => {
    console.log(`Serving ${root} at http://127.0.0.1:${port}/ (the site is at /site/)`);
});
