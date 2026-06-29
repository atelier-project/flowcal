import { describe, test, expect } from 'vitest';
import { evaluateGraph } from './evaluator';

/**
 * Evaluator Unit Tests
 * 
 * These tests cover the core evaluation logic and value resolution edge cases
 * that have caused bugs in the past. Run with `npm test`.
 */

// Helper to create a minimal node
const createNode = (id, type, data = {}) => ({
    id,
    type,
    data,
    position: { x: 0, y: 0 }
});

// Helper to create an edge
const createEdge = (source, target, sourceHandle = null, targetHandle = null) => ({
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle,
    targetHandle
});

describe('evaluateGraph - Basic Operations', () => {
    test('INPUT node returns its value', () => {
        const nodes = [createNode('input1', 'INPUT', { value: 42 })];
        const edges = [];

        const results = evaluateGraph(nodes, edges);

        expect(results['input1']).toBe(42);
    });

    test('SUM node adds two inputs', () => {
        const nodes = [
            createNode('a', 'INPUT', { value: 3 }),
            createNode('b', 'INPUT', { value: 5 }),
            createNode('sum', 'SUM', { inputCount: 2 })
        ];
        const edges = [
            createEdge('a', 'sum', null, 'in_0'),
            createEdge('b', 'sum', null, 'in_1')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['sum']).toBe(8);
    });

    test('MUL node multiplies two inputs', () => {
        const nodes = [
            createNode('a', 'INPUT', { value: 4 }),
            createNode('b', 'INPUT', { value: 7 }),
            createNode('mult', 'MUL', {})
        ];
        const edges = [
            createEdge('a', 'mult'),
            createEdge('b', 'mult')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['mult']).toBe(28);
    });
});

describe('evaluateGraph - FORM and Object Handling', () => {
    test('FORM node creates object from fields', () => {
        const nodes = [
            createNode('form1', 'FORM', {
                fields: [
                    { key: 'name', value: 'test' },
                    { key: 'count', value: 5 }
                ]
            })
        ];
        const edges = [];

        const results = evaluateGraph(nodes, edges);

        expect(results['form1']).toEqual({ name: 'test', count: 5 });
    });

    test('GET_KEY extracts value from object', () => {
        const nodes = [
            createNode('form1', 'FORM', {
                fields: [
                    { key: 'x', value: 10 },
                    { key: 'y', value: 20 }
                ]
            }),
            createNode('get', 'GET_KEY', { key: 'y' })
        ];
        const edges = [
            createEdge('form1', 'get')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['get']).toBe(20);
    });

    test('FORM values are passed through without unwrapping', () => {
        const nodes = [
            createNode('form1', 'FORM', {
                fields: [
                    { key: 'a', value: 1 },
                    { key: 'b', value: 2 }
                ]
            }),
            createNode('get_a', 'GET_KEY', { key: 'a' }),
            createNode('get_b', 'GET_KEY', { key: 'b' })
        ];
        const edges = [
            createEdge('form1', 'get_a'),
            createEdge('form1', 'get_b')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['get_a']).toBe(1);
        expect(results['get_b']).toBe(2);
    });
});

describe('evaluateGraph - GROUP Nodes', () => {
    test('GROUP with pass-through returns correct value', () => {
        const groupOutputId = 'group_out_1';
        const nodes = [
            createNode('input1', 'INPUT', { value: 100 }),
            createNode('group1', 'GROUP', {
                subGraph: {
                    nodes: [
                        createNode('group_in', 'GROUP_INPUT', {}),
                        createNode(groupOutputId, 'GROUP_OUTPUT', {})
                    ],
                    edges: [
                        createEdge('group_in', groupOutputId)
                    ]
                }
            }),
            createNode('final', 'SUM', { inputCount: 1 })
        ];
        const edges = [
            createEdge('input1', 'group1', null, 'group_in'),
            createEdge('group1', 'final', groupOutputId, 'in_0')
        ];

        const results = evaluateGraph(nodes, edges);

        // GROUP output should be unwrapped, not { [groupOutputId]: 100 }
        expect(results['final']).toBe(100);
    });

    test('GROUP output is unwrapped when connected to downstream node', () => {
        const groupOutputId = 'output_node';
        const nodes = [
            createNode('input1', 'INPUT', { value: 42 }),
            createNode('group1', 'GROUP', {
                subGraph: {
                    nodes: [
                        createNode('g_in', 'GROUP_INPUT', {}),
                        createNode(groupOutputId, 'GROUP_OUTPUT', {})
                    ],
                    edges: [
                        createEdge('g_in', groupOutputId)
                    ]
                }
            }),
            createNode('multiply', 'MUL', {})
        ];
        const edges = [
            createEdge('input1', 'group1', null, 'g_in'),
            createEdge('group1', 'multiply', groupOutputId),
            createEdge('input1', 'multiply')
        ];

        const results = evaluateGraph(nodes, edges);

        // 42 * 42 = 1764 (GROUP should unwrap properly)
        expect(results['multiply']).toBe(1764);
    });

    test('GROUP output is resolvable by its label as well as its node id', () => {
        const outId = 'go_internal_id';
        const nodes = [
            createNode('input1', 'INPUT', { value: 7 }),
            createNode('group1', 'GROUP', {
                subGraph: {
                    nodes: [
                        createNode('g_in', 'GROUP_INPUT', {}),
                        createNode(outId, 'GROUP_OUTPUT', { label: 'efficiency' })
                    ],
                    edges: [createEdge('g_in', outId)]
                }
            }),
            createNode('final', 'SUM', { inputCount: 1 })
        ];
        // External edge references the GROUP_OUTPUT by its LABEL, not its node id.
        const edges = [
            createEdge('input1', 'group1', null, 'g_in'),
            createEdge('group1', 'final', 'efficiency', 'in_0')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['final']).toBe(7);
    });
});

