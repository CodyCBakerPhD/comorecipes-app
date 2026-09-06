// Filters the recipe index by the search box and the selected tag chips, and honors
// ?tag= links from recipe pages by pre-selecting those tags.

import { findElements, requireElement } from "./dom.js";

export function setUpSearch() {
    const searchInput = /** @type {HTMLInputElement} */ (requireElement("#recipe-search"));
    const letterNav = requireElement(".letter-nav");
    const noResults = requireElement(".no-results");
    const sections = findElements(".letter-section");
    const tagButtons = findElements(".tag-filter .tag");
    /** @type {Set<string>} */
    const selectedTags = new Set();

    const applyFilters = () => {
        const query = searchInput.value.trim().toLowerCase();
        let anyMatches = false;
        for (const section of sections) {
            let sectionMatches = false;
            for (const item of findElements("li", section)) {
                const itemTags = (item.dataset.tags || "").split(",");
                const matchesQuery = (item.textContent ?? "").toLowerCase().includes(query);
                const matchesTags = [...selectedTags].every((tag) => itemTags.includes(tag));
                const matches = matchesQuery && matchesTags;
                item.hidden = !matches;
                sectionMatches = sectionMatches || matches;
            }
            section.hidden = !sectionMatches;
            anyMatches = anyMatches || sectionMatches;
        }
        letterNav.hidden = query !== "" || selectedTags.size > 0;
        noResults.hidden = anyMatches;
    };

    searchInput.addEventListener("input", applyFilters);
    for (const button of tagButtons) {
        button.addEventListener("click", () => {
            const tag = button.dataset.tag ?? "";
            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
            } else {
                selectedTags.add(tag);
            }
            button.classList.toggle("selected");
            applyFilters();
        });
    }

    for (const tag of new URLSearchParams(location.search).getAll("tag")) {
        const button = tagButtons.find((candidate) => candidate.dataset.tag === tag);
        if (button != null) {
            selectedTags.add(tag);
            button.classList.add("selected");
        }
    }
    if (selectedTags.size > 0) {
        applyFilters();
    }
}
