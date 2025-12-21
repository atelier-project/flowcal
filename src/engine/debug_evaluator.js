
const NODE_LOGIC = {
    INPUT: {
        type: 'INPUT',
        compute: (inputs, data) => data.value,
        data: { value: 0 }
    },
    GROUP: {
        type: 'GROUP',
        compute: () => 0
    },
    GROUP_INPUT_LIST: {
        type: 'GROUP_INPUT_LIST',
        compute: (inputs, data) => Array.isArray(data.value) ? data.value : [],
        data: { value: [] }
    },
    GROUP_OUTPUT: {
        type: 'GROUP_OUTPUT',
        compute: (inputs) => inputs.length > 0 ? inputs[0] : 0,
    }
};

function evaluateGraph(nodes, edges, contextInputs = {}) {
    const results = {};

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN;
        if (results[nodeId] !== undefined) return results[nodeId];

        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;

        const def = NODE_LOGIC[node.type] || {};

        if (contextInputs[node.id] !== undefined) {
            const val = contextInputs[node.id];
            results[nodeId] = val;
            return val;
        }

        const connectedEdges = edges.filter(e => e.target === node.id);

        const resolveSourceValue = (rawVal, handle, sourceType, targetType) => {
            // Simplified for this test case
            if (sourceType === 'INPUT') return rawVal;
            return rawVal;
        };

        const getInputs = () => {
            // Simplified input mapping
            return connectedEdges.map(e => {
                const sourceNode = nodes.find(n => n.id === e.source);
                return resolveSourceValue(getNodeValue(e.source, [...stack, nodeId]), e.sourceHandle, sourceNode?.type, node.type);
            });
        };

        let val = 0;
        if (node.type === 'GROUP') {
            const subGraph = node.data.subGraph || { nodes: [], edges: [] };
            const subContext = {};

            connectedEdges.forEach((edge) => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const rawVal = getNodeValue(edge.source, [...stack, nodeId]);
                const sourceVal = resolveSourceValue(rawVal, edge.sourceHandle, sourceNode?.type);

                if (edge.targetHandle) {
                    const targetNode = subGraph.nodes.find(n => n.id === edge.targetHandle);

                    // THIS IS THE LOGIC WE ADDED
                    if (targetNode && targetNode.type === 'GROUP_INPUT_LIST') {
                        if (!subContext[edge.targetHandle]) subContext[edge.targetHandle] = [];
                        subContext[edge.targetHandle].push(sourceVal);
                    } else {
                        subContext[edge.targetHandle] = sourceVal;
                    }
                }
            });

            // Log subContext to debug
            console.log('SubContext for Group:', JSON.stringify(subContext, null, 2));

            const subResults = evaluateGraph(subGraph.nodes, subGraph.edges, subContext);
            const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT');
            if (outputs.length > 0) {
                val = {};
                outputs.forEach(out => { val[out.id] = subResults[out.id]; });
            }
        } else if (def.compute) {
            val = def.compute(getInputs(), node.data || {});
        }

        results[nodeId] = val;
        return val;
    };

    nodes.forEach(n => getNodeValue(n.id));
    return results;
}

// Test Case
const nodes = [
    { id: 'n1', type: 'INPUT', data: { value: 5 } },
    { id: 'n2', type: 'INPUT', data: { value: 10 } },
    {
        id: 'g1',
        type: 'GROUP',
        data: {
            subGraph: {
                nodes: [
                    { id: 'gi1', type: 'GROUP_INPUT_LIST', data: { value: [] } },
                    { id: 'go1', type: 'GROUP_OUTPUT', data: {} }
                ],
                edges: [
                    { id: 'e_internal', source: 'gi1', target: 'go1' }
                ]
            }
        }
    }
];

const edges = [
    { id: 'e1', source: 'n1', target: 'g1', targetHandle: 'gi1' },
    { id: 'e2', source: 'n2', target: 'g1', targetHandle: 'gi1' }
];

console.log('Running evaluation...');
const res = evaluateGraph(nodes, edges);
console.log('Result:', JSON.stringify(res, null, 2));
