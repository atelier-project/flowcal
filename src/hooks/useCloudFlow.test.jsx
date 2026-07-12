/**
 * @vitest-environment jsdom
 *
 * The safety property behind version preview (#39): while previewing an old
 * version, the canvas shows that version's graph — so if anything persisted it,
 * we would silently overwrite the live flow with the old one. Nothing may save.
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { useCloudFlow } from './useCloudFlow';
import { flowService } from '../services/flowService';

vi.mock('../services/flowService', () => ({
    flowService: {
        getFlow: vi.fn().mockResolvedValue({
            id: 'f1', name: 'Flow', owner_id: 'owner', is_public: false,
            updated_at: '2026-01-01T00:00:00.000Z',
            data: { nodes: [], edges: [] },
        }),
        createFlow: vi.fn(),
        updateFlow: vi.fn().mockResolvedValue({ updated_at: '2026-01-02T00:00:00.000Z' }),
        createVersion: vi.fn(),
        restoreVersion: vi.fn(),
    },
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
});

const OLD_GRAPH = { nodes: [{ id: 'old', type: 'INPUT', position: { x: 0, y: 0 }, data: {} }], edges: [] };

function setup({ isPreviewing }) {
    const props = {
        flowId: 'f1',
        isSharedView: false,
        isPreviewing,
        user: { id: 'owner' },
        isAdmin: false,
        navigate: vi.fn(),
        confirm: vi.fn(),
        addToast: vi.fn(),
        path: [],
        // The canvas is showing the *old version's* graph, as it would be mid-preview.
        nodes: OLD_GRAPH.nodes,
        edges: OLD_GRAPH.edges,
        pan: { x: 0, y: 0 },
        scale: 1,
        debouncedNodes: OLD_GRAPH.nodes,
        debouncedEdges: OLD_GRAPH.edges,
        projectTitle: 'Flow',
        flowSettings: {},
        flowOwnerId: 'owner',
        setGraph: vi.fn(),
        setProjectTitle: vi.fn(),
        setFlowSettings: vi.fn(),
        setFlowOwnerId: vi.fn(),
        setFlowIsPublic: vi.fn(),
    };
    return renderHook(() => useCloudFlow(props));
}

describe('useCloudFlow — version preview safety (#39)', () => {
    test('a manual save is refused while previewing', async () => {
        const hook = setup({ isPreviewing: true });
        await waitFor(() => expect(flowService.getFlow).toHaveBeenCalled());

        await act(async () => { await hook.result.current.handleCloudSave(); });

        expect(flowService.updateFlow).not.toHaveBeenCalled();
    });

    test('autosave is disarmed while previewing', async () => {
        const hook = setup({ isPreviewing: true });
        await waitFor(() => expect(flowService.getFlow).toHaveBeenCalled());

        expect(hook.result.current.canAutosave).toBe(false);
        // The previewed graph differs from what was loaded, but preview must not
        // register as unsaved work (which would also arm the beforeunload warning).
        expect(hook.result.current.isDirty).toBe(false);
    });

    test('for the same state when NOT previewing, a save does go through', async () => {
        const hook = setup({ isPreviewing: false });
        await waitFor(() => expect(flowService.getFlow).toHaveBeenCalled());

        await act(async () => { await hook.result.current.handleCloudSave(); });

        // Guards the test itself: the refusal above is due to preview, not setup.
        expect(flowService.updateFlow).toHaveBeenCalled();
        expect(hook.result.current.canAutosave).toBe(true);
    });
});
