// Vite's `?raw` suffix imports a file's text; the stories use it for site/index.html and the
// fixture bundle. Declared here rather than through vite/client, which would also bring in
// Vite's other client globals that nothing else in this repository uses.
declare module "*?raw" {
    const content: string;
    export default content;
}
