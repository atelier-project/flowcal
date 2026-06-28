import { describe, test, expect } from 'vitest';
import { getHandlePosition } from './geometry';
import { getNodeHeight, collapsedGroupHandleTop } from './layout';

/**
 * These guard the collapsed-GROUP layout contract: the wire endpoints
 * (geometry.js) must agree with the shared row formula (layout.js) that
 * NodeHandles.jsx and the Node summary rows also use. If they drift, wires
 * detach from their handles.
 */

const groupNode = (id, outputIds, collapsed) => ({
    id,
    type: 'GROUP',
    position: { x: 100, y: 200 },
    data: {
        collapsed,
        subGraph: {
            nodes: [
                { id: 'gi', type: 'GROUP_INPUT', data: { label: 'in' } },
                ...outputIds.map((oid, i) => ({ id: oid, type: 'GROUP_OUTPUT', data: { label: `out${i}` } })),
            ],
            edges: [],
        },
    },
});

describe('collapsed GROUP handle layout', () => {
    test('each output gets a distinct row position matching the shared formula', () => {
        const node = groupNode('g1', ['o0', 'o1', 'o2'], true);
        const nodes = [node];

        const y0 = getHandlePosition('g1', nodes, 'output', 'o0')[1];
        const y1 = getHandlePosition('g1', nodes, 'output', 'o1')[1];
        const y2 = getHandlePosition('g1', nodes, 'output', 'o2')[1];

        // Distinct — no longer stacked on one point.
        expect(new Set([y0, y1, y2]).size).toBe(3);

        // And exactly the shared formula, offset by the node's y.
        expect(y0).toBe(200 + collapsedGroupHandleTop(0));
        expect(y1).toBe(200 + collapsedGroupHandleTop(1));
        expect(y2).toBe(200 + collapsedGroupHandleTop(2));
    });

    test('collapsed group grows to fit one row per port', () => {
        const collapsed = groupNode('g1', ['o0', 'o1', 'o2'], true);
        // 3 rows: header + 3*row + pad
        expect(getNodeHeight(collapsed)).toBeGreaterThan(40);
        expect(getNodeHeight(collapsed)).toBe(40 + 3 * 22 + 8);

        // A collapsed group with no boundary ports stays header-only.
        const empty = { id: 'g2', type: 'GROUP', position: { x: 0, y: 0 }, data: { collapsed: true, subGraph: { nodes: [], edges: [] } } };
        expect(getNodeHeight(empty)).toBe(40);
    });

    test('expanded group is unaffected by the collapsed layout', () => {
        const expanded = groupNode('g1', ['o0', 'o1'], false);
        // Non-collapsed groups still use the regular min-height path (>= 100).
        expect(getNodeHeight(expanded)).toBeGreaterThanOrEqual(100);
    });
});
