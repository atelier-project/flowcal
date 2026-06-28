import { describe, test, expect } from 'vitest';
import { computeAutoLayout } from './autoLayout';
import { getNodeHeight } from './layout';

const node = (id, type = 'SUM', extra = {}) => ({ id, type, position: { x: 0, y: 0 }, data: {}, ...extra });
const edge = (s, t) => ({ id: `${s}-${t}`, source: s, target: t });

const width = (n) => n.data?.width || 256;

// Axis-aligned bounding boxes must not overlap.
const overlaps = (nodes, pos) => {
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            if (!pos[a.id] || !pos[b.id]) continue;
            const ax = pos[a.id].x, ay = pos[a.id].y, aw = width(a), ah = getNodeHeight(a);
            const bx = pos[b.id].x, by = pos[b.id].y, bw = width(b), bh = getNodeHeight(b);
            const overlapX = ax < bx + bw && bx < ax + aw;
            const overlapY = ay < by + bh && by < ay + ah;
            if (overlapX && overlapY) return `${a.id} overlaps ${b.id}`;
        }
    }
    return null;
};

describe('computeAutoLayout', () => {
    test('a linear chain is laid out left → right by depth', () => {
        const nodes = [node('a', 'INPUT'), node('b'), node('c', 'FINAL')];
        const edges = [edge('a', 'b'), edge('b', 'c')];
        const pos = computeAutoLayout(nodes, edges);

        expect(pos.a.x).toBeLessThan(pos.b.x);
        expect(pos.b.x).toBeLessThan(pos.c.x);
    });

    test('every source sits in an earlier column than its target', () => {
        const nodes = [node('a', 'INPUT'), node('b', 'INPUT'), node('sum'), node('d', 'FINAL')];
        const edges = [edge('a', 'sum'), edge('b', 'sum'), edge('sum', 'd')];
        const pos = computeAutoLayout(nodes, edges);

        for (const e of edges) expect(pos[e.source].x).toBeLessThan(pos[e.target].x);
        // The two independent inputs share the first column.
        expect(pos.a.x).toBe(pos.b.x);
    });

    test('no two nodes overlap (diamond + extra inputs)', () => {
        const nodes = ['i1', 'i2', 'i3'].map(id => node(id, 'INPUT'))
            .concat([node('mul'), node('sum'), node('cmp', 'COMPARE'), node('fin', 'FINAL')]);
        const edges = [
            edge('i1', 'mul'), edge('i2', 'mul'), edge('i2', 'sum'), edge('i3', 'sum'),
            edge('mul', 'cmp'), edge('sum', 'cmp'), edge('cmp', 'fin'),
        ];
        const pos = computeAutoLayout(nodes, edges);
        expect(overlaps(nodes, pos)).toBeNull();
    });

    test('decorative nodes are left untouched (not repositioned)', () => {
        const nodes = [node('a', 'INPUT'), node('b', 'FINAL'), node('note', 'COMMENT'), node('frame', 'FRAME')];
        const edges = [edge('a', 'b')];
        const pos = computeAutoLayout(nodes, edges);

        expect(pos.a).toBeDefined();
        expect(pos.b).toBeDefined();
        expect(pos.note).toBeUndefined();
        expect(pos.frame).toBeUndefined();
    });

    test('cycles (e.g. via warps) do not hang and still produce positions', () => {
        const nodes = [node('x'), node('y'), node('z')];
        const edges = [edge('x', 'y'), edge('y', 'z'), edge('z', 'x')]; // back-edge
        const pos = computeAutoLayout(nodes, edges);
        expect(Object.keys(pos).sort()).toEqual(['x', 'y', 'z']);
    });

    test('WARP_IN is placed in an earlier column than its matching WARP_OUT', () => {
        const nodes = [
            node('src', 'INPUT'),
            node('wi', 'WARP_IN', { data: { tag: 'Q' } }),
            node('wo', 'WARP_OUT', { data: { tag: 'Q' } }),
            node('sink', 'FINAL'),
        ];
        const edges = [edge('src', 'wi'), edge('wo', 'sink')];
        const pos = computeAutoLayout(nodes, edges);
        expect(pos.wi.x).toBeLessThan(pos.wo.x);
    });
});
