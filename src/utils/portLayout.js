import { getDefinition } from '../engine/nodeDefinitions';
import { getNodeHeight, collapsedGroupHandleTop } from './layout';
import { HANDLE_POSITIONS, NODE_WIDTH } from './handlePositions';

/**
 * Single source of truth for node port (handle) geometry.
 *
 * A node's input/output handle Y positions used to be computed in THREE places
 * that had to agree by hand — the rendered dots (NodeHandles.jsx), the wire
 * endpoints (geometry.js), and the connection drop hit-test (Editor.jsx). When
 * they drifted, wires mis-targeted ports (this caused the REPORT #28 and PACK
 * #31 bugs). Now all three derive from `getPortLayout` here.
 *
 * A port's `top` is either:
 *   - a number: pixels from the node's top edge, or
 *   - the string '50%': vertically centered on the node's *rendered* height.
 * Use `resolvePortTop(node, top)` to turn '50%' into a concrete offset when you
 * need arithmetic (wire endpoints, hit-testing).
 */

const CENTER = '50%';

// Sort handle objects by a custom id order (inputOrder / outputOrder). Unknown
// ids keep their relative order and sink to the end. Mirrors the old inline
// sorts in NodeHandles and geometry so ordering stays consistent everywhere.
const applyOrder = (handles, order) => {
    if (!order || !Array.isArray(order) || handles.length === 0) return handles;
    return [...handles].sort((a, b) => {
        const idxA = order.indexOf(a.id);
        const idxB = order.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });
};

/**
 * Input ports for a node: [{ id, label, description?, top }].
 * Pure function — no React. This is the exact logic the canvas renders.
 */
export function getInputPorts(type, data = {}) {
    const def = getDefinition(type);
    let handles = [];

    if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
        handles = data.subGraph.nodes
            .filter(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST')
            .map((n, idx) => ({
                id: n.id,
                label: n.data.label || `Input ${idx + 1}`,
                description: n.data.description || ''
            }));
    } else if (type === 'FORM') {
        const fields = data.fields || [];
        if (data.showInputs) {
            const fp = HANDLE_POSITIONS.FORM;
            handles = fields.map((field, i) => ({
                id: `field_${i}`,
                label: '',
                top: fp.base + (i * fp.rowHeight)
            }));
        } else {
            handles = [];
        }
    } else if (type === 'FUNCTION') {
        const params = data.params || [];
        const fp = HANDLE_POSITIONS.FUNCTION;
        handles = params.map((param, i) => ({
            id: `param_${i}`,
            label: param.name || `p${i}`,
            top: fp.base + (i * fp.rowHeight)
        }));
    } else if (type === 'PACK') {
        const keys = data.keys || [];
        if (data.collapsed) {
            // Collapsed: the body is hidden, so the port label identifies each dot.
            handles = keys.map((key) => ({ id: key, label: key, top: HANDLE_POSITIONS.COLLAPSED }));
        } else {
            // Expanded: the body already shows each key, so the dot stays unlabeled
            // and lines up with its key row.
            const pp = HANDLE_POSITIONS.PACK;
            handles = keys.map((key, idx) => ({
                id: key,
                label: '',
                top: pp.base + (idx * pp.rowHeight)
            }));
        }
    } else if (type === 'REPORT') {
        // Align each input handle with its row (below the title). No numeric
        // label — each row already shows its own (auto-)label.
        const count = data.inputCount || 2;
        const rp = HANDLE_POSITIONS.REPORT;
        handles = Array.from({ length: count }).map((_, i) => ({
            id: `in_${i}`,
            label: '',
            top: rp.base + i * rp.rowHeight
        }));
    } else if (type === 'COLLECTOR' || (def && def.dynamicInputs)) {
        const count = data.inputCount || 2;
        const dp = HANDLE_POSITIONS.COLLECTOR;
        handles = Array.from({ length: count }).map((_, i) => ({
            id: `in_${i}`,
            label: `${i}`,
            top: dp.base + (i * dp.rowHeight)
        }));
    } else if (type === 'UNPACK') {
        handles = [{ id: 'object', label: 'Object', top: data.collapsed ? HANDLE_POSITIONS.COLLAPSED : 110 }];
    } else if (type === 'CUSTOM') {
        handles = [{ id: null, top: data.collapsed ? HANDLE_POSITIONS.COLLAPSED : 100 }];
    } else if (type === 'GROUP_OUTPUT' || type === 'GROUP_OUTPUT_LIST') {
        handles = [{ id: null, top: CENTER }];
    } else if (def && def.inputs && !def.inputs.includes('*')) {
        const dp = HANDLE_POSITIONS.DEFAULT;
        handles = def.inputs.map((name) => ({
            id: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
        }));
        handles = applyOrder(handles, data.inputOrder);
        handles = handles.map((h, i) => ({ ...h, top: dp.base + (i * dp.rowHeight) }));
        // Ordering + tops already applied; return before the generic pass below.
        return finalizeInputs(type, data, handles);
    } else if (type === 'TEMPLATE') {
        handles = [{ id: null, top: data.collapsed ? HANDLE_POSITIONS.COLLAPSED : 60 }];
    } else if (type !== 'INPUT' && type !== 'GROUP_INPUT') {
        handles = [{ id: null, top: CENTER }];
    }

    handles = applyOrder(handles, data.inputOrder);
    return finalizeInputs(type, data, handles);
}

