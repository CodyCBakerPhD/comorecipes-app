// Applies the stored color theme before first paint and exposes the toggle used by the header button.
(() => {
    const storedTheme = localStorage.getItem("como-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
        document.documentElement.dataset.theme = storedTheme;
    }

    window.comoToggleTheme = () => {
        const root = document.documentElement;
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const currentTheme = root.dataset.theme ?? (prefersDark ? "dark" : "light");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        root.dataset.theme = nextTheme;
        localStorage.setItem("como-theme", nextTheme);
    };
})();