describe('evaluateGraph - SELECT Node', () => {
    test('outputs the selected option value, coercing numeric strings', () => {
        const nodes = [createNode('sel', 'SELECT', {
            value: '8',
            options: [{ label: 'Small', value: '2' }, { label: 'Large', value: '8' }],
        })];
        expect(evaluateGraph(nodes, [])['sel']).toBe(8);
    });

    test('keeps non-numeric values as strings', () => {
        const nodes = [createNode('sel', 'SELECT', {
            value: 'prod',
            options: [{ label: 'Dev', value: 'dev' }, { label: 'Prod', value: 'prod' }],
        })];
        expect(evaluateGraph(nodes, [])['sel']).toBe('prod');
    });

    test('falls back to the first option when the stored value is not valid', () => {
        const nodes = [createNode('sel', 'SELECT', {
            value: 'gone',
            options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }],
        })];
        expect(evaluateGraph(nodes, [])['sel']).toBe('a');
    });
});

describe('evaluateGraph - LOOKUP Node', () => {
    const lookupNode = (id, data) => createNode(id, 'LOOKUP', data);

    test('exact match returns the mapped value (string label)', () => {
        const nodes = [
            createNode('in', 'INPUT', { value: 8 }),
            lookupNode('lk', {
                mode: 'exact',
                cases: [
                    { key: '2', value: 'e2-standard-2' },
                    { key: '8', value: 'e2-standard-8' },
                    { key: '16', value: 'e2-standard-16' }
                ],
                default: 'unknown'
            })
        ];
        const edges = [createEdge('in', 'lk', null, 'key')];

        const results = evaluateGraph(nodes, edges);

        expect(results['lk']).toBe('e2-standard-8');
    });

    test('exact match falls back to default when no case matches', () => {
        const nodes = [
            createNode('in', 'INPUT', { value: 5 }),
            lookupNode('lk', {
                mode: 'exact',
                cases: [{ key: '2', value: 'a' }, { key: '8', value: 'b' }],
                default: 'none'
            })
        ];
        const edges = [createEdge('in', 'lk', null, 'key')];

        expect(evaluateGraph(nodes, edges)['lk']).toBe('none');
    });

    test('round-up mode selects the smallest threshold >= input', () => {
        const nodes = [
            createNode('in', 'INPUT', { value: 5 }),
            lookupNode('lk', {
                mode: 'up',
                cases: [
                    { key: '2', value: 'e2-standard-2' },
                    { key: '4', value: 'e2-standard-4' },
                    { key: '8', value: 'e2-standard-8' }
                ]
            })
        ];
        const edges = [createEdge('in', 'lk', null, 'key')];

        // 5 rounds up to the 8 tier
        expect(evaluateGraph(nodes, edges)['lk']).toBe('e2-standard-8');
    });

    test('round-down mode selects the largest threshold <= input', () => {
        const nodes = [
            createNode('in', 'INPUT', { value: 5 }),
            lookupNode('lk', {
                mode: 'down',
                cases: [{ key: '2', value: 'a' }, { key: '4', value: 'b' }, { key: '8', value: 'c' }]
            })
        ];
        const edges = [createEdge('in', 'lk', null, 'key')];

        // 5 rounds down to the 4 tier
        expect(evaluateGraph(nodes, edges)['lk']).toBe('b');
    });

    test('numeric-looking values are coerced to numbers', () => {
        const nodes = [
            createNode('in', 'INPUT', { value: 2 }),
            lookupNode('lk', { mode: 'exact', cases: [{ key: '2', value: '42' }] })
        ];
        const edges = [createEdge('in', 'lk', null, 'key')];

        expect(evaluateGraph(nodes, edges)['lk']).toBe(42);
    });
});

