/**
 * Standalone FlowCalc Engine
 */

import { NODE_LOGIC } from './nodeDefinitions';

// Serialize NODE_LOGIC for the standalone script
// We need to carefully stringify functions. JSON.stringify removes functions.
const serializeRegistry = () => {
    let script = 'const NODE_LOGIC = {\n';
    for (const [key, def] of Object.entries(NODE_LOGIC)) {
        script += `  ${key}: {\n`;
        for (const [prop, val] of Object.entries(def)) {
            if (typeof val === 'function') {
                script += `    ${prop}: ${val.toString()},\n`;
            } else {
                script += `    ${prop}: ${JSON.stringify(val)},\n`;
            }
        }
        script += '  },\n';
    }
    script += '};\n';
    return script;
};

export const ENGINE_SCRIPT = `
/**
 * Standalone FlowCalc Engine
 * Generated automatically.
 */
${serializeRegistry()}

function evaluateGraph(nodes, edges, contextInputs = {}) {
    const results = {};
    const memo = new Set(); 

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN; 
        if (results[nodeId] !== undefined) return results[nodeId];
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;
        
        const def = NODE_LOGIC[node.type] || {};

        if (node.type === 'GROUP_INPUT') {
             return contextInputs[node.id] !== undefined ? contextInputs[node.id] : (node.data.value || 0);
        }

        const connectedEdges = edges.filter(e => e.target === node.id);
        
        const resolveSourceValue = (rawVal, handle, sourceType) => {
            // console.log('Resolve:', { handle, sourceType, rawVal });
            if (typeof rawVal === 'object' && rawVal !== null && handle) {
                return rawVal[handle] ?? 0;
            }
            if (sourceType === 'FORM' || sourceType === 'GROUP_INPUT') {
               // console.log('Whitelisted Object Pass:', rawVal);
               return rawVal; 
            }
            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
                 // console.log('Unwrapping Object:', rawVal);
                return Object.values(rawVal)[0] ?? 0;
            }
            return rawVal;
        };

        // Robust Input Mapping
        const getInputs = () => {
            // Map based on specific handle definitions to ensure order
            const mapInput = (handleId) => {
                const edge = connectedEdges.find(e => e.targetHandle === handleId);
                if (!edge) return 0; // Default 0 if unconnected
                const sourceNode = nodes.find(n => n.id === edge.source);
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                return resolveSourceValue(raw, edge.sourceHandle, sourceNode?.type);
            };

            if (def.dynamicInputs || node.type === 'COLLECTOR') {
                let count = node.data.inputCount || 2;
                let fillVal = 0;

                if (node.type === 'FORM') {
                    count = (node.data.fields || []).length;
                    fillVal = undefined; // Use undefined to allow fallback to internal defaults
                }

                const arr = new Array(count).fill(fillVal);
                connectedEdges.forEach(e => {
                    const idx = parseInt(e.targetHandle?.split('_')[1] || '0', 10);
                    if (!isNaN(idx)) {
                        const sourceNode = nodes.find(n => n.id === e.source);
                        const raw = getNodeValue(e.source, [...stack, nodeId]);
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type);
                    }
                });
                return arr;
            }
            
            if (def.inputs && !def.inputs.includes('*')) {
                return def.inputs.map(inputName => mapInput(inputName));
            }

            // Default linear mapping for variable inputs ('*')
            return connectedEdges.map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                const resolved = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type);
                return resolved;
            });
        };

        const inputVals = getInputs();
        
        let val = 0;
        try {
            if (node.type === 'GROUP') {
                const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                const subContext = {};
                connectedEdges.forEach((edge) => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle, sourceNode?.type);
                    if (edge.targetHandle) {
                        subContext[edge.targetHandle] = sourceVal;
                    } else {
                        const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT');
                        if (firstInput) subContext[firstInput.id] = sourceVal;
                    }
                });
                
                const subResults = evaluateGraph(subGraph.nodes, subGraph.edges, subContext);
                
                const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT');
                if (outputs.length > 0) {
                    val = {};
                    outputs.forEach(out => {
                        val[out.id] = subResults[out.id];
                    });
                } else {
                    val = 0;
                }
            } else if (def.compute) {
                val = def.compute(inputVals, node.data || {});
            } else {
                val = 0;
            }
        } catch(e) { 
            console.error("Error calculating node", nodeId, e);
            val = NaN; 
        }
        
        results[nodeId] = val;
        return val;
    };
    
    nodes.forEach(n => getNodeValue(n.id));
    return results;
}
`;

