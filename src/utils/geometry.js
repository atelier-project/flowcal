import { getNodeHeight } from './layout';

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

    if (type === 'input') {
        if (node.type === 'GROUP' && handleId) {
            const handles = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
            const idx = handles.findIndex(h => h.id === handleId);
            if (idx !== -1) y += 40 + (idx * 24);
            else y += 50;
        } else if (node.type === 'COLLECTOR') {
            const idx = parseInt(handleId?.split('_')[1] || '0', 10);
            y += 40 + (idx * 24);
        } else if (node.type === 'RANGE') {
            if (handleId === 'start') y += 40;
            else if (handleId === 'end') y += 64;
            else if (handleId === 'step') y += 88;
            else y += 40;
        } else if (node.type === 'GAUGE') {
            if (handleId === 'val') y += 40;
            else if (handleId === 'min') y += 64;
            else if (handleId === 'max') y += 88;
            else y += 40;
        } else if (node.type === 'PROGRESS') {
            if (handleId === 'val') y += 40;
            else if (handleId === 'max') y += 64;
            else y += 40;
        } else if (node.type === 'CUSTOM') {
            y += 100;
        } else if (node.type !== 'INPUT' && node.type !== 'GROUP_INPUT') {
            // For generic nodes without named input handles, center vertically
            // The visual handle is at "top: 50%" relative to the node
            const h = getNodeHeight(node);
            y += h / 2;
        } else {
            y += 20;
        }
    } else {
        // Output
        x += NODE_WIDTH;
        if (node.type === 'GROUP' && handleId) {
            const handles = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT') || [];
            const idx = handles.findIndex(h => h.id === handleId);
            if (idx !== -1) y += 40 + (idx * 24);
            else y += 50;
        } else {
            const height = getNodeHeight(node);
            y += height / 2;
        }
    }

    return [x, y];
};
