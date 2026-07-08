/**
 * @vitest-environment jsdom
 *
 * Integration tests for the editor — the layer where every recent regression
 * lived (versioning stale-closure #30, wire targeting #28, PACK alignment #31)
 * yet which had zero coverage. See issue #33.
 *
 * jsdom returns a zeroed getBoundingClientRect, so pointer-drag flows (creating
 * a wire by dragging between handles) can't be simulated here — that geometry is
 * covered as pure logic in utils/portLayout.test.js. These tests instead exercise
 * the deterministic, non-geometry flows through a fully-mounted <Editor/>:
 * the default graph render, undoable edits, command-palette insertion, and the
 * read-only shared/guest gate.
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';

// (lucide-react icons render fine as SVGs in jsdom — no need to mock them.)

// Auth: default to a signed-out user. `useAuth` is consumed by both Editor and
// Node, so one mock covers the whole tree. Tests can reassign `authValue`.
let authValue = { user: null, isAdmin: false };
vi.mock('../context/AuthContext', () => ({
    useAuth: () => authValue,
    AuthProvider: ({ children }) => children,
}));

// Never touch a real backend. The guest/shared view loads a flow via getFlow.
vi.mock('../services/flowService', () => ({
    flowService: {
        getFlow: vi.fn().mockResolvedValue({
            id: 'abc', name: 'Shared Flow', is_public: true,
            data: { nodes: [], edges: [] },
        }),
        createFlow: vi.fn().mockResolvedValue({ id: 'abc' }),
        updateFlow: vi.fn().mockResolvedValue({}),
        createVersion: vi.fn().mockResolvedValue({}),
        restoreVersion: vi.fn().mockResolvedValue({}),
        listVersions: vi.fn().mockResolvedValue([]),
    },
}));

import Editor from './Editor';
import { flowService } from '../services/flowService';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    authValue = { user: null, isAdmin: false };
});

// Render the editor as the owner of an already-saved cloud flow, whose graph
// (given by `nodes`) replaces the default sample on load.
function mockLoadedFlow(nodes, { ownerId = 'owner' } = {}) {
    flowService.getFlow.mockResolvedValueOnce({
        id: 'abc', name: 'My Flow', is_public: false, owner_id: ownerId,
        updated_at: '2026-01-01T00:00:00.000Z',
        data: { nodes, edges: [] },
    });
}

describe('Editor (integration)', () => {
    test('mounts and renders the default sample graph', () => {
        renderWithProviders(<Editor />);
        // Each node's title is an <input> whose value is its label.
        expect(screen.getByDisplayValue('Base Price')).toBeTruthy();
        expect(screen.getByDisplayValue('Tax Rate')).toBeTruthy();
        expect(screen.getByDisplayValue('Subtotal')).toBeTruthy();
        expect(screen.getByDisplayValue('Final Total')).toBeTruthy();
    });

    test('editing a node label is undoable and redoable', () => {
        renderWithProviders(<Editor />);
        const input = screen.getByDisplayValue('Subtotal');

        fireEvent.change(input, { target: { value: 'Grand Total' } });
        expect(screen.getByDisplayValue('Grand Total')).toBeTruthy();

        // Ctrl+Z reverts the edit (guards the useHistory wiring behind #30).
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
        expect(screen.getByDisplayValue('Subtotal')).toBeTruthy();
        expect(screen.queryByDisplayValue('Grand Total')).toBeNull();

        // Ctrl+Shift+Z re-applies it.
        fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true });
        expect(screen.getByDisplayValue('Grand Total')).toBeTruthy();
    });

    test('the command palette inserts a node at the cursor', () => {
        renderWithProviders(<Editor />);
        // No Subtract node in the default graph.
        expect(screen.queryByPlaceholderText('Subtract')).toBeNull();

        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        // Use the palette's specific placeholder — the sidebar has its own
        // "search nodes" field too.
        const search = screen.getByPlaceholderText(/search nodes to insert/i);
        fireEvent.change(search, { target: { value: 'subtract' } });
        // Enter selects the highlighted result (avoids the sidebar's own
        // "Subtract" entry, which would make a getByText click ambiguous).
        fireEvent.keyDown(search, { key: 'Enter' });

        // The palette closes and a new SUB node appears — its empty label input
        // shows the type's placeholder ("Subtract").
        expect(screen.queryByPlaceholderText(/search nodes to insert/i)).toBeNull();
        expect(screen.getByPlaceholderText('Subtract')).toBeTruthy();
    });

    test('a shared/guest view is read-only: the command palette will not open', async () => {
        // The shared flow replaces the default graph on load, so give it a
        // recognizable node to wait on.
        flowService.getFlow.mockResolvedValueOnce({
            id: 'abc', name: 'Shared Flow', is_public: true, owner_id: 'someone-else',
            updated_at: '2026-01-01T00:00:00.000Z',
            data: {
                nodes: [{ id: 'g1', type: 'INPUT', position: { x: 100, y: 100 }, data: { label: 'Guest Node', value: 5 } }],
                edges: [],
            },
        });
        renderWithProviders(<Editor />, { route: '/guest/abc', path: '/guest/:flowId' });
        await waitFor(() => expect(screen.getByDisplayValue('Guest Node')).toBeTruthy());

        // Structure editing is blocked, so Cmd+K must not surface the palette.
        fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
        expect(screen.queryByPlaceholderText(/search nodes to insert/i)).toBeNull();
    });
});

describe('Editor (cloud save)', () => {
    test('a manual save persists the current edited graph, not a stale snapshot (guards #30)', async () => {
        authValue = { user: { id: 'owner' }, isAdmin: false };
        mockLoadedFlow([
            { id: 'n1', type: 'INPUT', position: { x: 100, y: 100 }, data: { label: 'Loaded Node', value: 1 } },
        ]);
        renderWithProviders(<Editor />, { route: { pathname: '/editor', state: { flowId: 'abc' } } });

        // Wait for the cloud flow to replace the sample graph, then edit it.
        const input = await screen.findByDisplayValue('Loaded Node');
        fireEvent.change(input, { target: { value: 'Edited Node' } });

        // Cmd+S. The #30 regression was a stale closure that saved the initial
        // sample graph instead of the loaded/edited one.
        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        await waitFor(() => expect(flowService.updateFlow).toHaveBeenCalled());
        const payload = flowService.updateFlow.mock.calls.at(-1)[1];
        const savedLabels = payload.data.nodes.map((n) => n.data.label);
        expect(savedLabels).toContain('Edited Node');   // current edit persisted
        expect(savedLabels).not.toContain('Base Price'); // not the stale sample
    });

    test('autosave fires after an edit settles for the owner of a saved flow', async () => {
        localStorage.setItem('flowcal-autosave', '1');
        authValue = { user: { id: 'owner' }, isAdmin: false };
        mockLoadedFlow([
            { id: 'n1', type: 'INPUT', position: { x: 100, y: 100 }, data: { label: 'Auto Node', value: 1 } },
        ]);
        renderWithProviders(<Editor />, { route: { pathname: '/editor', state: { flowId: 'abc' } } });

        const input = await screen.findByDisplayValue('Auto Node');
        expect(flowService.updateFlow).not.toHaveBeenCalled(); // clean right after load

        fireEvent.change(input, { target: { value: 'Auto Node edited' } });

        // No manual save — the debounced autosave (2s) should persist on its own.
        await waitFor(() => expect(flowService.updateFlow).toHaveBeenCalled(), { timeout: 5000 });
    });
});
