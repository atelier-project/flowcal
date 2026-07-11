/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useClipboard } from './useClipboard';
import * as store from '../utils/clipboardStore';

vi.mock('../utils/clipboardStore', () => ({
    copyToClipboard: vi.fn(),
    prepareForPaste: vi.fn(() => ({ nodes: [{ id: 'p1', type: 'INPUT', position: { x: 0, y: 0 }, data: {} }], edges: [] })),
    hasClipboardContent: vi.fn(() => true),
    canCopyFromContext: vi.fn(() => true),
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const NODES = [
    { id: 'a', type: 'INPUT', position: { x: 0, y: 0 }, data: {} },
    { id: 'b', type: 'SUM', position: { x: 100, y: 0 }, data: {} },
];
const EDGES = [{ id: 'e1', source: 'a', target: 'b' }];

function setup(overrides = {}) {
    const props = {
        nodes: NODES,
        edges: EDGES,
        selectedIds: new Set(['a']),
        setSelectedIds: vi.fn(),
        path: [],
        isContextReadOnly: false,
        isAdmin: false,
        isSharedView: false,
        setGraph: vi.fn(),
        ...overrides,
    };
    const hook = renderHook(() => useClipboard(props));
    return { props, hook };
}

describe('useClipboard', () => {
    test('copy stores the selected nodes with the current level', () => {
        const { hook } = setup();
        act(() => hook.result.current.handleCopy());
        expect(store.copyToClipboard).toHaveBeenCalledWith([NODES[0]], EDGES, 'root');
    });

    test('copy is a no-op with nothing selected', () => {
        const { hook } = setup({ selectedIds: new Set() });
        act(() => hook.result.current.handleCopy());
        expect(store.copyToClipboard).not.toHaveBeenCalled();
    });

    test('paste appends the pasted nodes and selects them', () => {
        const { props, hook } = setup();
        act(() => hook.result.current.handlePaste());
        expect(props.setGraph).toHaveBeenCalledWith({
            nodes: [...NODES, { id: 'p1', type: 'INPUT', position: { x: 0, y: 0 }, data: {} }],
            edges: EDGES,
        });
        expect(props.setSelectedIds).toHaveBeenCalledWith(new Set(['p1']));
    });

    test('paste is blocked in a shared view', () => {
        const { props, hook } = setup({ isSharedView: true });
        act(() => hook.result.current.handlePaste());
        expect(props.setGraph).not.toHaveBeenCalled();
    });

    test('cut copies then removes the selection and its edges', () => {
        const { props, hook } = setup();
        act(() => hook.result.current.handleCut());
        expect(store.copyToClipboard).toHaveBeenCalled();
        expect(props.setGraph).toHaveBeenCalledWith({ nodes: [NODES[1]], edges: [] });
        expect(props.setSelectedIds).toHaveBeenCalledWith(new Set());
    });

    test('Ctrl+C triggers copy; typing in an input does not', () => {
        setup();
        fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
        expect(store.copyToClipboard).toHaveBeenCalledTimes(1);

        const input = document.createElement('input');
        document.body.appendChild(input);
        fireEvent.keyDown(input, { key: 'c', ctrlKey: true });
        expect(store.copyToClipboard).toHaveBeenCalledTimes(1);
        input.remove();
    });
});
