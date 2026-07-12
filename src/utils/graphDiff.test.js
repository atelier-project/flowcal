import { describe, test, expect } from 'vitest';
import { diffGraphs, isEmptyDiff, summarizeDiff } from './graphDiff';

const node = (id, over = {}) => ({
    id, type: 'INPUT', position: { x: 0, y: 0 }, data: { value: 1 }, ...over,
});
const edge = (source, target, over = {}) => ({
    id: `e-${source}-${target}`, source, target, sourceHandle: null, targetHandle: null, ...over,
});

const base = {
    nodes: [node('a'), node('b', { type: 'SUM', data: {} })],
    edges: [edge('a', 'b')],
};

describe('diffGraphs — nodes', () => {
    test('identical graphs produce an empty diff', () => {
        const diff = diffGraphs(base, structuredClone(base));
        expect(isEmptyDiff(diff)).toBe(true);
        expect(summarizeDiff(diff)).toBe('No changes');
    });

    test('detects an added node', () => {
        const target = { ...base, nodes: [...base.nodes, node('c')] };
        const diff = diffGraphs(base, target);
        expect(diff.nodes.added.map(n => n.id)).toEqual(['c']);
        expect(diff.nodes.removed).toHaveLength(0);
    });

    test('detects a removed node', () => {
        const target = { ...base, nodes: [node('a')] };
        const diff = diffGraphs(base, target);
        expect(diff.nodes.removed.map(n => n.id)).toEqual(['b']);
    });

    test('detects a changed node and carries before/after', () => {
        const target = { ...base, nodes: [node('a', { data: { value: 99 } }), base.nodes[1]] };
        const diff = diffGraphs(base, target);
        expect(diff.nodes.changed).toHaveLength(1);
        expect(diff.nodes.changed[0].id).toBe('a');
        expect(diff.nodes.changed[0].before.data.value).toBe(1);
        expect(diff.nodes.changed[0].after.data.value).toBe(99);
    });

    test('a retyped node counts as changed', () => {
        const target = { ...base, nodes: [node('a', { type: 'MUL' }), base.nodes[1]] };
        expect(diffGraphs(base, target).nodes.changed.map(c => c.id)).toEqual(['a']);
    });
});

describe('diffGraphs — moves are distinct from edits', () => {
    test('a position-only change is reported as moved, not changed', () => {
        const target = { ...base, nodes: [node('a', { position: { x: 500, y: 300 } }), base.nodes[1]] };
        const diff = diffGraphs(base, target);
        expect(diff.nodes.moved.map(m => m.id)).toEqual(['a']);
        expect(diff.nodes.changed).toHaveLength(0);
    });

    test('a node both moved and edited counts only as changed', () => {
        const target = {
            ...base,
            nodes: [node('a', { position: { x: 500, y: 300 }, data: { value: 7 } }), base.nodes[1]],
        };
        const diff = diffGraphs(base, target);
        expect(diff.nodes.changed.map(c => c.id)).toEqual(['a']);
        expect(diff.nodes.moved).toHaveLength(0);
    });
});

describe('diffGraphs — edges', () => {
    test('detects an added wire', () => {
        const target = { ...base, nodes: [...base.nodes, node('c')], edges: [...base.edges, edge('c', 'b')] };
        const diff = diffGraphs(base, target);
        expect(diff.edges.added).toHaveLength(1);
        expect(diff.edges.removed).toHaveLength(0);
    });

    test('detects a removed wire', () => {
        const diff = diffGraphs(base, { ...base, edges: [] });
        expect(diff.edges.removed).toHaveLength(1);
    });

    test('rewiring to a different port is a remove + an add', () => {
        const target = { ...base, edges: [edge('a', 'b', { targetHandle: 'in_1' })] };
        const diff = diffGraphs(base, target);
        expect(diff.edges.added).toHaveLength(1);
        expect(diff.edges.removed).toHaveLength(1);
    });

    test('edge identity ignores the edge id (same wire, regenerated id)', () => {
        const target = { ...base, edges: [edge('a', 'b', { id: 'totally-different-id' })] };
        expect(isEmptyDiff(diffGraphs(base, target))).toBe(true);
    });
});

describe('summarizeDiff', () => {
    test('summarizes a mixed diff', () => {
        const target = {
            nodes: [node('a', { data: { value: 5 } }), node('c')],
            edges: [edge('a', 'c')],
        };
        // 'b' removed, 'c' added, 'a' changed; wire a→b removed, a→c added.
        expect(summarizeDiff(diffGraphs(base, target)))
            .toBe('1 added, 1 removed, 1 changed, 1 wire added, 1 wire removed');
    });

    test('handles empty/missing graphs', () => {
        expect(summarizeDiff(diffGraphs(null, null))).toBe('No changes');
        expect(summarizeDiff(diffGraphs({}, { nodes: [node('a')] }))).toBe('1 added');
    });
});
