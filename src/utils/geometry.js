import { getNodeHeight } from './layout';
import { getDefinition } from '../engine/nodeDefinitions';

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

export const getHandlePosition = (nodeId, nodes, type, handleId, NODE_WIDTH = 256) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [0, 0];

    let y = node.position.y;
    let x = node.position.x;

    // Helpers to sort handles consistent with Node.jsx
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

    if (type === 'input') {
        const def = getDefinition(node.type);

        if (node.type === 'GROUP' && handleId) {
            let handles = node.data.subGraph?.nodes
                .filter(n => n.type === 'GROUP_INPUT')
                .map(n => n.id) || [];

            // Apply Order
            handles = getSortedOrder(handles, node.data.inputOrder);

            const idx = handles.indexOf(handleId);
            // If collapsed, all handles at single point
            if (node.data?.collapsed) {
                y += 20;
            } else if (idx !== -1) {
                y += 40 + (idx * 24);
            } else {
                y += 50;
            }
        } else if (node.type === 'COLLECTOR') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            y += 40 + (idx * 24);
        } else if (node.type === 'FORM') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            // Matched with Node.jsx: 48 + (i * 30)
            y += 48 + (idx * 30);
        } else if (node.type === 'FUNCTION') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            // Matched with Node.jsx: 80 + (i * 30)
            y += 80 + (idx * 30);
        } else if (node.type === 'GAUGE') {
            // Hardcoded legacy
            if (handleId === 'val') y += 40;
            else if (handleId === 'min') y += 64;
            else if (handleId === 'max') y += 88;
            else y += 40;
        } else if (node.type === 'PROGRESS') {
            if (handleId === 'val') y += 40;
            else if (handleId === 'max') y += 64;
            else y += 40;
        } else if (node.type === 'CUSTOM') {
            y += 100; // Custom usually has textarea above
        } else if (node.type === 'UNPACK') {
            // UNPACK input - single 'object' input, positioned at 20 when collapsed, 110 otherwise
            y += node.data?.collapsed ? 20 : 110;
        } else if (node.type === 'TEMPLATE') {
            // TEMPLATE input - fixed position, or collapsed at 20
            y += node.data?.collapsed ? 20 : 60;
        } else if (def.inputs && !def.inputs.includes('*')) {
            // Registry Defined
            let handles = [...def.inputs];
            handles = getSortedOrder(handles, node.data.inputOrder);
            const idx = handles.indexOf(handleId);
            if (idx !== -1) y += 40 + (idx * 24);
            else y += 40;
        } else if (node.type === 'GROUP_OUTPUT') {
            // GROUP_OUTPUT has single input - center it
            const h = getNodeHeight(node);
            y += h / 2;
        } else if (node.type !== 'INPUT' && node.type !== 'GROUP_INPUT') {
            // Default center
            const h = getNodeHeight(node);
            y += h / 2;
        } else {
            // Input nodes main port
            y += 20;
        }

    } else {
        // Output
        x += NODE_WIDTH;
        const def = getDefinition(node.type);

        if (node.type === 'GROUP' && handleId) {
            let handles = node.data.subGraph?.nodes
                .filter(n => n.type === 'GROUP_OUTPUT')
                .map(n => n.id) || [];

            handles = getSortedOrder(handles, node.data.outputOrder);

            const idx = handles.indexOf(handleId);
            // If collapsed, all handles at single point
            if (node.data?.collapsed) {
                y += 20;
            } else if (idx !== -1) {
                y += 40 + (idx * 24);
            } else {
                y += 50;
            }
        } else if (node.type === 'FORM') {
            // FORM output should be centered based on node height
            const height = getNodeHeight(node);
            y += height / 2;
        } else if (node.type === 'UNPACK') {
            // UNPACK outputs - match visual positions
            if (node.data?.collapsed) {
                y += 20;
            } else {
                const keys = node.data?.keys || [];
                const idx = keys.indexOf(handleId);
                if (idx !== -1) y += 80 + (idx * 28);
                else y += 80;
            }
        } else if (node.type === 'TEMPLATE') {
            // TEMPLATE output - fixed position, or collapsed at 20
            y += node.data?.collapsed ? 20 : 60;
        } else if (def.outputs) {
            let handles = [...def.outputs];
            handles = getSortedOrder(handles, node.data.outputOrder);
            const idx = handles.indexOf(handleId);
            if (idx !== -1) y += 40 + (idx * 24);
            else y += 40; // Fallback
        } else {
            const height = getNodeHeight(node);
            y += height / 2;
        }
    }

    return [x, y];
};