describe('evaluateGraph - MAP Iterator', () => {
    test('MAP transforms array elements', () => {
        const nodes = [
            createNode('array', 'COLLECTOR', { inputCount: 3 }),
            createNode('n1', 'INPUT', { value: 1 }),
            createNode('n2', 'INPUT', { value: 2 }),
            createNode('n3', 'INPUT', { value: 3 }),
            createNode('map1', 'MAP', {
                subGraph: {
                    nodes: [
                        createNode('item', 'MAP_ITEM', {}),
                        createNode('double', 'MUL', {}),
                        createNode('two', 'INPUT', { value: 2 }),
                        createNode('out', 'MAP_OUTPUT', {})
                    ],
                    edges: [
                        createEdge('item', 'double'),
                        createEdge('two', 'double'),
                        createEdge('double', 'out')
                    ]
                }
            })
        ];
        const edges = [
            createEdge('n1', 'array', null, 'in_0'),
            createEdge('n2', 'array', null, 'in_1'),
            createEdge('n3', 'array', null, 'in_2'),
            createEdge('array', 'map1')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['map1']).toEqual([2, 4, 6]);
    });

    test('MAP passes objects through without unwrapping', () => {
        const nodes = [
            createNode('form1', 'FORM', {
                fields: [{ key: 'value', value: 10 }]
            }),
            createNode('collect', 'COLLECTOR', { inputCount: 1 }),
            createNode('map1', 'MAP', {
                subGraph: {
                    nodes: [
                        createNode('item', 'MAP_ITEM', {}),
                        createNode('get', 'GET_KEY', { key: 'value' }),
                        createNode('out', 'MAP_OUTPUT', {})
                    ],
                    edges: [
                        createEdge('item', 'get'),
                        createEdge('get', 'out')
                    ]
                }
            })
        ];
        const edges = [
            createEdge('form1', 'collect', null, 'in_0'),
            createEdge('collect', 'map1')
        ];

        const results = evaluateGraph(nodes, edges);

        // MAP should extract 'value' from each object
        expect(results['map1']).toEqual([10]);
    });
});

describe('evaluateGraph - REDUCE Iterator', () => {
    test('REDUCE sums array with initial value 0', () => {
        const nodes = [
            createNode('array', 'COLLECTOR', { inputCount: 4 }),
            createNode('n1', 'INPUT', { value: 1 }),
            createNode('n2', 'INPUT', { value: 2 }),
            createNode('n3', 'INPUT', { value: 3 }),
            createNode('n4', 'INPUT', { value: 4 }),
            createNode('reduce1', 'REDUCE', {
                initialValue: 0,
                subGraph: {
                    nodes: [
                        createNode('item', 'REDUCE_ITEM', {}),
                        createNode('acc', 'REDUCE_ACCUMULATOR', {}),
                        createNode('sum', 'SUM', { inputCount: 2 }),
                        createNode('out', 'REDUCE_OUTPUT', {})
                    ],
                    edges: [
                        createEdge('acc', 'sum', null, 'in_0'),
                        createEdge('item', 'sum', null, 'in_1'),
                        createEdge('sum', 'out')
                    ]
                }
            })
        ];
        const edges = [
            createEdge('n1', 'array', null, 'in_0'),
            createEdge('n2', 'array', null, 'in_1'),
            createEdge('n3', 'array', null, 'in_2'),
            createEdge('n4', 'array', null, 'in_3'),
            createEdge('array', 'reduce1')
        ];

        const results = evaluateGraph(nodes, edges);

        // 0 + 1 + 2 + 3 + 4 = 10
        expect(results['reduce1']).toBe(10);
    });

    test('REDUCE with non-zero initial value', () => {
        const nodes = [
            createNode('array', 'COLLECTOR', { inputCount: 2 }),
            createNode('n1', 'INPUT', { value: 5 }),
            createNode('n2', 'INPUT', { value: 5 }),
            createNode('reduce1', 'REDUCE', {
                initialValue: 100,
                subGraph: {
                    nodes: [
                        createNode('item', 'REDUCE_ITEM', {}),
                        createNode('acc', 'REDUCE_ACCUMULATOR', {}),
                        createNode('sum', 'SUM', { inputCount: 2 }),
                        createNode('out', 'REDUCE_OUTPUT', {})
                    ],
                    edges: [
                        createEdge('acc', 'sum', null, 'in_0'),
                        createEdge('item', 'sum', null, 'in_1'),
                        createEdge('sum', 'out')
                    ]
                }
            })
        ];
        const edges = [
            createEdge('n1', 'array', null, 'in_0'),
            createEdge('n2', 'array', null, 'in_1'),
            createEdge('array', 'reduce1')
        ];

        const results = evaluateGraph(nodes, edges);

        // 100 + 5 + 5 = 110
        expect(results['reduce1']).toBe(110);
    });
});

