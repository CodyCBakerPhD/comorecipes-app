// The one DOM helper the behaviors share: look something up that the page's markup promises is there.

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement}
 */
export function requireElement(selector, root = document) {
    const element = root.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
        throw new Error(`The page has no "${selector}" element.`);
    }
    return element;
}

/**
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {HTMLElement[]}
 */
export function findElements(selector, root = document) {
    return [...root.querySelectorAll(selector)].filter((element) => element instanceof HTMLElement);
}
