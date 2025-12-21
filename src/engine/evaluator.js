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

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN; 
        if (results[nodeId] !== undefined) return results[nodeId];
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;
        
        const def = NODE_LOGIC[node.type] || {};

        if (node.type === 'GROUP_INPUT' || node.type === 'GROUP_INPUT_LIST') {
             return contextInputs[node.id] !== undefined ? contextInputs[node.id] : (node.data.value || (node.type === 'GROUP_INPUT_LIST' ? [] : 0));
        }

        const connectedEdges = edges.filter(e => e.target === node.id);
        
        const resolveSourceValue = (rawVal, handle, sourceType, targetType) => {
            // Whitelist target nodes that need raw objects
            if (targetType === 'GET_KEY' || targetType === 'GET' || targetType === 'UNPACK' || targetType === 'GROUP_INPUT_LIST') return rawVal;
            // Whitelist source types that pass through raw objects
            if (sourceType === 'FORM' || sourceType === 'GROUP_INPUT' || sourceType === 'GROUP_INPUT_LIST') return rawVal;
            // Extract specific handle from object if requested
            if (typeof rawVal === 'object' && rawVal !== null && handle) {
                return rawVal[handle] ?? 0;
            }
            // Unwrap single-value objects
            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
                return Object.values(rawVal)[0] ?? 0;
            }
            return rawVal;
        };

        // Robust Input Mapping
        const getInputs = () => {
            // Map based on specific handle definitions to ensure order
            const mapInput = (handleId, inputIndex) => {
                // Try to find edge by exact handle match first
                let edge = connectedEdges.find(e => e.targetHandle === handleId);
                
                // Fallback: if only one input defined and only one edge, use that edge
                if (!edge && def.inputs?.length === 1 && connectedEdges.length === 1) {
                    edge = connectedEdges[0];
                }
                
                // Fallback: for multi-input nodes, try positional matching with edges that have null targetHandle
                if (!edge && inputIndex !== undefined) {
                    const nullHandleEdges = connectedEdges.filter(e => !e.targetHandle || e.targetHandle === 'in_' + inputIndex);
                    if (nullHandleEdges.length > inputIndex) {
                        edge = nullHandleEdges[inputIndex];
                    } else if (connectedEdges.length > inputIndex) {
                        // Last resort: use edge at same index
                        edge = connectedEdges[inputIndex];
                    }
                }

                if (!edge) return undefined; 
                const sourceNode = nodes.find(n => n.id === edge.source);
                const raw = getNodeValue(edge.source, [...stack, nodeId]);

                return resolveSourceValue(raw, edge.sourceHandle, sourceNode?.type, node.type);
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
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type, node.type);
                    }
                });
                return arr;
            }

            if (def.inputs && !def.inputs.includes('*')) {
                const args = {};
                def.inputs.forEach((inputName, index) => {
                    args[inputName] = mapInput(inputName, index);
                });
                return args;
            }

            // Default linear mapping for variable inputs ('*')
            return connectedEdges.map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                return resolveSourceValue(raw, e.sourceHandle, sourceNode?.type, node.type);
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
                    
                    // Determine internal target type
                    let internalTargetType = undefined;
                    if (edge.targetHandle) {
                        const targetNode = subGraph.nodes.find(n => n.id === edge.targetHandle);
                        if (targetNode) internalTargetType = targetNode.type;
                    } else {
                         const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST');
                         if (firstInput) internalTargetType = firstInput.type;
                    }

                    const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle, sourceNode?.type, internalTargetType);
                    
                    if (edge.targetHandle) {
                        const targetNode = subGraph.nodes.find(n => n.id === edge.targetHandle);
                        if (targetNode && targetNode.type === 'GROUP_INPUT_LIST') {
                            if (!subContext[edge.targetHandle]) subContext[edge.targetHandle] = [];
                            subContext[edge.targetHandle].push(sourceVal);
                        } else {
                            subContext[edge.targetHandle] = sourceVal;
                        }
                    } else {
                         // Default to first input if not specified - check if it's a list type
                        const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST');
                        if (firstInput) {
                             if (firstInput.type === 'GROUP_INPUT_LIST') {
                                if (!subContext[firstInput.id]) subContext[firstInput.id] = [];
                                subContext[firstInput.id].push(sourceVal);
                             } else {
                                subContext[firstInput.id] = sourceVal;
                             }
                        }
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

        const resolveSourceValue = (rawVal, handle, sourceType, targetType) => {
            // Whitelist target nodes that need raw objects
            if (targetType === 'GET_KEY' || targetType === 'GET' || targetType === 'UNPACK' || targetType === 'GROUP_INPUT_LIST') return rawVal;
            // Priority: Whitelisted types pass through raw value (Objects)
            if (sourceType === 'FORM' || sourceType === 'GROUP_INPUT' || sourceType === 'GROUP_INPUT_LIST') {
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
            const mapInput = (handleId, inputIndex) => {
                // Try to find edge by exact handle match first
                let edge = connectedEdges.find(e => e.targetHandle === handleId);

                // Fallback: if only one input defined and only one edge, use that edge
                if (!edge && def.inputs?.length === 1 && connectedEdges.length === 1) {
                    edge = connectedEdges[0];
                }

                // Fallback: for multi-input nodes, try positional matching
                if (!edge && inputIndex !== undefined) {
                    const nullHandleEdges = connectedEdges.filter(e => !e.targetHandle || e.targetHandle === 'in_' + inputIndex);
                    if (nullHandleEdges.length > inputIndex) {
                        edge = nullHandleEdges[inputIndex];
                    } else if (connectedEdges.length > inputIndex) {
                        edge = connectedEdges[inputIndex];
                    }
                }

                if (!edge) return undefined;
                const sourceNode = nodes.find(n => n.id === edge.source);
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                if (node.type === 'SUM') {
                    // console.log(`[Eval] SUM Resolving input from ${sourceNode?.type} (ID: ${edge.source}). Raw:`, raw);
                }
                const resolved = resolveSourceValue(raw, edge.sourceHandle, sourceNode?.type, node.type);
                if (node.type === 'SUM') {
                    console.log(`[Eval] SUM Resolved input:`, resolved);
                }
                return resolved;
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
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type, node.type);
                    }
                });
                return arr;
            }

            if (def.inputs && !def.inputs.includes('*')) {
                const args = {};
                def.inputs.forEach((inputName, index) => {
                    args[inputName] = mapInput(inputName, index);
                });
                return args;
            }

            // Default linear mapping for variable inputs ('*')
            return connectedEdges.map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                if (node.type === 'SUM') {
                    console.log(`[Eval] SUM (VarArg) Resolving input from ${sourceNode?.type}. Raw:`, raw);
                }
                const resolved = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type, node.type);
                if (node.type === 'SUM') {
                    console.log(`[Eval] SUM (VarArg) Resolved:`, resolved);
                }
                return resolved;
            });
        };

        const inputVals = getInputs();

        let val = 0;
        try {
            if (node.type === 'GROUP') {
                const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                const subContext = {};
                if (node.data.label === 'Main Loop') console.log('DEBUG GROUP EVAL START');
                connectedEdges.forEach((edge) => {
                    const sourceNode = nodes.find(n => n.id === edge.source);

                    // Determine internal target type
                    let internalTargetType = undefined;
                    if (edge.targetHandle) {
                        const targetNode = subGraph.nodes.find(n => n.id === edge.targetHandle);
                        if (targetNode) internalTargetType = targetNode.type;
                    } else {
                        const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST');
                        if (firstInput) internalTargetType = firstInput.type;
                    }

                    const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle, sourceNode?.type, internalTargetType);

                    if (edge.targetHandle) {
                        const targetNode = subGraph.nodes.find(n => n.id === edge.targetHandle);
                        console.log(`[Eval] Edge to ${edge.targetHandle}. TargetNode found: ${!!targetNode}. Type: ${targetNode?.type}`);
                        if (targetNode && targetNode.type === 'GROUP_INPUT_LIST') {
                            if (!subContext[edge.targetHandle]) subContext[edge.targetHandle] = [];
                            subContext[edge.targetHandle].push(sourceVal);
                            console.log(`[Eval] Pushed to list for ${edge.targetHandle}. Current:`, subContext[edge.targetHandle]);
                        } else {
                            subContext[edge.targetHandle] = sourceVal;
                        }
                    } else {
                        const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST');
                        if (firstInput) {
                            if (firstInput.type === 'GROUP_INPUT_LIST') {
                                if (!subContext[firstInput.id]) subContext[firstInput.id] = [];
                                subContext[firstInput.id].push(sourceVal);
                            } else {
                                subContext[firstInput.id] = sourceVal;
                            }
                        }
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
