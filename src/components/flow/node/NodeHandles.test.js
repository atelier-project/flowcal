/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNodeHandles } from './NodeHandles';

/**
 * useNodeHandles Hook Unit Tests
 * 
 * Tests the handle calculation logic for various node types.
 */

describe('useNodeHandles - Input Handle Calculation', () => {
    test('INPUT node has no input handles', () => {
        const { result } = renderHook(() => useNodeHandles('INPUT', { value: 42 }));
        expect(result.current.inputHandles).toHaveLength(0);
    });

    test('SUM node with inputs: ["*"] has single default input handle', () => {
        const { result } = renderHook(() => useNodeHandles('SUM', { inputCount: 3 }));
        // SUM uses inputs: ['*'] which means dynamic at runtime via edges, not via inputCount
        // The hook returns a single default handle for such nodes
        expect(result.current.inputHandles).toHaveLength(1);
        expect(result.current.inputHandles[0].id).toBe(null);
    });

    test('COLLECTOR node has dynamic input handles (default 2)', () => {
        const { result } = renderHook(() => useNodeHandles('COLLECTOR', {}));
        expect(result.current.inputHandles).toHaveLength(2);
    });

    test('COLLECTOR node respects inputCount', () => {
        const { result } = renderHook(() => useNodeHandles('COLLECTOR', { inputCount: 5 }));
        expect(result.current.inputHandles).toHaveLength(5);
    });

    test('GROUP node with subGraph has input handles from GROUP_INPUT nodes', () => {
        const subGraph = {
            nodes: [
                { id: 'gi1', type: 'GROUP_INPUT', data: { label: 'Price' } },
                { id: 'gi2', type: 'GROUP_INPUT', data: { label: 'Quantity' } },
                { id: 'go1', type: 'GROUP_OUTPUT', data: { label: 'Total' } }
            ]
        };
        const { result } = renderHook(() => useNodeHandles('GROUP', { subGraph }));

        expect(result.current.inputHandles).toHaveLength(2);
        expect(result.current.inputHandles[0].id).toBe('gi1');
        expect(result.current.inputHandles[0].label).toBe('Price');
        expect(result.current.inputHandles[1].id).toBe('gi2');
        expect(result.current.inputHandles[1].label).toBe('Quantity');
    });

    test('FORM node with showInputs has handles for each field', () => {
        const fields = [
            { key: 'name', value: 'John' },
            { key: 'age', value: 30 }
        ];
        const { result } = renderHook(() => useNodeHandles('FORM', { fields, showInputs: true }));

        expect(result.current.inputHandles).toHaveLength(2);
        expect(result.current.inputHandles[0].id).toBe('field_0');
        expect(result.current.inputHandles[1].id).toBe('field_1');
    });

    test('FORM node without showInputs has no input handles', () => {
        const fields = [{ key: 'name', value: 'John' }];
        const { result } = renderHook(() => useNodeHandles('FORM', { fields, showInputs: false }));

        expect(result.current.inputHandles).toHaveLength(0);
    });

    test('PACK node has handles for each key', () => {
        const { result } = renderHook(() => useNodeHandles('PACK', { keys: ['a', 'b', 'c'] }));

        expect(result.current.inputHandles).toHaveLength(3);
        expect(result.current.inputHandles[0].id).toBe('a');
        expect(result.current.inputHandles[1].id).toBe('b');
        expect(result.current.inputHandles[2].id).toBe('c');
    });

    test('UNPACK node has single object input handle', () => {
        const { result } = renderHook(() => useNodeHandles('UNPACK', { keys: ['x', 'y'] }));

        expect(result.current.inputHandles).toHaveLength(1);
        expect(result.current.inputHandles[0].id).toBe('object');
    });

    test('Collapsed node has handles at top position', () => {
        const { result } = renderHook(() => useNodeHandles('COLLECTOR', { inputCount: 2, collapsed: true }));

        expect(result.current.inputHandles).toHaveLength(2);
        expect(result.current.inputHandles[0].top).toBe(20);
        expect(result.current.inputHandles[1].top).toBe(20);
    });
});

