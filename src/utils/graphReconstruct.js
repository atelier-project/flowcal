
/**
 * Reconstructs the full root graph data from the current nested state.
 * @param {Array} path - Stack of parent contexts [{ id, nodes, edges, viewport }]
 * @param {Array} nodes - Current level nodes
 * @param {Array} edges - Current level edges
 * @param {Object} viewport - Current viewport state { pan, scale }
 * @returns {Object} - The full root graph data { nodes, edges, viewport }
 */
export const reconstructFullGraph = (path, nodes, edges, viewport) => {
    // If we are at root, just return current state
    if (!path || path.length === 0) return { nodes, edges, viewport };

    let currentLevel = { nodes, edges, viewport };

    // Iterate backwards from the deepest parent to the root
    // path structure: [RootContext, Level1Context, Level2Context...]
    // If we are in Level 3, path has indices 0, 1, 2.
    // path[2] is Level 2 Context (parent of Level 3).
    // The group node that contains Level 3 has ID = path[2].id.
    for (let i = path.length - 1; i >= 0; i--) {
        const frame = path[i];
        const groupId = frame.id;

        // Update the specific GROUP node in the parent frame to contain the updated subgraph (currentLevel)
        const updatedNodes = frame.nodes.map(n =>
            n.id === groupId
                ? {
                    ...n,
                    data: {
                        ...n.data,
                        subGraph: {
                            nodes: currentLevel.nodes,
                            edges: currentLevel.edges
                        }
                    }
                }
                : n
        );

        // The result of this iteration becomes the "current level" for the next iteration (stepping up)
        // Note: We use the parent's viewport as we step up, unless we tracked viewport per group?
        // Usually viewport is strictly a UI state for the *current* view.
        // When saving the ROOT graph, we usually want the Root's viewport.
        // If i=0 (Root), frame.viewport is the Root viewport.
        // So eventually we return the Root graph with Root viewport.
        currentLevel = {
            nodes: updatedNodes,
            edges: frame.edges,
            viewport: frame.viewport || { pan: { x: 0, y: 0 }, scale: 1 }
        };
    }

    return currentLevel;
};
