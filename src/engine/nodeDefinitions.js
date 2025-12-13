/**
 * Node Logic Registry
 * Pure JavaScript definitions for node computation and metadata.
 */

export const NODE_LOGIC = {
    // Data Sources
    INPUT: {
        type: 'INPUT',
        label: 'Number Input',
        category: 'Data',
        inputs: [],
        outputs: ['value'],
        compute: (inputs, data) => data.value,
        data: { value: 0 }
    },
    RANGE: {
        type: 'RANGE',
        label: 'Range Generator',
        category: 'Data',
        inputs: ['start', 'end', 'step'],
        computesMulti: true, // Marker that it needs robust mapping in evaluator
        compute: ({ start, end, step }) => {
            const s = start ?? 0;
            const e = end ?? 10;
            const st = step ?? 1;
            const len = Math.max(0, Math.floor((e - s) / st) + 1);
            return Array.from({ length: len }, (_, i) => s + (i * st));
        }
    },
    COLLECTOR: {
        type: 'COLLECTOR',
        label: 'Array Collector',
        category: 'Data',
        dynamicInputs: true,
        compute: (inputs) => Array.isArray(inputs) ? inputs : []
    },

    // Math
    SUM: {
        type: 'SUM',
        label: 'Sum',
        category: 'Math',
        inputs: ['*'], // Variable inputs
        compute: (inputs) => inputs.reduce((a, b) => a + b, 0)
    },
    SUB: {
        type: 'SUB',
        label: 'Subtract',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => inputs.length > 0 ? inputs.reduce((a, b) => a - b) : 0
    },
    MUL: {
        type: 'MUL',
        label: 'Multiply',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => inputs.reduce((a, b) => a * b, 1)
    },
    CUSTOM: {
        type: 'CUSTOM',
        label: 'Custom JS',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs, data) => {
            const fn = new Function('inputs', data.func || 'return 0');
            return fn(inputs);
        },
        data: { func: 'return inputs.reduce((a,b) => a+b, 0);' }
    },

    // Visuals (Result is just pass-through usually)
    GAUGE: {
        type: 'GAUGE',
        label: 'Gauge',
        category: 'Visuals',
        inputs: ['val', 'min', 'max'],
        compute: ({ val }) => val ?? 0
    },
    PROGRESS: {
        type: 'PROGRESS',
        label: 'Progress Bar',
        category: 'Visuals',
        inputs: ['val', 'max'],
        compute: ({ val }) => val ?? 0
    },
    LINE_CHART: {
        type: 'LINE_CHART',
        label: 'Line Chart',
        category: 'Visuals',
        inputs: ['data'],
        compute: ({ data }) => Array.isArray(data) && data.length > 0 ? data[0] : 0
    },
    BAR_CHART: {
        type: 'BAR_CHART',
        label: 'Bar Chart',
        category: 'Visuals',
        inputs: ['data'],
        compute: ({ data }) => Array.isArray(data) && data.length > 0 ? data[0] : 0
    },
    TABLE: {
        type: 'TABLE',
        label: 'Data Table',
        category: 'Visuals',
        inputs: ['data'],
        compute: ({ data }) => Array.isArray(data) && data.length > 0 ? data[0] : 0
    },
    TEMPLATE: {
        type: 'TEMPLATE',
        label: 'Text Template',
        category: 'Visuals',
        inputs: ['*'],
        compute: (inputs, data) => {
            const template = data.template || '{0}';
            return template.replace(/{(\d+)}/g, (m, i) => inputs[i] !== undefined ? (typeof inputs[i] === 'number' ? inputs[i].toFixed(2) : inputs[i]) : m);
        },
        data: { template: 'Total: {0}' }
    },
    FINAL: {
        type: 'FINAL',
        label: 'Final Result',
        category: 'Visuals',
        inputs: ['val'],
        compute: (inputs) => inputs.length > 0 ? inputs[0] : 0
    },

    // Advanced & Grouping
    GROUP: {
        type: 'GROUP',
        label: 'Group Logic',
        category: 'Advanced',
        compute: () => 0 // Special handling in evaluator
    },
    GROUP_INPUT: {
        type: 'GROUP_INPUT',
        label: 'Group Input',
        category: 'Advanced',
        compute: (inputs, data) => data.value || 0
    },
    GROUP_OUTPUT: {
        type: 'GROUP_OUTPUT',
        label: 'Group Output',
        category: 'Advanced',
        compute: (inputs) => inputs.length > 0 ? inputs[0] : 0
    }
};

export const getDefinition = (type) => NODE_LOGIC[type] || {};
