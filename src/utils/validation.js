/**
 * Schema validation utilities for imported flows and custom nodes.
 * Provides protection against malformed data, XSS, and prototype pollution.
 */

// Maximum sizes to prevent memory issues
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_NODES = 10000;
const MAX_EDGES = 50000;
const MAX_STRING_LENGTH = 100000;
const MAX_KEYS = 1000;

/**
 * Sanitize a string to prevent XSS in labels/text
 */
export const sanitizeString = (str, maxLength = MAX_STRING_LENGTH) => {
    if (typeof str !== 'string') return '';
    // Truncate if too long
    if (str.length > maxLength) str = str.slice(0, maxLength);
    // Remove potential script injection patterns
    return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
};

/**
 * Deep sanitize an object to prevent prototype pollution
 */
export const sanitizeObject = (obj, depth = 0) => {
    if (depth > 50) return null; // Prevent deep recursion attacks
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.slice(0, MAX_NODES).map(item => sanitizeObject(item, depth + 1));
    }

    // Handle objects - filter dangerous keys
    const result = {};
    const keys = Object.keys(obj).slice(0, MAX_KEYS);
    for (const key of keys) {
        // Block prototype pollution vectors
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
        }
        result[key] = sanitizeObject(obj[key], depth + 1);
    }
    return result;
};

/**
 * Validate a node object structure
 */
export const validateNode = (node) => {
    if (!node || typeof node !== 'object') return { valid: false, error: 'Node must be an object' };
    if (typeof node.id !== 'string' || !node.id) return { valid: false, error: 'Node must have string id' };
    if (typeof node.type !== 'string' || !node.type) return { valid: false, error: 'Node must have string type' };
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        return { valid: false, error: 'Node must have valid position {x, y}' };
    }
    return { valid: true };
};

/**
 * Validate an edge object structure
 */
export const validateEdge = (edge) => {
    if (!edge || typeof edge !== 'object') return { valid: false, error: 'Edge must be an object' };
    if (typeof edge.id !== 'string' || !edge.id) return { valid: false, error: 'Edge must have string id' };
    if (typeof edge.source !== 'string' || !edge.source) return { valid: false, error: 'Edge must have string source' };
    if (typeof edge.target !== 'string' || !edge.target) return { valid: false, error: 'Edge must have string target' };
    return { valid: true };
};

/**
 * Check if flow contains potentially dangerous code nodes
 */
export const containsCodeNodes = (nodes) => {
    const codeNodeTypes = ['CUSTOM', 'FUNCTION'];
    return nodes.some(n => codeNodeTypes.includes(n.type));
};

/**
 * Validate and sanitize an imported flow configuration
 * Returns { valid, data, error, warnings }
 */
export const validateFlow = (config, fileSize = 0) => {
    const warnings = [];

    // Size check
    if (fileSize > MAX_FILE_SIZE) {
        return { valid: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }

    // Basic structure check
    if (!config || typeof config !== 'object') {
        return { valid: false, error: 'Invalid configuration format' };
    }

    // Sanitize the entire object first (prototype pollution protection)
    const sanitized = sanitizeObject(config);

    // Check nodes array
    if (!Array.isArray(sanitized.nodes)) {
        return { valid: false, error: 'Configuration must have nodes array' };
    }
    if (sanitized.nodes.length > MAX_NODES) {
        return { valid: false, error: `Too many nodes (max ${MAX_NODES})` };
    }

    // Check edges array
    if (!Array.isArray(sanitized.edges)) {
        return { valid: false, error: 'Configuration must have edges array' };
    }
    if (sanitized.edges.length > MAX_EDGES) {
        return { valid: false, error: `Too many edges (max ${MAX_EDGES})` };
    }

    // Validate each node
    for (let i = 0; i < sanitized.nodes.length; i++) {
        const result = validateNode(sanitized.nodes[i]);
        if (!result.valid) {
            return { valid: false, error: `Node ${i}: ${result.error}` };
        }
        // Sanitize string fields in node data
        if (sanitized.nodes[i].data) {
            if (sanitized.nodes[i].data.label) {
                sanitized.nodes[i].data.label = sanitizeString(sanitized.nodes[i].data.label, 200);
            }
            if (sanitized.nodes[i].data.description) {
                sanitized.nodes[i].data.description = sanitizeString(sanitized.nodes[i].data.description, 1000);
            }
        }
    }

    // Validate each edge
    for (let i = 0; i < sanitized.edges.length; i++) {
        const result = validateEdge(sanitized.edges[i]);
        if (!result.valid) {
            return { valid: false, error: `Edge ${i}: ${result.error}` };
        }
    }

    // Warn about code nodes
    if (containsCodeNodes(sanitized.nodes)) {
        warnings.push('This flow contains custom code nodes. Review the code before running.');
    }

    return {
        valid: true,
        data: { nodes: sanitized.nodes, edges: sanitized.edges },
        warnings
    };
};

/**
 * Validate and sanitize a custom node import
 */
export const validateCustomNode = (nodeData) => {
    const warnings = [];

    if (!nodeData || typeof nodeData !== 'object') {
        return { valid: false, error: 'Invalid custom node format' };
    }

    const sanitized = sanitizeObject(nodeData);

    // Required fields
    if (typeof sanitized.id !== 'string' || !sanitized.id) {
        return { valid: false, error: 'Custom node must have string id' };
    }
    if (typeof sanitized.name !== 'string' || !sanitized.name) {
        return { valid: false, error: 'Custom node must have string name' };
    }

    // Validate subGraph if present
    if (sanitized.subGraph) {
        const subResult = validateFlow({ nodes: sanitized.subGraph.nodes || [], edges: sanitized.subGraph.edges || [] });
        if (!subResult.valid) {
            return { valid: false, error: `SubGraph: ${subResult.error}` };
        }
        sanitized.subGraph = subResult.data;
        if (subResult.warnings) warnings.push(...subResult.warnings);
    }

    // Sanitize text fields
    sanitized.name = sanitizeString(sanitized.name, 100);
    if (sanitized.description) {
        sanitized.description = sanitizeString(sanitized.description, 500);
    }

    return { valid: true, data: sanitized, warnings };
};
