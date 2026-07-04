import { describe, test, expect } from 'vitest';
import { getPortLayout, getInputPorts, getOutputPorts, resolvePortTop } from './portLayout';
import { getHandlePosition } from './geometry';
import { collapsedGroupHandleTop } from './layout';
import { HANDLE_POSITIONS } from './handlePositions';

/**
 * #32 — handle geometry single source of truth.
 *
 * The whole point is that the rendered dots (getPortLayout / NodeHandles), the
 * wire endpoints (getHandlePosition) and the drop hit-test all derive from the
 * SAME layout, so they can't drift. The invariant test below proves the first
 * two agree by construction for every port; the hit-test uses the identical
 * `resolvePortTop` path, so it follows.
 */

const node = (over) => ({ id: 'n1', position: { x: 100, y: 200 }, data: {}, ...over });

const cases = [
    node({ type: 'IF' }),                                              // 3 named inputs, 1 output
    node({ type: 'ADD' }),                                             // '*' → single centered input
    node({ type: 'REPORT', data: { inputCount: 3 } }),
    node({ type: 'PACK', data: { keys: ['a', 'b', 'c'] } }),
    node({ type: 'PACK', data: { keys: ['a', 'b'], collapsed: true } }),
    node({ type: 'FORM', data: { showInputs: true, fields: [{ key: 'x' }, { key: 'y' }] } }),
    node({ type: 'FUNCTION', data: { params: [{ name: 'a' }, { name: 'b' }] } }),
    node({ type: 'COLLECTOR', data: { inputCount: 4 } }),
    node({ type: 'COLLECTOR', data: { inputCount: 2, collapsed: true } }),
    node({ type: 'UNPACK', data: { keys: ['p', 'q', 'r'] } }),
    node({ type: 'GAUGE' }),                                           // named val/min/max
    node({ type: 'GROUP', data: { subGraph: { nodes: [
        { id: 'gi1', type: 'GROUP_INPUT', data: { label: 'A' } },
        { id: 'gi2', type: 'GROUP_INPUT', data: { label: 'B' } },
        { id: 'go1', type: 'GROUP_OUTPUT', data: { label: 'R' } },
    ] } } }),
    node({ type: 'GROUP', data: { collapsed: true, subGraph: { nodes: [
        { id: 'gi1', type: 'GROUP_INPUT', data: {} },
        { id: 'go1', type: 'GROUP_OUTPUT', data: {} },
        { id: 'go2', type: 'GROUP_OUTPUT', data: {} },
    ] } } }),
];

describe('getHandlePosition matches getPortLayout for every port (dots == wires)', () => {
    cases.forEach((n) => {
        test(`${n.type}${n.data.collapsed ? ' (collapsed)' : ''}`, () => {
            const layout = getPortLayout(n);
            const nodes = [n];

            layout.inputs.forEach((p) => {
                const [x, y] = getHandlePosition(n.id, nodes, 'input', p.id);
                expect(x).toBe(n.position.x + p.x);
                expect(y).toBe(n.position.y + resolvePortTop(n, p.top));
            });

            layout.outputs.forEach((p) => {
                const [x, y] = getHandlePosition(n.id, nodes, 'output', p.id);
                expect(x).toBe(n.position.x + p.x);
                expect(y).toBe(n.position.y + resolvePortTop(n, p.top));
            });
        });
    });
});

describe('port layout regression values (#28 REPORT, #31 PACK, and collapsed)', () => {
    test('REPORT input rows use base + i*rowHeight', () => {
        const rp = HANDLE_POSITIONS.REPORT;
        const ports = getInputPorts('REPORT', { inputCount: 3 });
        expect(ports.map(p => p.top)).toEqual([rp.base, rp.base + rp.rowHeight, rp.base + 2 * rp.rowHeight]);
        expect(ports.map(p => p.id)).toEqual(['in_0', 'in_1', 'in_2']);
    });

    test('expanded PACK keys line up with their rows', () => {
        const pp = HANDLE_POSITIONS.PACK;
        const ports = getInputPorts('PACK', { keys: ['a', 'b', 'c'] });
        expect(ports.map(p => p.top)).toEqual([pp.base, pp.base + pp.rowHeight, pp.base + 2 * pp.rowHeight]);
    });

    test('collapsed nodes stack their ports at the header offset', () => {
        const ports = getInputPorts('COLLECTOR', { inputCount: 2, collapsed: true });
        expect(ports.every(p => p.top === HANDLE_POSITIONS.COLLAPSED)).toBe(true);
    });

    test('collapsed GROUP spreads ports by the shared row formula', () => {
        const outs = getOutputPorts('GROUP', {
            collapsed: true,
            subGraph: { nodes: [
                { id: 'o0', type: 'GROUP_OUTPUT', data: {} },
                { id: 'o1', type: 'GROUP_OUTPUT', data: {} },
            ] },
        });
        expect(outs.map(p => p.top)).toEqual([collapsedGroupHandleTop(0), collapsedGroupHandleTop(1)]);
    });

    test('COLLECTOR handle ids have no stray whitespace (fixes drop-target bug)', () => {
        const ports = getInputPorts('COLLECTOR', { inputCount: 3 });
        expect(ports.map(p => p.id)).toEqual(['in_0', 'in_1', 'in_2']);
    });

    test('FORM first-field position is stable regardless of field count', () => {
        const one = getInputPorts('FORM', { showInputs: true, fields: [{ key: 'x' }] });
        const many = getInputPorts('FORM', { showInputs: true, fields: [{ key: 'x' }, { key: 'y' }] });
        // The first field sits at the same spot whether or not more follow — the
        // old render drifted it (48 with one field, 40 with two).
        expect(one[0].top).toBe(many[0].top);
        expect(one[0].top).toBe(HANDLE_POSITIONS.FORM.base);
    });
});
