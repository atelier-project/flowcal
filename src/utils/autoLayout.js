/**
 * Auto-layout: a compact Sugiyama-style layered arrangement.
 *
 * 1. Assign each node a layer (x) by longest dependency path from the sources,
 *    so wires generally flow left → right.
 * 2. Order nodes within each layer (y) with a few barycenter sweeps to reduce
 *    wire crossings.
 * 3. Place nodes using their real widths/heights so nothing overlaps.
 *
 * Pure: returns `{ [nodeId]: {x, y} }` for the nodes it repositions. Decorative
 * nodes (comments/frames/labels) are left untouched and omitted from the result.
 */
import { getNodeHeight } from './layout';

const NODE_WIDTH_DEFAULT = 256;
const LAYER_GAP = 90;   // horizontal space between layers
const NODE_GAP = 36;    // vertical space between nodes in a layer
const ORIGIN_X = 80;
const ORIGIN_Y = 80;
const SWEEPS = 4;

// Nodes that don't participate in the flow graph — leave them where the user put them.
const SKIP_TYPES = new Set(['COMMENT', 'FRAME', 'TEXT_LABEL']);

const nodeWidth = (n) => n.data?.width || NODE_WIDTH_DEFAULT;

export const computeAutoLayout = (nodes, edges) => {
    const layoutNodes = nodes.filter(n => !SKIP_TYPES.has(n.type));
    if (layoutNodes.length === 0) return {};

    const byId = new Map(layoutNodes.map(n => [n.id, n]));
    const succ = new Map(layoutNodes.map(n => [n.id, new Set()]));
    const pred = new Map(layoutNodes.map(n => [n.id, new Set()]));

    const addEdge = (s, t) => {
        if (s === t || !byId.has(s) || !byId.has(t)) return;
        if (!succ.get(s).has(t)) { succ.get(s).add(t); pred.get(t).add(s); }
    };

    edges.forEach(e => addEdge(e.source, e.target));

    // Warp nodes connect wirelessly by tag — add virtual edges so a WARP_IN sits
    // upstream of the matching WARP_OUT and the layering reflects real data flow.
    const warpIns = layoutNodes.filter(n => n.type === 'WARP_IN');
    const warpOuts = layoutNodes.filter(n => n.type === 'WARP_OUT');
    warpIns.forEach(wi => warpOuts.forEach(wo => {
        if ((wi.data?.tag ?? '') === (wo.data?.tag ?? '')) addEdge(wi.id, wo.id);
    }));

    // Layer = longest path from any source. DFS with an on-stack guard so cycles
    // (which can occur via warps) don't recurse forever; back-edges contribute 0.
    const layer = new Map();
    const onStack = new Set();
    const computeLayer = (id) => {
        if (layer.has(id)) return layer.get(id);
        if (onStack.has(id)) return 0;
        onStack.add(id);
        let L = 0;
        pred.get(id).forEach(p => { L = Math.max(L, computeLayer(p) + 1); });
        onStack.delete(id);
        layer.set(id, L);
        return L;
    };
    layoutNodes.forEach(n => computeLayer(n.id));

    // Bucket into layers, seeded in the nodes' current vertical order for stability.
    const maxLayer = Math.max(...layer.values());
    const layers = Array.from({ length: maxLayer + 1 }, () => []);
    layoutNodes
        .slice()
        .sort((a, b) => (a.position?.y ?? 0) - (b.position?.y ?? 0))
        .forEach(n => layers[layer.get(n.id)].push(n.id));

    // Crossing reduction: alternate downward/upward barycenter sweeps. Each node
    // moves toward the average index of its neighbours in the adjacent layer.
    const indexIn = (arr) => { const m = new Map(); arr.forEach((id, i) => m.set(id, i)); return m; };
    const barycenter = (id, neighbourSet, neighbourIndex) => {
        const ns = [...neighbourSet.get(id)].map(n => neighbourIndex.get(n)).filter(v => v !== undefined);
        if (ns.length === 0) return null;
        return ns.reduce((a, b) => a + b, 0) / ns.length;
    };

    for (let s = 0; s < SWEEPS; s++) {
        const downward = s % 2 === 0;
        if (downward) {
            for (let l = 1; l <= maxLayer; l++) {
                const above = indexIn(layers[l - 1]);
                reorder(layers[l], (id) => barycenter(id, pred, above));
            }
        } else {
            for (let l = maxLayer - 1; l >= 0; l--) {
                const below = indexIn(layers[l + 1]);
                reorder(layers[l], (id) => barycenter(id, succ, below));
            }
        }
    }

    // Column x positions from each layer's widest node.
    const layerWidth = layers.map(L => L.reduce((w, id) => Math.max(w, nodeWidth(byId.get(id))), 0));
    const layerX = [];
    let x = ORIGIN_X;
    for (let l = 0; l <= maxLayer; l++) { layerX[l] = x; x += layerWidth[l] + LAYER_GAP; }

    // Heights per layer, then vertically centre shorter layers against the tallest.
    const layerHeights = layers.map(L => {
        let h = 0;
        L.forEach(id => { h += getNodeHeight(byId.get(id)) + NODE_GAP; });
        return Math.max(0, h - NODE_GAP);
    });
    const maxColumnHeight = Math.max(0, ...layerHeights);

    const positions = {};
    layers.forEach((L, l) => {
        let y = ORIGIN_Y + (maxColumnHeight - layerHeights[l]) / 2;
        L.forEach(id => {
            positions[id] = { x: layerX[l], y: Math.round(y) };
            y += getNodeHeight(byId.get(id)) + NODE_GAP;
        });
    });

    return positions;
};

// Stable reorder of a layer by a key function; nodes with no neighbours (null key)
// keep their relative position by reusing their current index as the key.
function reorder(arr, keyFn) {
    const current = new Map();
    arr.forEach((id, i) => current.set(id, i));
    arr.sort((a, b) => {
        const ka = keyFn(a); const kb = keyFn(b);
        const va = ka === null ? current.get(a) : ka;
        const vb = kb === null ? current.get(b) : kb;
        if (va === vb) return current.get(a) - current.get(b);
        return va - vb;
    });
}
