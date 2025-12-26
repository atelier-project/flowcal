import { getNodeHeight } from './layout';
import { getDefinition } from '../engine/nodeDefinitions';
import { HANDLE_POSITIONS } from './handlePositions';

/**
 * Utility: Calculate Bezier Curve Path for connections
 */
export const getBezierPath = (start, end) => {
    const [sx, sy] = start;
    const [ex, ey] = end;
    const dist = Math.abs(sx - ex) + Math.abs(sy - ey);
    const controlOffset = Math.min(dist * 0.5, 150);

    return `M${sx},${sy} C${sx + controlOffset},${sy} ${ex - controlOffset},${ey} ${ex},${ey}`;
};

// Helper to sort handles consistent with Node.jsx
const getSortedOrder = (items, order) => {
    if (!order || !Array.isArray(order)) return items;
    return [...items].sort((a, b) => {
        const idxA = order.indexOf(a);
        const idxB = order.indexOf(b);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
};

// Parse index from handle ID like "field_0" or "input_1"
const parseHandleIndex = (handleId) => parseInt(handleId?.split('_')[1] || '0', 10);

/**
 * Strategy functions for INPUT handle positioning by node type.
 * Each function receives (node, handleId, def, pos) and returns Y offset.
 */
const inputStrategies = {
    GROUP: (node, handleId, def, pos) => {
        let handles = node.data.subGraph?.nodes
            .filter(n => n.type === 'GROUP_INPUT')
            .map(n => n.id) || [];
        handles = getSortedOrder(handles, node.data.inputOrder);
        const idx = handles.indexOf(handleId);

        if (node.data?.collapsed) return HANDLE_POSITIONS.COLLAPSED;
        if (idx !== -1) return pos.base + (idx * pos.rowHeight);
        return 50;
    },

    COLLECTOR: (node, handleId, def, pos) => {
        const idx = parseHandleIndex(handleId);
        return pos.base + (idx * pos.rowHeight);
    },

    FORM: (node, handleId, def, pos) => {
        const idx = parseHandleIndex(handleId);
        return pos.base + (idx * pos.rowHeight);
    },

    FUNCTION: (node, handleId, def, pos) => {
        const idx = parseHandleIndex(handleId);
        return pos.base + (idx * pos.rowHeight);
    },

    GAUGE: (node, handleId) => HANDLE_POSITIONS.GAUGE[handleId] || HANDLE_POSITIONS.GAUGE.val,

    PROGRESS: (node, handleId) => HANDLE_POSITIONS.PROGRESS[handleId] || HANDLE_POSITIONS.PROGRESS.val,

    CUSTOM: (node) => node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 100,

    UNPACK: (node) => node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 110,

    PACK: (node, handleId, def, pos) => {
        if (node.data?.collapsed) return HANDLE_POSITIONS.COLLAPSED;
        const keys = node.data?.keys || [];
        const idx = keys.indexOf(handleId);
        if (idx !== -1) return pos.base + (idx * pos.rowHeight);
        return pos.base;
    },

    TEMPLATE: (node) => node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 60,

    GROUP_OUTPUT: (node) => getNodeHeight(node) / 2,

    INPUT: () => HANDLE_POSITIONS.COLLAPSED,

    GROUP_INPUT: () => HANDLE_POSITIONS.COLLAPSED,
};

/**
 * Strategy functions for OUTPUT handle positioning by node type.
 * Each function receives (node, handleId, def, pos) and returns Y offset.
 */
const outputStrategies = {
    GROUP: (node, handleId, def, pos) => {
        let handles = node.data.subGraph?.nodes
            .filter(n => n.type === 'GROUP_OUTPUT')
            .map(n => n.id) || [];
        handles = getSortedOrder(handles, node.data.outputOrder);
        const idx = handles.indexOf(handleId);

        if (node.data?.collapsed) return HANDLE_POSITIONS.COLLAPSED;
        if (idx !== -1) return pos.base + (idx * pos.rowHeight);
        return 50;
    },

    FORM: (node) => getNodeHeight(node) / 2,

    UNPACK: (node, handleId, def, pos) => {
        if (node.data?.collapsed) return HANDLE_POSITIONS.COLLAPSED;
        const keys = node.data?.keys || [];
        const idx = keys.indexOf(handleId);
        if (idx !== -1) return pos.base + (idx * pos.rowHeight);
        return pos.base;
    },

    CUSTOM: (node) => node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 100,

    TEMPLATE: (node) => node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 60,

    GROUP_INPUT: (node) => getNodeHeight(node) / 2,
};

/**
 * Default input positioning using registry definition
 */
const getDefaultInputPosition = (node, handleId, def) => {
    if (def.inputs && !def.inputs.includes('*')) {
        let handles = [...def.inputs];
        handles = getSortedOrder(handles, node.data.inputOrder);
        const idx = handles.indexOf(handleId);
        const defPos = HANDLE_POSITIONS.DEFAULT;
        if (idx !== -1) return defPos.base + (idx * defPos.rowHeight);
        return defPos.base;
    }
    // Default: center of node
    return getNodeHeight(node) / 2;
};

/**
 * Default output positioning using registry definition
 */
const getDefaultOutputPosition = (node, handleId, def) => {
    if (def.outputs) {
        let handles = [...def.outputs];
        handles = getSortedOrder(handles, node.data.outputOrder);
        const idx = handles.indexOf(handleId);
        const defPos = HANDLE_POSITIONS.DEFAULT;
        if (idx !== -1) return defPos.base + (idx * defPos.rowHeight);
        return defPos.base;
    }
    // Default: center of node
    return getNodeHeight(node) / 2;
};

/**
 * Main function to get handle position for connections
 */
export const getHandlePosition = (nodeId, nodes, type, handleId, NODE_WIDTH = 256) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [0, 0];

    let x = node.position.x;
    let y = node.position.y;
    const def = getDefinition(node.type);
    const pos = HANDLE_POSITIONS[node.type] || HANDLE_POSITIONS.DEFAULT;

    if (type === 'input') {
        // Check for specific strategy, otherwise use default
        const strategy = inputStrategies[node.type];
        if (strategy) {
            y += strategy(node, handleId, def, pos);
        } else {
            y += getDefaultInputPosition(node, handleId, def);
        }
    } else {
        // Output - adjust x position first
        x += node.data?.width || NODE_WIDTH;

        // Check for specific strategy, otherwise use default
        const strategy = outputStrategies[node.type];
        if (strategy) {
            y += strategy(node, handleId, def, pos);
        } else {
            y += getDefaultOutputPosition(node, handleId, def);
        }
    }

    return [x, y];
};
