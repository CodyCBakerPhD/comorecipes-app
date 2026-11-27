// What a page shows before the database bundle has arrived, and when it never does: the shell
// in site/index.html itself, imported raw so the story cannot drift from it.
import indexHtml from "../../site/index.html?raw";
import { buildShell, find } from "../utils.js";

export default { title: "Pages/Shell", parameters: { layout: "fullscreen", bodyClass: "index-page" } };

export const Loading = { name: "Loading", render: () => buildShell(indexHtml) };

export const CouldNotLoad = {
    name: "Could not load",
    render: () =>
        buildShell(indexHtml, (page) => {
            // Mirrors showError in site/js/app.js, with the message fetchBundle gives for a 404
            const status = find(page, "#shell-status");
            status.className = "shell-status error";
            status.innerHTML =
                "Could not load the recipes. The database bundle at database.json.gz answered 404 Not Found.<br>" +
                '<a href="index.html">Try again</a>';
        }),
};
