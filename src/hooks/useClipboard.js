import { useCallback, useEffect } from 'react';
import { copyToClipboard, prepareForPaste, hasClipboardContent, canCopyFromContext } from '../utils/clipboardStore';

/**
 * useClipboard — the editor's copy/cut/paste concern (issue #34 part 2).
 *
 * Owns the three handlers plus the Ctrl/Cmd+C/V/X window shortcuts. Clipboard
 * *content* lives in utils/clipboardStore (shared across editor levels); this
 * hook wires it to the current graph, selection and permission context.
 */
export function useClipboard({
    nodes,
    edges,
    selectedIds,
    setSelectedIds,
    path,
    isContextReadOnly,
    isAdmin,
    isSharedView,
    setGraph,
}) {
    const handleCopy = useCallback(() => {
        if (selectedIds.size === 0) return;

        // Check read-only permission
        if (isContextReadOnly && !canCopyFromContext(isContextReadOnly, isAdmin)) {
            alert('Cannot copy from this read-only context.');
            return;
        }

        const selectedNodes = nodes.filter(n => selectedIds.has(n.id));
        const sourceLevel = path.length > 0 ? path[path.length - 1].id : 'root';
        copyToClipboard(selectedNodes, edges, sourceLevel);
    }, [nodes, edges, selectedIds, path, isContextReadOnly, isAdmin]);

    const handlePaste = useCallback(() => {
        if (!hasClipboardContent()) return;
        if (isSharedView) return;

        // Check if action is allowed in current context
        if (isContextReadOnly && !isAdmin) {
            alert('Cannot paste in this read-only context.');
            return;
        }

        const { nodes: pastedNodes, edges: pastedEdges } = prepareForPaste({ x: 30, y: 30 });

        if (pastedNodes.length === 0) return;

        // Add pasted nodes and edges to graph
        setGraph({
            nodes: [...nodes, ...pastedNodes],
            edges: [...edges, ...pastedEdges]
        });

        // Select the newly pasted nodes
        setSelectedIds(new Set(pastedNodes.map(n => n.id)));
    }, [nodes, edges, isContextReadOnly, isAdmin, isSharedView, setGraph, setSelectedIds]);

    const handleCut = useCallback(() => {
        if (selectedIds.size === 0) return;
        if (isSharedView) return;

        // Check if action is allowed
        if (isContextReadOnly && !isAdmin) {
            alert('Cannot cut from this read-only context.');
            return;
        }

        // Copy first
        handleCopy();

        // Then delete selected nodes and their edges
        const newNodes = nodes.filter(n => !selectedIds.has(n.id));
        const newEdges = edges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target));

        setGraph({ nodes: newNodes, edges: newEdges });
        setSelectedIds(new Set());
    }, [nodes, edges, selectedIds, isContextReadOnly, isAdmin, isSharedView, handleCopy, setGraph, setSelectedIds]);

    // Keyboard shortcuts for Copy/Cut/Paste
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Don't trigger if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Check for Ctrl+C (Copy)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                handleCopy();
            }
            // Check for Ctrl+V (Paste)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                handlePaste();
            }
            // Check for Ctrl+X (Cut)
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
                e.preventDefault();
                handleCut();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCopy, handlePaste, handleCut]);

    return { handleCopy, handlePaste, handleCut };
}
