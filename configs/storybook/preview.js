import "../../site/assets/style.css";
import "../../site/assets/shell.css";

/** @type {import("@storybook/html-vite").Preview} */
const preview = {
    parameters: {
        // The site's stylesheet themes <body> itself, so Storybook's own background layer is
        // disabled rather than painted over it.
        backgrounds: { disable: true },
        // Chromatic renders every story once per mode, each with its own baseline and approval,
        // by setting the `theme` global that the decorator below reads. Stories therefore export
        // one story per state and get both themes from here.
        chromatic: {
            modes: {
                light: { theme: "light" },
                dark: { theme: "dark" },
            },
        },
    },
    globalTypes: {
        theme: {
            description: "Site color theme",
            toolbar: {
                title: "Theme",
                icon: "circlehollow",
                items: [
                    { value: "light", title: "Light" },
                    { value: "dark", title: "Dark" },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: { theme: "light" },
    decorators: [
        // Pins the theme the way site/assets/theme.js does, through data-theme on <html>, so a
        // snapshot never falls back to the OS color-scheme preference of whichever machine
        // renders it. Each page styles itself by a class on <body> (index-page, recipe-page,
        // shopping-page), which a story names in its `bodyClass` parameter; set on every render
        // so one story's class never carries over into the next.
        (story, context) => {
            document.documentElement.dataset.theme = context.globals.theme ?? "light";
            document.body.className = context.parameters.bodyClass ?? "";
            return story();
        },
    ],
};

export default preview;