describe('useNodeHandles - Output Handle Calculation', () => {
    test('INPUT node has one output handle', () => {
        const { result } = renderHook(() => useNodeHandles('INPUT', { value: 42 }));
        expect(result.current.outputHandles).toHaveLength(1);
    });

    test('FINAL node has one input handle (it is a sink)', () => {
        const { result } = renderHook(() => useNodeHandles('FINAL', {}));
        // FINAL is a sink node - it has an input but no meaningful output
        expect(result.current.inputHandles).toHaveLength(1);
    });

    test('GROUP_OUTPUT node has no output handles', () => {
        const { result } = renderHook(() => useNodeHandles('GROUP_OUTPUT', {}));
        expect(result.current.outputHandles).toHaveLength(0);
    });

    test('GROUP node with subGraph has output handles from GROUP_OUTPUT nodes', () => {
        const subGraph = {
            nodes: [
                { id: 'gi1', type: 'GROUP_INPUT', data: { label: 'Input' } },
                { id: 'go1', type: 'GROUP_OUTPUT', data: { label: 'Result' } },
                { id: 'go2', type: 'GROUP_OUTPUT_LIST', data: { label: 'Items' } }
            ]
        };
        const { result } = renderHook(() => useNodeHandles('GROUP', { subGraph }));

        expect(result.current.outputHandles).toHaveLength(2);
        expect(result.current.outputHandles[0].id).toBe('go1');
        expect(result.current.outputHandles[0].label).toBe('Result');
        expect(result.current.outputHandles[1].id).toBe('go2');
        expect(result.current.outputHandles[1].label).toBe('Items');
    });

    test('UNPACK node has output handles for each key', () => {
        const { result } = renderHook(() => useNodeHandles('UNPACK', { keys: ['x', 'y', 'z'] }));

        expect(result.current.outputHandles).toHaveLength(3);
        expect(result.current.outputHandles[0].id).toBe('x');
        expect(result.current.outputHandles[1].id).toBe('y');
        expect(result.current.outputHandles[2].id).toBe('z');
    });

    test('TEMPLATE node has text output handle', () => {
        const { result } = renderHook(() => useNodeHandles('TEMPLATE', {}));

        expect(result.current.outputHandles).toHaveLength(1);
        expect(result.current.outputHandles[0].id).toBe('text');
    });
});

describe('useNodeHandles - Custom Ordering', () => {
    test('Input handles respect custom inputOrder', () => {
        const subGraph = {
            nodes: [
                { id: 'a', type: 'GROUP_INPUT', data: { label: 'A' } },
                { id: 'b', type: 'GROUP_INPUT', data: { label: 'B' } },
                { id: 'c', type: 'GROUP_INPUT', data: { label: 'C' } }
            ]
        };
        const { result } = renderHook(() => useNodeHandles('GROUP', {
            subGraph,
            inputOrder: ['c', 'a', 'b']
        }));

        expect(result.current.inputHandles[0].id).toBe('c');
        expect(result.current.inputHandles[1].id).toBe('a');
        expect(result.current.inputHandles[2].id).toBe('b');
    });

    test('Output handles respect custom outputOrder', () => {
        const subGraph = {
            nodes: [
                { id: 'o1', type: 'GROUP_OUTPUT', data: { label: 'First' } },
                { id: 'o2', type: 'GROUP_OUTPUT', data: { label: 'Second' } }
            ]
        };
        const { result } = renderHook(() => useNodeHandles('GROUP', {
            subGraph,
            outputOrder: ['o2', 'o1']
        }));

        expect(result.current.outputHandles[0].id).toBe('o2');
        expect(result.current.outputHandles[1].id).toBe('o1');
    });
});
