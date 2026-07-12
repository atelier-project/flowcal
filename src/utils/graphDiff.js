/**
 * Graph diffing for version comparison (issue #39).
 *
 * Compares two flow graphs and reports what changed at the node/edge level.
 * Pure — no React, no services — so the version panel, tests and any future
 * consumer all agree on what "changed" means.
 *
 * Position-only moves are reported separately from real edits: nudging a node
 * around the canvas shouldn't read the same as changing what it computes.
 */

/**
 * @typedef {import('../types').Graph} Graph
 * @typedef {import('../types').Node} Node
 * @typedef {import('../types').Edge} Edge
 */

/**
 * @typedef {Object} GraphDiff
 * @property {{ added: Node[], removed: Node[], changed: Array<{id: string, before: Node, after: Node}>, moved: Array<{id: string, before: Node, after: Node}> }} nodes
 * @property {{ added: Edge[], removed: Edge[] }} edges
 */

/**
 * @param {Node[]} [items]
 * @returns {Map<string, Node>}
 */
const byId = (items) => new Map((items || []).map((item) => /** @type {[string, Node]} */([item.id, item])));

/**
 * Stable identity for an edge: the same wire between the same ports.
 * @param {Edge} e
 */
const edgeKey = (e) => `${e.source}:${e.sourceHandle ?? ''}→${e.target}:${e.targetHandle ?? ''}`;

/** @param {Node} a @param {Node} b */
const samePosition = (a, b) =>
    (a.position?.x ?? 0) === (b.position?.x ?? 0) &&
    (a.position?.y ?? 0) === (b.position?.y ?? 0);

/**
 * Did anything other than the node's canvas position change?
 * @param {Node} a @param {Node} b
 */
const sameSubstance = (a, b) =>
    a.type === b.type && JSON.stringify(a.data ?? {}) === JSON.stringify(b.data ?? {});

/**
 * Diff `target` against `base` (typically: a saved version against the current
 * graph). Returns nodes added/removed/changed/moved and edges added/removed.
 *
 * `changed` entries carry both sides so a UI can show before → after.
 *
 * @param {Graph|null|undefined} base
 * @param {Graph|null|undefined} target
 * @returns {GraphDiff}
 */
export function diffGraphs(base, target) {
    const baseNodes = byId(base?.nodes);
    const targetNodes = byId(target?.nodes);

    const added = [];
    const removed = [];
    const changed = [];
    const moved = [];

    for (const [id, node] of targetNodes) {
        const prev = baseNodes.get(id);
        if (!prev) { added.push(node); continue; }
        if (!sameSubstance(prev, node)) changed.push({ id, before: prev, after: node });
        else if (!samePosition(prev, node)) moved.push({ id, before: prev, after: node });
    }
    for (const [id, node] of baseNodes) {
        if (!targetNodes.has(id)) removed.push(node);
    }

    const baseEdges = new Map((base?.edges || []).map((e) => [edgeKey(e), e]));
    const targetEdges = new Map((target?.edges || []).map((e) => [edgeKey(e), e]));

    const edgesAdded = [];
    const edgesRemoved = [];
    for (const [key, edge] of targetEdges) {
        if (!baseEdges.has(key)) edgesAdded.push(edge);
    }
    for (const [key, edge] of baseEdges) {
        if (!targetEdges.has(key)) edgesRemoved.push(edge);
    }

    return {
        nodes: { added, removed, changed, moved },
        edges: { added: edgesAdded, removed: edgesRemoved },
    };
}

/**
 * True when the two graphs are identical in every way the diff reports —
 * including position-only moves.
 * @param {GraphDiff} diff
 * @returns {boolean}
 */
export function isEmptyDiff(diff) {
    const { nodes, edges } = diff;
    return nodes.added.length === 0 && nodes.removed.length === 0 &&
        nodes.changed.length === 0 && nodes.moved.length === 0 &&
        edges.added.length === 0 && edges.removed.length === 0;
}

/**
 * One-line human summary, e.g. "2 added, 1 changed, 3 wires added".
 * @param {GraphDiff} diff
 * @returns {string}
 */
export function summarizeDiff(diff) {
    const parts = [];
    const { nodes, edges } = diff;
    if (nodes.added.length) parts.push(`${nodes.added.length} added`);
    if (nodes.removed.length) parts.push(`${nodes.removed.length} removed`);
    if (nodes.changed.length) parts.push(`${nodes.changed.length} changed`);
    if (nodes.moved.length) parts.push(`${nodes.moved.length} moved`);
    if (edges.added.length) parts.push(`${edges.added.length} wire${edges.added.length === 1 ? '' : 's'} added`);
    if (edges.removed.length) parts.push(`${edges.removed.length} wire${edges.removed.length === 1 ? '' : 's'} removed`);
    return parts.length ? parts.join(', ') : 'No changes';
}
