/**
 * Standalone FlowCalc Engine
 */

export const ENGINE_SCRIPT = `
/**
 * Standalone FlowCalc Engine
 * Generated automatically.
 */
function evaluateGraph(nodes, edges, contextInputs = {}) {
    const results = {};
    const memo = new Set(); 

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN; 
        if (results[nodeId] !== undefined) return results[nodeId];
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;
        
        if (node.type === 'GROUP_INPUT') {
             return contextInputs[node.id] !== undefined ? contextInputs[node.id] : (node.data.value || 0);
        }

        const connectedEdges = edges.filter(e => e.target === node.id);
        
        const resolveSourceValue = (rawVal, handle) => {
            if (typeof rawVal === 'object' && rawVal !== null && handle) {
                return rawVal[handle] ?? 0;
            }
            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
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
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                return resolveSourceValue(raw, edge.sourceHandle);
            };

            if (node.type === 'COLLECTOR') {
                const arr = new Array(node.data.inputCount || 2).fill(0);
                connectedEdges.forEach(e => {
                    const idx = parseInt(e.targetHandle?.split('_')[1] || '0', 10);
                    if (!isNaN(idx)) {
                        const raw = getNodeValue(e.source, [...stack, nodeId]);
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle);
                    }
                });
                return arr;
            }
            
            if (node.type === 'GAUGE') return [mapInput('val'), mapInput('min'), mapInput('max')];
            if (node.type === 'PROGRESS') return [mapInput('val'), mapInput('max')];
            if (node.type === 'RANGE') return [mapInput('start'), mapInput('end'), mapInput('step')];

            // Default linear mapping for nodes without named inputs
            return connectedEdges.map(e => {
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                return resolveSourceValue(raw, e.sourceHandle);
            });
        };

        const inputVals = getInputs();
        
        let val = 0;
        try {
            switch(node.type) {
                case 'INPUT': val = node.data.value; break;
                case 'SUM': val = inputVals.reduce((a,b)=>a+b,0); break;
                case 'SUB': val = inputVals.length > 0 ? inputVals.reduce((a,b)=>a-b) : 0; break;
                case 'MUL': val = inputVals.reduce((a,b)=>a*b,1); break;
                case 'CUSTOM': 
                    const fn = new Function('inputs', node.data.func || 'return 0');
                    val = fn(inputVals);
                    break;
                case 'TEMPLATE': 
                    const template = node.data.template || '{0}';
                    val = template.replace(/{(\\d+)}/g, (m, i) => inputVals[i] !== undefined ? (typeof inputVals[i]==='number'?inputVals[i].toFixed(2):inputVals[i]) : m);
                    break;
                case 'RANGE':
                    const start = inputVals[0] ?? 0;
                    const end = inputVals[1] ?? 10;
                    const step = inputVals[2] ?? 1;
                    const len = Math.max(0, Math.floor((end - start) / step) + 1);
                    val = Array.from({length: len}, (_, i) => start + (i * step));
                    break;
                case 'COLLECTOR':
                    val = inputVals;
                    break;
                case 'FINAL':
                case 'GROUP_OUTPUT':
                case 'GAUGE':
                case 'PROGRESS':
                case 'LINE_CHART':
                case 'BAR_CHART':
                case 'TABLE':
                    val = inputVals.length > 0 ? inputVals[0] : 0;
                    break;
                case 'GROUP':
                    const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                    const subContext = {};
                    connectedEdges.forEach((edge) => {
                        const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle);
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
                    break;
                default: val = 0;
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
    const results = {};
    const memo = new Set();

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN;
        if (results[nodeId] !== undefined) return results[nodeId];

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;

        if (node.type === 'GROUP_INPUT') {
            return contextInputs[node.id] !== undefined ? contextInputs[node.id] : (node.data.value || 0);
        }

        const connectedEdges = edges.filter(e => e.target === node.id);

        const resolveSourceValue = (rawVal, handle) => {
            if (typeof rawVal === 'object' && rawVal !== null && handle) {
                return rawVal[handle] ?? 0;
            }
            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
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
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                return resolveSourceValue(raw, edge.sourceHandle);
            };

            if (node.type === 'COLLECTOR') {
                const arr = new Array(node.data.inputCount || 2).fill(0);
                connectedEdges.forEach(e => {
                    const idx = parseInt(e.targetHandle?.split('_')[1] || '0', 10);
                    if (!isNaN(idx)) {
                        const raw = getNodeValue(e.source, [...stack, nodeId]);
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle);
                    }
                });
                return arr;
            }

            if (node.type === 'GAUGE') return [mapInput('val'), mapInput('min'), mapInput('max')];
            if (node.type === 'PROGRESS') return [mapInput('val'), mapInput('max')];
            if (node.type === 'RANGE') return [mapInput('start'), mapInput('end'), mapInput('step')];

            // Default linear mapping for nodes without named inputs
            return connectedEdges.map(e => {
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                return resolveSourceValue(raw, e.sourceHandle);
            });
        };

        const inputVals = getInputs();

        let val = 0;
        try {
            switch (node.type) {
                case 'INPUT': val = node.data.value; break;
                case 'SUM': val = inputVals.reduce((a, b) => a + b, 0); break;
                case 'SUB': val = inputVals.length > 0 ? inputVals.reduce((a, b) => a - b) : 0; break;
                case 'MUL': val = inputVals.reduce((a, b) => a * b, 1); break;
                case 'CUSTOM':
                    const fn = new Function('inputs', node.data.func || 'return 0');
                    val = fn(inputVals);
                    break;
                case 'TEMPLATE':
                    const template = node.data.template || '{0}';
                    val = template.replace(/{(\d+)}/g, (m, i) => inputVals[i] !== undefined ? (typeof inputVals[i] === 'number' ? inputVals[i].toFixed(2) : inputVals[i]) : m);
                    break;
                case 'RANGE':
                    const start = inputVals[0] ?? 0;
                    const end = inputVals[1] ?? 10;
                    const step = inputVals[2] ?? 1;
                    const len = Math.max(0, Math.floor((end - start) / step) + 1);
                    val = Array.from({ length: len }, (_, i) => start + (i * step));
                    break;
                case 'COLLECTOR':
                    val = inputVals;
                    break;
                case 'FINAL':
                case 'GROUP_OUTPUT':
                case 'GAUGE':
                case 'PROGRESS':
                case 'LINE_CHART':
                case 'BAR_CHART':
                case 'TABLE':
                    val = inputVals.length > 0 ? inputVals[0] : 0;
                    break;
                case 'GROUP':
                    const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                    const subContext = {};
                    connectedEdges.forEach((edge) => {
                        const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle);
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
                    break;
                default: val = 0;
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
