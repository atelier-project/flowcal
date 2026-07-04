import { getNodeHeight } from './layout';
import { getPortLayout, resolvePortTop } from './portLayout';
import { NODE_WIDTH } from './handlePositions';

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

/**
 * Orthogonal (right-angle) routing: leave the source horizontally, turn at the
 * mid-x, run vertically to the target's row, then into the target. Corners are
 * lightly rounded with quadratic arcs so dense flows stay easy to trace.
 */
export const getOrthogonalPath = (start, end) => {
    const [sx, sy] = start;
    const [ex, ey] = end;
    if (Math.abs(sy - ey) < 1) return `M${sx},${sy} L${ex},${ey}`; // straight when level

    const midX = (sx + ex) / 2;
    const r = Math.min(10, Math.abs(ex - sx) / 2, Math.abs(ey - sy) / 2);
    const dirY = ey > sy ? 1 : -1;
    const dirInX = ex > midX ? 1 : -1;

    return [
        `M${sx},${sy}`,
        `L${midX - r},${sy}`,
        `Q${midX},${sy} ${midX},${sy + r * dirY}`,
        `L${midX},${ey - r * dirY}`,
        `Q${midX},${ey} ${midX + r * dirInX},${ey}`,
        `L${ex},${ey}`,
    ].join(' ');
};

// Pick a path generator by routing mode ('orthogonal' | 'bezier').
export const getEdgePath = (start, end, routing) =>
    routing === 'orthogonal' ? getOrthogonalPath(start, end) : getBezierPath(start, end);

/**
 * Get the [x, y] canvas position of a node's handle for wire routing.
 *
 * Derives from the shared `getPortLayout` single source of truth, so wire
 * endpoints always land on the rendered dots (and the drop hit-test targets
 * the same points). `handleId` matches by port id; null/undefined are treated
 * as the single unnamed handle.
 */
export const getHandlePosition = (nodeId, nodes, type, handleId, nodeWidth = NODE_WIDTH) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return [0, 0];

    const ports = type === 'input' ? getPortLayout(node).inputs : getPortLayout(node).outputs;
    const port = ports.find(p => (p.id ?? null) === (handleId ?? null));

    const x = node.position.x + (type === 'input' ? 0 : (node.data?.width || nodeWidth));
    // Fall back to node center for a stale edge whose handle no longer exists.
    const y = node.position.y + (port ? resolvePortTop(node, port.top) : getNodeHeight(node) / 2);

    return [x, y];
};
