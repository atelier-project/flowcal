/**
 * Centralized positioning constants for node handles.
 * These values must stay in sync with the CSS layout in Node.jsx.
 * 
 * Structure: { base: starting Y offset, rowHeight: spacing between rows }
 */

export const HANDLE_POSITIONS = {
    // Nodes with dynamic key-based inputs/outputs
    PACK: { base: 48, rowHeight: 24 },
    UNPACK: { base: 80, rowHeight: 32 },

    // Nodes with indexed inputs
    COLLECTOR: { base: 40, rowHeight: 24 },
    REPORT: { base: 100, rowHeight: 28 },
    FORM: { base: 48, rowHeight: 30 },
    FUNCTION: { base: 80, rowHeight: 30 },
    GROUP: { base: 40, rowHeight: 24 },

    // Special nodes
    GAUGE: {
        val: 40,
        min: 64,
        max: 88
    },
    PROGRESS: {
        val: 40,
        max: 64
    },
    RANGE: {
        start: 40,
        end: 64,
        step: 88
    },

    // Default for registry-defined inputs
    DEFAULT: { base: 40, rowHeight: 24 },

    // Collapsed state offset
    COLLAPSED: 20
};

// Common node width
export const NODE_WIDTH = 256;