describe('evaluateGraph - FILTER Iterator', () => {
    test('FILTER keeps items where condition is true', () => {
        const nodes = [
            createNode('array', 'COLLECTOR', { inputCount: 4 }),
            createNode('n1', 'INPUT', { value: 1 }),
            createNode('n2', 'INPUT', { value: 5 }),
            createNode('n3', 'INPUT', { value: 2 }),
            createNode('n4', 'INPUT', { value: 8 }),
            createNode('filter1', 'FILTER', {
                subGraph: {
                    nodes: [
                        createNode('item', 'FILTER_ITEM', {}),
                        createNode('threshold', 'INPUT', { value: 3 }),
                        createNode('compare', 'COMPARE', { operator: '>' }),
                        createNode('include', 'FILTER_INCLUDE', {})
                    ],
                    edges: [
                        createEdge('item', 'compare', null, 'a'),
                        createEdge('threshold', 'compare', null, 'b'),
                        createEdge('compare', 'include')
                    ]
                }
            })
        ];
        const edges = [
            createEdge('n1', 'array', null, 'in_0'),
            createEdge('n2', 'array', null, 'in_1'),
            createEdge('n3', 'array', null, 'in_2'),
            createEdge('n4', 'array', null, 'in_3'),
            createEdge('array', 'filter1')
        ];

        const results = evaluateGraph(nodes, edges);

        // Only 5 and 8 are > 3
        expect(results['filter1']).toEqual([5, 8]);
    });
});

describe('evaluateGraph - UNPACK Node', () => {
    test('UNPACK extracts specified keys', () => {
        const nodes = [
            createNode('form1', 'FORM', {
                fields: [
                    { key: 'a', value: 1 },
                    { key: 'b', value: 2 },
                    { key: 'c', value: 3 }
                ]
            }),
            createNode('unpack1', 'UNPACK', { keys: ['a', 'c'] }),
            createNode('sum', 'SUM', { inputCount: 2 })
        ];
        const edges = [
            createEdge('form1', 'unpack1'),
            createEdge('unpack1', 'sum', 'a', 'in_0'),
            createEdge('unpack1', 'sum', 'c', 'in_1')
        ];

        const results = evaluateGraph(nodes, edges);

        // 1 + 3 = 4
        expect(results['sum']).toBe(4);
    });

    test('UNPACK with dot notation for nested values', () => {
        const nodes = [
            createNode('form1', 'FORM', {
                fields: [
                    { key: 'nested', value: { inner: 42 } }
                ]
            }),
            createNode('unpack1', 'UNPACK', { keys: ['nested.inner'] }),
            createNode('final', 'SUM', { inputCount: 1 })
        ];
        const edges = [
            createEdge('form1', 'unpack1'),
            createEdge('unpack1', 'final', 'nested.inner', 'in_0')
        ];

        const results = evaluateGraph(nodes, edges);

        expect(results['final']).toBe(42);
    });
});

describe('evaluateGraph - Context Inputs', () => {
    test('Context inputs override node values', () => {
        const nodes = [
            createNode('item', 'MAP_ITEM', { value: 0 }),
            createNode('double', 'MUL', {}),
            createNode('two', 'INPUT', { value: 2 })
        ];
        const edges = [
            createEdge('item', 'double'),
            createEdge('two', 'double')
        ];

        // Simulate iterator context providing item value
        const contextInputs = { 'item': 5 };
        const results = evaluateGraph(nodes, edges, contextInputs);

        // 5 * 2 = 10 (context overrides the default 0)
        expect(results['double']).toBe(10);
    });
});
