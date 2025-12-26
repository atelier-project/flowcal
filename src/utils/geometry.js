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
        const pos = HANDLE_POSITIONS[node.type] || HANDLE_POSITIONS.DEFAULT;

        if (node.type === 'GROUP' && handleId) {
            let handles = node.data.subGraph?.nodes
                .filter(n => n.type === 'GROUP_INPUT')
                .map(n => n.id) || [];

            handles = getSortedOrder(handles, node.data.inputOrder);

            const idx = handles.indexOf(handleId);
            if (node.data?.collapsed) {
                y += HANDLE_POSITIONS.COLLAPSED;
            } else if (idx !== -1) {
                y += pos.base + (idx * pos.rowHeight);
            } else {
                y += 50;
            }
        } else if (node.type === 'COLLECTOR') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            y += pos.base + (idx * pos.rowHeight);
        } else if (node.type === 'FORM') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            y += pos.base + (idx * pos.rowHeight);
        } else if (node.type === 'FUNCTION') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            y += pos.base + (idx * pos.rowHeight);
        } else if (node.type === 'GAUGE') {
            y += HANDLE_POSITIONS.GAUGE[handleId] || HANDLE_POSITIONS.GAUGE.val;
        } else if (node.type === 'PROGRESS') {
            y += HANDLE_POSITIONS.PROGRESS[handleId] || HANDLE_POSITIONS.PROGRESS.val;
        } else if (node.type === 'CUSTOM') {
            y += node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 100;
        } else if (node.type === 'UNPACK') {
            y += node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 110;
        } else if (node.type === 'PACK') {
            const packPos = HANDLE_POSITIONS.PACK;
            if (node.data?.collapsed) {
                y += HANDLE_POSITIONS.COLLAPSED;
            } else {
                const keys = node.data?.keys || [];
                const idx = keys.indexOf(handleId);
                if (idx !== -1) y += packPos.base + (idx * packPos.rowHeight);
                else y += packPos.base;
            }
        } else if (node.type === 'TEMPLATE') {
            y += node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 60;
        } else if (def.inputs && !def.inputs.includes('*')) {
            let handles = [...def.inputs];
            handles = getSortedOrder(handles, node.data.inputOrder);
            const idx = handles.indexOf(handleId);
            const defPos = HANDLE_POSITIONS.DEFAULT;
            if (idx !== -1) y += defPos.base + (idx * defPos.rowHeight);
            else y += defPos.base;
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
            y += HANDLE_POSITIONS.COLLAPSED;
        }

    } else {
        // Output
        x += node.data?.width || NODE_WIDTH;
        const def = getDefinition(node.type);

        if (node.type === 'GROUP' && handleId) {
            let handles = node.data.subGraph?.nodes
                .filter(n => n.type === 'GROUP_OUTPUT')
                .map(n => n.id) || [];

            handles = getSortedOrder(handles, node.data.outputOrder);
            const groupPos = HANDLE_POSITIONS.GROUP;

            const idx = handles.indexOf(handleId);
            if (node.data?.collapsed) {
                y += HANDLE_POSITIONS.COLLAPSED;
            } else if (idx !== -1) {
                y += groupPos.base + (idx * groupPos.rowHeight);
            } else {
                y += 50;
            }
        } else if (node.type === 'FORM') {
            // FORM output should be centered based on node height
            const height = getNodeHeight(node);
            y += height / 2;
        } else if (node.type === 'UNPACK') {
            const unpackPos = HANDLE_POSITIONS.UNPACK;
            if (node.data?.collapsed) {
                y += HANDLE_POSITIONS.COLLAPSED;
            } else {
                const keys = node.data?.keys || [];
                const idx = keys.indexOf(handleId);
                if (idx !== -1) y += unpackPos.base + (idx * unpackPos.rowHeight);
                else y += unpackPos.base;
            }
        } else if (node.type === 'CUSTOM') {
            y += node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 100;
        } else if (node.type === 'TEMPLATE') {
            y += node.data?.collapsed ? HANDLE_POSITIONS.COLLAPSED : 60;
        } else if (node.type === 'GROUP_INPUT') {
            // GROUP_INPUT has single output - center it
            const height = getNodeHeight(node);
            y += height / 2;
        } else if (def.outputs) {
            let handles = [...def.outputs];
            handles = getSortedOrder(handles, node.data.outputOrder);
            const idx = handles.indexOf(handleId);
            const defPos = HANDLE_POSITIONS.DEFAULT;
            if (idx !== -1) y += defPos.base + (idx * defPos.rowHeight);
            else y += defPos.base;
        } else {
            const height = getNodeHeight(node);
            y += height / 2;
        }
    }

    return [x, y];
};
