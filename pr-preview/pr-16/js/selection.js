// The hand-off between the index's list mode and the shopping list. Both pages keep these up to
// date, so the index reopens in list mode with whatever is on the list, however the reader gets
// back there — the shopping list's "Edit selection" link, the logo, or the back button.

// The query parameter naming the selected recipes, as comma-separated file stems
export const RECIPES_PARAMETER = "recipes";
export const SELECTION_STORAGE_KEY = "como-list-selection";
export const LIST_MODE_STORAGE_KEY = "como-list-mode";