// Assign the generic stacked spacing to any input handle that hasn't already
// been given a `top`, and apply the collapsed-state override. Kept separate so
// the named-input branch (which sets its own tops) can reuse ordering.
function finalizeInputs(type, data, handles) {
    if (data.collapsed) {
        if (type === 'GROUP') {
            return handles.map((h, i) => ({ ...h, top: collapsedGroupHandleTop(i) }));
        }
        return handles.map((h) => ({ ...h, top: HANDLE_POSITIONS.COLLAPSED }));
    }
    const dp = HANDLE_POSITIONS.DEFAULT;
    return handles.map((h, i) => (h.top !== undefined ? h : { ...h, top: dp.base + (i * dp.rowHeight) }));
}

/**
 * Output ports for a node: [{ id, label, description?, top }].
 */
export function getOutputPorts(type, data = {}) {
    const def = getDefinition(type);
    const height = getNodeHeight({ type, data });
    let handles = [];

    if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
        handles = data.subGraph.nodes
            .filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST')
            .map((n, idx) => ({
                id: n.id,
                label: n.data.label || `Output ${idx + 1}`,
                description: n.data.description || ''
            }));
    } else if (type === 'TEMPLATE') {
        handles = [{ id: 'text', label: 'Text', top: data.collapsed ? HANDLE_POSITIONS.COLLAPSED : 60 }];
    } else if (type === 'UNPACK') {
        const keys = data.keys || [];
        const up = HANDLE_POSITIONS.UNPACK;
        if (data.collapsed) {
            handles = keys.map((key) => ({ id: key, label: key, top: HANDLE_POSITIONS.COLLAPSED }));
        } else {
            handles = keys.map((key, idx) => ({
                id: key,
                label: key,
                top: up.base + (idx * up.rowHeight)
            }));
        }
    } else if (def && def.outputs) {
        handles = def.outputs.map((name) => ({
            id: name,
            label: name.charAt(0).toUpperCase() + name.slice(1),
        }));
    } else if (!['GROUP_OUTPUT', 'GROUP_OUTPUT_LIST', 'FINAL', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE'].includes(type) && def.category !== 'Visuals') {
        if (type === 'FORM' || type === 'GROUP_INPUT') {
            handles = [{ id: null, top: height / 2 }];
        } else if (type === 'CUSTOM') {
            handles = [{ id: null, top: data.collapsed ? HANDLE_POSITIONS.COLLAPSED : 100 }];
        } else {
            handles = [{ id: null, top: CENTER }];
        }
    }

    handles = applyOrder(handles, data.outputOrder);

    if (data.collapsed && type !== 'UNPACK') {
        if (type === 'GROUP') {
            return handles.map((h, i) => ({ ...h, top: collapsedGroupHandleTop(i) }));
        }
        return handles.map((h) => ({ ...h, top: HANDLE_POSITIONS.COLLAPSED }));
    }

    const dp = HANDLE_POSITIONS.DEFAULT;
    return handles.map((h, i) => (h.top !== undefined ? h : { ...h, top: dp.base + (i * dp.rowHeight) }));
}

/**
 * Full layout for a node: { inputs, outputs }. Each port carries its node-local
 * `top`; `x` is 0 for inputs and the node's width for outputs.
 */
export function getPortLayout(node) {
    const { type, data = {} } = node;
    const width = data.width || NODE_WIDTH;
    const decorate = (ports, side, x) => ports.map(p => ({ ...p, side, x }));
    return {
        inputs: decorate(getInputPorts(type, data), 'input', 0),
        outputs: decorate(getOutputPorts(type, data), 'output', width),
    };
}

/**
 * Resolve a port `top` (number or '50%') to a concrete pixel offset from the
 * node's top edge, using the node's estimated rendered height for centering.
 */
export function resolvePortTop(node, top) {
    if (typeof top === 'number') return top;
    // '50%' (or any non-number) → vertical center.
    return getNodeHeight(node) / 2;
}
