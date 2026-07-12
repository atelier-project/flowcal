import { getPortLayout, resolvePortTop } from './portLayout';
import { getNodeHeight } from './layout';

const NODE_WIDTH = 256;
// Nodes accept a drop slightly outside their box, so you don't have to be pixel-exact.
const DROP_PADDING = 20;

/**
 * @typedef {import('../types').Node} Node
 * @typedef {import('../types').Edge} Edge
 * @typedef {import('../types').Point} Point
 */

/**
 * Which node is under a drop point, if any. Later nodes win (they render on top),
 * matching the canvas' painter order.
 * @param {Node[]} nodes
 * @param {Point} point
 * @returns {Node|null}
 */
export function findNodeAtPoint(nodes, { x, y }) {
    return [...nodes].reverse().find((n) => {
        const height = getNodeHeight(n);
        return x >= n.position.x - DROP_PADDING
            && x <= n.position.x + NODE_WIDTH + DROP_PADDING
            && y >= n.position.y - DROP_PADDING
            && y <= n.position.y + height + DROP_PADDING;
    }) || null;
}

/**
 * The input port of `node` nearest a drop point's Y.
 *
 * Port positions come from getPortLayout — the single source of truth (#32) that
 * render, wire geometry and this hit-test all share, so they can never disagree
 * about where a port sits (the #28 wire-targeting bug).
 * @param {Node} node
 * @param {{ y: number }} point
 * @returns {string|null}
 */
export function findNearestInputPort(node, { y }) {
    let targetHandle = null;
    let minDist = Infinity;
    getPortLayout(node).inputs.forEach((p) => {
        const portY = node.position.y + resolvePortTop(node, p.top);
        const dist = Math.abs(y - portY);
        if (dist < minDist) { minDist = dist; targetHandle = p.id; }
    });
    return targetHandle;
}

/**
 * Resolve where a wire dropped at `point` should land: the node under the cursor
 * and its nearest input port. Returns null when the drop misses, or lands back on
 * the source node (self-connections aren't allowed).
 * @param {Node[]} nodes
 * @param {Point} point
 * @param {string} sourceId
 * @returns {{ targetNode: Node, targetHandle: string|null }|null}
 */
export function resolveConnectionTarget(nodes, point, sourceId) {
    const targetNode = findNodeAtPoint(nodes, point);
    if (!targetNode || targetNode.id === sourceId) return null;
    return { targetNode, targetHandle: findNearestInputPort(targetNode, point) };
}

/**
 * True when this exact source-port → target-port wire already exists.
 * @param {Edge[]} edges
 * @param {{ source: string, sourceHandle?: string|null, target: string, targetHandle?: string|null }} wire
 * @returns {boolean}
 */
export function connectionExists(edges, { source, sourceHandle, target, targetHandle }) {
    return edges.some((edge) =>
        edge.source === source &&
        edge.target === target &&
        edge.targetHandle === targetHandle &&
        edge.sourceHandle === sourceHandle
    );
}
