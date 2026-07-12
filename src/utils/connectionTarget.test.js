import { describe, test, expect } from 'vitest';
import { findNodeAtPoint, findNearestInputPort, resolveConnectionTarget, connectionExists } from './connectionTarget';
import { getPortLayout, resolvePortTop } from './portLayout';

// An IF node has three distinct input ports (condition / trueVal / falseVal) —
// the case where picking the *nearest* one actually matters (the #28 regression).
const ifNode = { id: 'if1', type: 'IF', position: { x: 100, y: 100 }, data: {} };
const src = { id: 'i1', type: 'INPUT', position: { x: 600, y: 600 }, data: { value: 1 } };
const nodes = [src, ifNode];

// Y of a given input port, derived from the same source of truth the app uses.
const portY = (node, portId) => {
    const p = getPortLayout(node).inputs.find((port) => port.id === portId);
    return node.position.y + resolvePortTop(node, p.top);
};

describe('findNodeAtPoint', () => {
    test('finds the node under the point', () => {
        expect(findNodeAtPoint(nodes, { x: 150, y: 120 })?.id).toBe('if1');
    });

    test('misses when the point is off any node', () => {
        expect(findNodeAtPoint(nodes, { x: 3000, y: 3000 })).toBeNull();
    });

    test('accepts a drop slightly outside the box, but not far outside', () => {
        expect(findNodeAtPoint(nodes, { x: 90, y: 120 })?.id).toBe('if1'); // 10px left: inside padding
        expect(findNodeAtPoint(nodes, { x: 70, y: 120 })).toBeNull();      // 30px left: outside
    });

    test('later nodes win (painter order)', () => {
        const a = { id: 'a', type: 'IF', position: { x: 0, y: 0 }, data: {} };
        const b = { id: 'b', type: 'IF', position: { x: 0, y: 0 }, data: {} };
        expect(findNodeAtPoint([a, b], { x: 10, y: 10 }).id).toBe('b');
    });
});

describe('findNearestInputPort', () => {
    test('a drop on each port selects that same port', () => {
        const ports = getPortLayout(ifNode).inputs;
        expect(ports.length).toBe(3); // guard: the test is meaningful

        for (const p of ports) {
            expect(findNearestInputPort(ifNode, { y: portY(ifNode, p.id) })).toBe(p.id);
        }
    });

    test('a drop between two ports snaps to the closer one', () => {
        const [first, second] = getPortLayout(ifNode).inputs;
        const mid = (portY(ifNode, first.id) + portY(ifNode, second.id)) / 2;
        expect(findNearestInputPort(ifNode, { y: mid - 1 })).toBe(first.id);
        expect(findNearestInputPort(ifNode, { y: mid + 1 })).toBe(second.id);
    });
});

describe('resolveConnectionTarget', () => {
    test('resolves node + nearest port for a valid drop', () => {
        const [, second] = getPortLayout(ifNode).inputs;
        const hit = resolveConnectionTarget(nodes, { x: 150, y: portY(ifNode, second.id) }, 'i1');
        expect(hit.targetNode.id).toBe('if1');
        expect(hit.targetHandle).toBe(second.id); // 'trueVal', not the first port
    });

    test('returns null when the drop misses every node', () => {
        expect(resolveConnectionTarget(nodes, { x: 3000, y: 3000 }, 'i1')).toBeNull();
    });

    test('refuses a self-connection', () => {
        expect(resolveConnectionTarget(nodes, { x: 150, y: 120 }, 'if1')).toBeNull();
    });
});

describe('connectionExists', () => {
    const edges = [{ id: 'e1', source: 'a', sourceHandle: null, target: 'b', targetHandle: 'condition' }];

    test('true for an identical wire', () => {
        expect(connectionExists(edges, { source: 'a', sourceHandle: null, target: 'b', targetHandle: 'condition' })).toBe(true);
    });

    test('false for the same nodes on a different port', () => {
        expect(connectionExists(edges, { source: 'a', sourceHandle: null, target: 'b', targetHandle: 'trueVal' })).toBe(false);
    });
});
