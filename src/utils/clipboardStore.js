/**
 * Internal Clipboard Store for Copy/Paste functionality.
 * Uses module-level state instead of browser Clipboard API for security.
 */

import { generateId } from './ids';

// Internal clipboard state
let clipboard = {
    nodes: [],
    edges: [],
    sourceLevel: null // Track if copied from inside a GROUP
};

/**
 * Copy nodes and their connecting edges to the internal clipboard
 * @param {Array} selectedNodes - Nodes to copy
 * @param {Array} allEdges - All edges in current graph
 * @param {string|null} sourceLevel - 'root' or GROUP node ID
 */
export const copyToClipboard = (selectedNodes, allEdges, sourceLevel = 'root') => {
    if (!selectedNodes || selectedNodes.length === 0) {
        clipboard = { nodes: [], edges: [], sourceLevel: null };
        return;
    }

    const selectedIds = new Set(selectedNodes.map(n => n.id));

    // Deep clone nodes
    const clonedNodes = selectedNodes.map(node => deepCloneNode(node));

    // Only copy edges where BOTH source and target are in selection
    const relevantEdges = allEdges.filter(edge =>
        selectedIds.has(edge.source) && selectedIds.has(edge.target)
    );
    const clonedEdges = relevantEdges.map(edge => ({ ...edge }));

    clipboard = {
        nodes: clonedNodes,
        edges: clonedEdges,
        sourceLevel
    };
};

/**
 * Get clipboard contents
 */
export const getClipboard = () => clipboard;

/**
 * Check if clipboard has content
 */
export const hasClipboardContent = () => clipboard.nodes.length > 0;

/**
 * Clear the clipboard
 */
export const clearClipboard = () => {
    clipboard = { nodes: [], edges: [], sourceLevel: null };
};

/**
 * Deep clone a node, including subGraph for GROUP nodes
 */
const deepCloneNode = (node) => {
    const cloned = JSON.parse(JSON.stringify(node));
    return cloned;
};

/**
 * Prepare clipboard content for pasting by regenerating all IDs
 * @param {Object} offset - Position offset { x, y }
 * @returns {{ nodes: Array, edges: Array }} Ready-to-paste data
 */
export const prepareForPaste = (offset = { x: 20, y: 20 }) => {
    if (!hasClipboardContent()) {
        return { nodes: [], edges: [] };
    }

    // Create ID mapping: old ID -> new ID
    const idMap = new Map();

    // Generate new IDs for all nodes
    const newNodes = clipboard.nodes.map(node => {
        const newId = generateId();
        idMap.set(node.id, newId);

        const newNode = {
            ...deepCloneNode(node),
            id: newId,
            position: {
                x: node.position.x + offset.x,
                y: node.position.y + offset.y
            }
        };

        // If GROUP node, regenerate subGraph IDs
        if (node.type === 'GROUP' && newNode.data?.subGraph) {
            newNode.data.subGraph = regenerateSubGraphIds(newNode.data.subGraph);
        }

        return newNode;
    });

    // Remap edge source/target to new IDs
    const newEdges = clipboard.edges
        .filter(edge => idMap.has(edge.source) && idMap.has(edge.target))
        .map(edge => ({
            ...edge,
            id: generateId(),
            source: idMap.get(edge.source),
            target: idMap.get(edge.target)
        }));

    return { nodes: newNodes, edges: newEdges };
};

/**
 * Regenerate all IDs within a GROUP's subGraph
 */
const regenerateSubGraphIds = (subGraph) => {
    const idMap = new Map();

    // Regenerate node IDs
    const newNodes = subGraph.nodes.map(node => {
        const newId = generateId();
        idMap.set(node.id, newId);

        const newNode = {
            ...deepCloneNode(node),
            id: newId
        };

        // Recursively handle nested GROUPs
        if (node.type === 'GROUP' && newNode.data?.subGraph) {
            newNode.data.subGraph = regenerateSubGraphIds(newNode.data.subGraph);
        }

        return newNode;
    });

    // Remap edges
    const newEdges = subGraph.edges.map(edge => ({
        ...edge,
        id: generateId(),
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target,
        // Also remap handles if they reference node IDs
        sourceHandle: idMap.get(edge.sourceHandle) || edge.sourceHandle,
        targetHandle: idMap.get(edge.targetHandle) || edge.targetHandle
    }));

    return { nodes: newNodes, edges: newEdges };
};

/**
 * Check if copy is allowed based on read-only status and user permissions
 * @param {boolean} isReadOnly - Is the current context read-only
 * @param {boolean} isAdmin - Is the user an admin
 * @param {boolean} isSameTeam - Is user in the same team (future feature)
 * @returns {boolean}
 */
export const canCopyFromContext = (isReadOnly, isAdmin, isSameTeam = true) => {
    if (!isReadOnly) return true;
    // In read-only context, only allow if admin or same team
    return isAdmin || isSameTeam;
};
