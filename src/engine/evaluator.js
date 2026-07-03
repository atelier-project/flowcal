/**
 * FlowCalc Graph Evaluator
 * Evaluates node graphs by computing values through connected nodes.
 */

import { NODE_LOGIC } from './nodeDefinitions';
import { resolveSourceValue } from './valueResolution';

// Evaluates the graph and returns computed results for all nodes
export function evaluateGraph(nodes, edges, contextInputs = {}, globals = []) {

    const results = {};

    // Performance: Create node lookup Map for O(1) access instead of O(n) find() calls
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Create Globals Map for fast lookup
    const globalsMap = new Map((globals || []).map(g => {
        let val = g.value;
        if (g.type === 'number') val = Number(val);
        if (g.type === 'json' && typeof val === 'string') {
            try { val = JSON.parse(val); } catch { console.warn('Invalid JSON global', g.key); val = null; }
        }
        return [g.key, val];
    }));

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN;
        if (results[nodeId] !== undefined) return results[nodeId];

        const node = nodeMap.get(nodeId);
        if (!node) return 0;

        // Registry Lookup
        const def = NODE_LOGIC[node.type] || {};

        // GET_GLOBAL Logic
        if (node.type === 'GET_GLOBAL') {
            const key = node.data.key;
            const val = globalsMap.get(key);
            results[nodeId] = val !== undefined ? val : null;
            return results[nodeId];
        }

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

                const subResults = evaluateGraph(subGraph.nodes, subGraph.edges, subContext, globals);

                const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST');
                if (outputs.length > 0) {
                    val = {};
                    // Key by node id first — this is the canonical handle.
                    outputs.forEach(out => {
                        val[out.id] = subResults[out.id];
                    });
                    // Also expose each output by its label, so an external edge can
                    // reference a GROUP_OUTPUT by either its node id or its human-readable
                    // label as the sourceHandle. Ids take precedence on collision; the
                    // first output wins if two share a label.
                    outputs.forEach(out => {
                        const lbl = out.data?.label;
                        if (lbl && val[lbl] === undefined) {
                            val[lbl] = subResults[out.id];
                        }
                    });
                } else {
                    val = 0;
                }
            } else if (node.type === 'MAP') {
                // MAP: Evaluate subGraph once per array item, collect outputs
                const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                const inputArray = Array.isArray(inputVals.array) ? inputVals.array :
                    (Array.isArray(inputVals[0]) ? inputVals[0] : []);
                const results = [];

                const mapItemNode = subGraph.nodes.find(n => n.type === 'MAP_ITEM');
                const mapIndexNode = subGraph.nodes.find(n => n.type === 'MAP_INDEX');
                const mapOutputNode = subGraph.nodes.find(n => n.type === 'MAP_OUTPUT');

                inputArray.forEach((item, index) => {
                    const iterContext = {};
                    if (mapItemNode) iterContext[mapItemNode.id] = item;
                    if (mapIndexNode) iterContext[mapIndexNode.id] = index;

                    const iterResults = evaluateGraph(subGraph.nodes, subGraph.edges, iterContext, globals);

                    if (mapOutputNode) {
                        results.push(iterResults[mapOutputNode.id]);
                    }
                });
                val = results;
            } else if (node.type === 'FILTER') {
                // FILTER: Evaluate subGraph per item, include item if condition is true
                const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                const inputArray = Array.isArray(inputVals.array) ? inputVals.array :
                    (Array.isArray(inputVals[0]) ? inputVals[0] : []);
                const results = [];

                const filterItemNode = subGraph.nodes.find(n => n.type === 'FILTER_ITEM');
                const filterIndexNode = subGraph.nodes.find(n => n.type === 'FILTER_INDEX');
                const filterIncludeNode = subGraph.nodes.find(n => n.type === 'FILTER_INCLUDE');

                inputArray.forEach((item, index) => {
                    const iterContext = {};
                    if (filterItemNode) iterContext[filterItemNode.id] = item;
                    if (filterIndexNode) iterContext[filterIndexNode.id] = index;

                    const iterResults = evaluateGraph(subGraph.nodes, subGraph.edges, iterContext, globals);

                    if (filterIncludeNode && iterResults[filterIncludeNode.id]) {
                        results.push(item);
                    }
                });
                val = results;
            } else if (node.type === 'REDUCE') {
                // REDUCE: Evaluate subGraph per item with accumulator, return final value
                const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                const inputArray = Array.isArray(inputVals.array) ? inputVals.array :
                    (Array.isArray(inputVals[0]) ? inputVals[0] : []);
                let accumulator = node.data.initialValue ?? 0;

                const reduceItemNode = subGraph.nodes.find(n => n.type === 'REDUCE_ITEM');
                const reduceIndexNode = subGraph.nodes.find(n => n.type === 'REDUCE_INDEX');
                const reduceAccNode = subGraph.nodes.find(n => n.type === 'REDUCE_ACCUMULATOR');
                const reduceOutputNode = subGraph.nodes.find(n => n.type === 'REDUCE_OUTPUT');

                inputArray.forEach((item, index) => {
                    const iterContext = {};
                    if (reduceItemNode) iterContext[reduceItemNode.id] = item;
                    if (reduceIndexNode) iterContext[reduceIndexNode.id] = index;
                    if (reduceAccNode) iterContext[reduceAccNode.id] = accumulator;

                    const iterResults = evaluateGraph(subGraph.nodes, subGraph.edges, iterContext, globals);

                    if (reduceOutputNode) {
                        accumulator = iterResults[reduceOutputNode.id];
                    }
                });
                val = accumulator;
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
