/**
 * Centralized Value Resolution Logic
 * 
 * This module contains the whitelist configuration and resolveSourceValue function
 * that determines how values flow between nodes. This is shared between evaluator.js
 * and Editor.jsx to prevent regressions from mismatched whitelists.
 * 
 * IMPORTANT: When adding a new node type, consider:
 * 1. Does it output objects/arrays that downstream nodes need raw? → Add to SOURCE_WHITELIST
 * 2. Does it need to receive raw objects/arrays from upstream? → Add to TARGET_WHITELIST
 * 3. Does it have special output format (like GROUP with {nodeId: value})? → Add special extraction logic
 */

// Nodes that always pass their raw value through (output side)
// These nodes output objects/arrays that should not be unwrapped based on handle
export const SOURCE_WHITELIST = new Set([
    'FORM',
    'GROUP_INPUT',
    'GROUP_INPUT_LIST',
    'PACK',
    // Iterator context nodes
    'MAP_ITEM',
    'FILTER_ITEM',
    'REDUCE_ITEM',
    'REDUCE_ACCUMULATOR',
    // Iterator output nodes (their results are arrays/values)
    'MAP',
    'FILTER',
    'REDUCE',
    // Special extraction handled separately, but still pass raw after extraction
    'GROUP',
    'UNPACK'
]);

// Nodes that need to receive raw objects/arrays (input side)
// These nodes expect unmodified objects/arrays as input
export const TARGET_WHITELIST = new Set([
    'GET_KEY',
    'GET',
    'UNPACK',
    'GROUP_INPUT_LIST',
    // Iterators need raw arrays as input
    'MAP',
    'FILTER',
    'REDUCE',
    // Iterator output nodes need raw values from context
    'MAP_OUTPUT',
    'FILTER_INCLUDE',
    'REDUCE_OUTPUT'
]);

/**
 * Resolve the value from a source node to a target node.
 * This handles special cases like GROUP output wrapping and UNPACK multi-output.
 * 
 * @param {any} rawVal - The raw value from the source node
 * @param {string} handle - The sourceHandle on the edge (used for object key extraction)
 * @param {string} sourceType - The type of the source node
 * @param {string} targetType - The type of the target node
 * @returns {any} The resolved value to pass to the target
 */
export const resolveSourceValue = (rawVal, handle, sourceType, targetType) => {
    // STEP 1: Special extraction for nodes with wrapped output format

    // GROUP outputs are always wrapped as { outputNodeId: value }
    // Extract the actual value using handle BEFORE any other processing
    if (sourceType === 'GROUP' && typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal) && handle) {
        const extracted = rawVal[handle];
        if (extracted !== undefined) {
            rawVal = extracted;
        }
    }

    // UNPACK outputs are { key1: value1, key2: value2, ... }
    // Extract the specific key's value using handle
    if (sourceType === 'UNPACK' && typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal) && handle) {
        const extracted = rawVal[handle];
        if (extracted !== undefined) {
            rawVal = extracted;
        }
    }

    // STEP 2: Check whitelists - these take priority after special extraction

    // Target whitelist: these nodes need raw objects/arrays
    if (TARGET_WHITELIST.has(targetType)) {
        return rawVal;
    }

    // Source whitelist: these nodes output values that shouldn't be further unwrapped
    // Note: GROUP and UNPACK are included because we already extracted using handle above
    if (SOURCE_WHITELIST.has(sourceType)) {
        return rawVal;
    }

    // STEP 3: Default unwrapping logic for non-whitelisted connections

    // If specific handle requested and exists on object, return that key's value
    if (typeof rawVal === 'object' && rawVal !== null && handle) {
        const val = rawVal[handle];
        return val !== undefined && val !== null ? val : 0;
    }

    // Fallback: Unwrap single valid object values
    if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
        return Object.values(rawVal)[0] ?? 0;
    }

    return rawVal;
};
