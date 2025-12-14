/**
 * Custom Node Storage Utility
 * Manages saving, loading, exporting, and importing custom nodes
 */

const STORAGE_KEY = 'flowcal-custom-nodes';

/**
 * Get all custom nodes from localStorage
 */
export const getCustomNodes = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load custom nodes:', e);
        return [];
    }
};

/**
 * Save a custom node to localStorage
 */
export const saveCustomNode = (node) => {
    const nodes = getCustomNodes();
    const existingIndex = nodes.findIndex(n => n.id === node.id);

    if (existingIndex >= 0) {
        nodes[existingIndex] = node;
    } else {
        nodes.push(node);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    return nodes;
};

/**
 * Delete a custom node from localStorage
 */
export const deleteCustomNode = (id) => {
    const nodes = getCustomNodes().filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
    return nodes;
};

/**
 * Export a custom node as downloadable JSON
 */
export const exportCustomNode = (id) => {
    const nodes = getCustomNodes();
    const node = nodes.find(n => n.id === id);
    if (!node) return null;

    const blob = new Blob([JSON.stringify(node, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${node.name.replace(/[^a-zA-Z0-9-_ ]/g, '')}.fccustom.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Import a custom node from JSON string
 */
export const importCustomNode = (jsonString) => {
    try {
        const node = JSON.parse(jsonString);

        // Validate required fields
        if (!node.name || !node.subGraph) {
            throw new Error('Invalid custom node format');
        }

        // Ensure unique ID on import
        node.id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        node.importedAt = new Date().toISOString();

        return saveCustomNode(node);
    } catch (e) {
        console.error('Failed to import custom node:', e);
        throw e;
    }
};

/**
 * Create a custom node definition from a GROUP node
 */
export const createCustomNodeFromGroup = (groupNode, metadata = {}) => {
    if (groupNode.type !== 'GROUP') {
        throw new Error('Can only create custom nodes from GROUP nodes');
    }

    const subGraph = groupNode.data.subGraph || { nodes: [], edges: [] };

    // Extract inputs and outputs from GROUP_INPUT/OUTPUT nodes
    const inputs = subGraph.nodes
        .filter(n => n.type === 'GROUP_INPUT')
        .map(n => ({ id: n.id, label: n.data.label || 'Input' }));

    const outputs = subGraph.nodes
        .filter(n => n.type === 'GROUP_OUTPUT')
        .map(n => ({ id: n.id, label: n.data.label || 'Output' }));

    const customNode = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: metadata.name || groupNode.data.label || 'Custom Node',
        description: metadata.description || '',
        category: 'Custom',
        icon: metadata.icon || 'Package',
        version: 1,
        subGraph: JSON.parse(JSON.stringify(subGraph)), // Deep clone
        inputs,
        outputs,
        author: metadata.author || '',
        createdAt: new Date().toISOString()
    };

    return customNode;
};

/**
 * Instantiate a custom node as a GROUP node for the canvas
 */
export const instantiateCustomNode = (customNode, position) => {
    return {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'GROUP',
        position,
        data: {
            label: customNode.name,
            customNodeId: customNode.id, // Reference to the custom node definition
            subGraph: JSON.parse(JSON.stringify(customNode.subGraph)) // Deep clone
        }
    };
};