// Exportable JS function for the React app usage
export function evaluateGraph(nodes, edges, contextInputs = {}) {
    // This is a direct copy of the logic inside ENGINE_SCRIPT but using the imported NODE_LOGIC
    // We duplicate the function body to ensure consistency between app and export
    // In a real build step we might strip this, but keeping it simple here.

    const results = {};
    const memo = new Set();

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN;
        if (results[nodeId] !== undefined) return results[nodeId];

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;

        // Registry Lookup
        const def = NODE_LOGIC[node.type] || {};


        // 1. Check if Value is provided via Context (e.g. Group Inputs)
        if (contextInputs[node.id] !== undefined) {
            const val = contextInputs[node.id];
            results[nodeId] = val;
            return val;
        }

        const connectedEdges = edges.filter(e => e.target === node.id);

        const resolveSourceValue = (rawVal, handle, sourceType) => {
            // Priority: Whitelisted types pass through raw value (Objects)
            if (sourceType === 'FORM' || sourceType === 'GROUP_INPUT') {
                return rawVal;
            }
            // Logic: If specific handle requested and exists on object, return it
            if (typeof rawVal === 'object' && rawVal !== null && handle) {
                return rawVal[handle] ?? 0;
            }
            // Fallback: Unwrap single valid object values
            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
                return Object.values(rawVal)[0] ?? 0;
            }
            return rawVal;
        };

        const getInputs = () => {
            const mapInput = (handleId) => {
                const edge = connectedEdges.find(e => e.targetHandle === handleId);
                if (!edge) return 0;
                const sourceNode = nodes.find(n => n.id === edge.source);
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                return resolveSourceValue(raw, edge.sourceHandle, sourceNode?.type);
            };

            if (def.dynamicInputs || node.type === 'COLLECTOR') {
                let count = node.data.inputCount || 2;
                let fillVal = 0;

                if (node.type === 'FORM') {
                    count = (node.data.fields || []).length;
                    fillVal = undefined;
                }

                const arr = new Array(count).fill(fillVal);
                connectedEdges.forEach(e => {
                    const idx = parseInt(e.targetHandle?.split('_')[1] || '0', 10);
                    if (!isNaN(idx)) {
                        const sourceNode = nodes.find(n => n.id === e.source);
                        const raw = getNodeValue(e.source, [...stack, nodeId]);
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type);
                    }
                });
                return arr;
            }

            if (def.inputs && !def.inputs.includes('*')) {
                return def.inputs.map(inputName => mapInput(inputName));
            }

            return connectedEdges.map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                return resolveSourceValue(raw, e.sourceHandle, sourceNode?.type);
            });
        };

        const inputVals = getInputs();

        let val = 0;
        try {
            if (node.type === 'GROUP') {
                const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                const subContext = {};
                connectedEdges.forEach((edge) => {
                    const sourceNode = nodes.find(n => n.id === edge.source);
                    const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle, sourceNode?.type);
                    if (edge.targetHandle) {
                        subContext[edge.targetHandle] = sourceVal;
                    } else {
                        const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT');
                        if (firstInput) subContext[firstInput.id] = sourceVal;
                    }
                });

                const subResults = evaluateGraph(subGraph.nodes, subGraph.edges, subContext);

                const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT');
                if (outputs.length > 0) {
                    val = {};
                    outputs.forEach(out => {
                        val[out.id] = subResults[out.id];
                    });
                } else {
                    val = 0;
                }
            } else if (def.compute) {
                val = def.compute(inputVals, node.data || {});
            } else {
                val = 0;
            }
        } catch (e) {
            console.error("Error calculating node", nodeId, e);
            val = NaN;
        }

        results[nodeId] = val;
        return val;
    };

    nodes.forEach(n => getNodeValue(n.id));
    return results;
}
