/**
 * FlowCalc Graph Evaluator
 * Evaluates node graphs by computing values through connected nodes.
 */

import { NODE_LOGIC } from './nodeDefinitions';

// Evaluates the graph and returns computed results for all nodes
export function evaluateGraph(nodes, edges, contextInputs = {}) {

    const results = {};

    // Performance: Create node lookup Map for O(1) access instead of O(n) find() calls
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN;
        if (results[nodeId] !== undefined) return results[nodeId];

        const node = nodeMap.get(nodeId);
        if (!node) return 0;

        // Registry Lookup
        const def = NODE_LOGIC[node.type] || {};

        // 1. Check if Value is provided via Context (e.g. Group Inputs)
        if (contextInputs[node.id] !== undefined) {
            const val = contextInputs[node.id];
            results[nodeId] = val;
            return val;
        }

        // Warp Logic
        if (node.type === 'WARP_OUT') {
            const tag = node.data.tag;
            const sourceNode = nodes.find(n => n.type === 'WARP_IN' && n.data.tag === tag);
            if (sourceNode) {
                const val = getNodeValue(sourceNode.id, [...stack, nodeId]);
                results[nodeId] = val; // Store result before returning!
                return val;
            }
            results[nodeId] = 0;
            return 0;
        }

        const connectedEdges = edges.filter(e => e.target === node.id);

        const resolveSourceValue = (rawVal, handle, sourceType, targetType) => {
            // Whitelist target nodes that need raw objects
            if (targetType === 'GET_KEY' || targetType === 'GET' || targetType === 'UNPACK' || targetType === 'GROUP_INPUT_LIST') return rawVal;
            // Priority: Whitelisted types pass through raw value (Objects)
            if (sourceType === 'FORM' || sourceType === 'GROUP_INPUT' || sourceType === 'GROUP_INPUT_LIST' || sourceType === 'PACK') {
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
                const sourceNode = nodeMap.get(edge.source);
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                const resolved = resolveSourceValue(raw, edge.sourceHandle, sourceNode?.type, node.type);
                return resolved;
            };

            // PACK node: Build object keyed by key names
            if (node.type === 'PACK') {
                const keys = node.data.keys || [];
                const args = {};
                keys.forEach((key) => {
                    if (key && key.trim()) {
                        args[key] = mapInput(key);
                    }
                });
                return args;
            }

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
                        const sourceNode = nodeMap.get(e.source);
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
                const sourceNode = nodeMap.get(e.source);
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                const resolved = resolveSourceValue(raw, e.sourceHandle, sourceNode?.type, node.type);
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
                    const sourceNode = nodeMap.get(edge.source);

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

                const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST');
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
