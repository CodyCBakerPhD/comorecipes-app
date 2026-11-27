/** @type {import("@storybook/html-vite").StorybookConfig} */
const config = {
    // Stories live beside the site rather than in site/, so a story is never published with it.
    stories: ["../../stories/**/*.stories.js"],
    // No addons: the stories exist to be snapshotted and looked at, nothing more.
    addons: [],
    // The site has no build and no Vite config of its own; Vite is only how Storybook bundles
    // the stories, which import the site's own modules from site/js as they are.
    framework: { name: "@storybook/html-vite", options: {} },
    // The page markup writes assets/como_logo.jpg relative to the page, which inside Storybook's
    // /iframe.html resolves to /assets/, so the site's assets are served there.
    staticDirs: [{ from: "../../site/assets", to: "/assets" }],
};

export default config;
