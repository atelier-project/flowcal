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
        data: { value: 0, min: 0, max: 100, step: 1, useSlider: false }
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
    FORM: {
        type: 'FORM',
        label: 'Form / Object',
        category: 'Data',
        dynamicInputs: true,
        compute: (inputs, data) => {
            const fields = data.fields || [];
            const result = {};
            fields.forEach((field, i) => {
                // If input is connected, use it. Otherwise use default value.
                // Inputs are passed as an array matching the order of dynamic inputs.
                // Note: The evaluator passes `node.inputs` array. We need to ensure mapping is correct.
                // Our dynamic inputs logic relies on index. 
                result[field.key || `field_${i}`] = inputs[i] !== undefined ? inputs[i] : (field.value ?? 0);
            });
            return result;
        },
        data: { fields: [], showInputs: false } // Array of { key: 'name', value: 0 }
    },

    // Logic
    COMPARE: {
        type: 'COMPARE',
        label: 'Compare',
        category: 'Logic',
        inputs: ['a', 'b'],
        compute: ({ a, b }, data) => {
            const op = data.operator || '>';
            a = a ?? 0; b = b ?? 0;
            switch (op) {
                case '>': return a > b ? 1 : 0;
                case '<': return a < b ? 1 : 0;
                case '>=': return a >= b ? 1 : 0;
                case '<=': return a <= b ? 1 : 0;
                case '==': return a == b ? 1 : 0;
                case '!=': return a != b ? 1 : 0;
                default: return 0;
            }
        },
        data: { operator: '>' }
    },
    IF: {
        type: 'IF',
        label: 'If / Else',
        category: 'Logic',
        inputs: ['condition', 'trueVal', 'falseVal'],
        compute: ({ condition, trueVal, falseVal }) => {
            return (condition && condition !== 0) ? (trueVal ?? 0) : (falseVal ?? 0);
        }
    },

    // Array
    GET: {
        type: 'GET',
        label: 'Get Item',
        category: 'Array',
        inputs: ['array', 'index'],
        compute: ({ array, index }, data) => {
            const arr = Array.isArray(array) ? array : [];
            const idx = index !== undefined ? index : (data.index ?? 0);
            return arr[idx] ?? 0;
        },
        data: { index: 0 }
    },
    GET_KEY: {
        type: 'GET_KEY',
        label: 'Get Value',
        category: 'Logic',
        inputs: ['object'],
        compute: ({ object }, data) => {
            const obj = (typeof object === 'object' && object !== null) ? object : {};
            const k = data.key || '';
            return obj[k] ?? 0;
        },
        data: { key: '' }
    },
    LENGTH: {
        type: 'LENGTH',
        label: 'Length',
        category: 'Array',
        inputs: ['array'],
        compute: ({ array }) => Array.isArray(array) ? array.length : 0
    },
    SLICE: {
        type: 'SLICE',
        label: 'Slice',
        category: 'Array',
        inputs: ['array', 'start', 'end'],
        computesMulti: true, // Output is an array
        compute: ({ array, start, end }) => {
            const arr = Array.isArray(array) ? array : [];
            const s = start ?? 0;
            const e = end ?? arr.length;
            return arr.slice(s, e);
        }
    },
    SORT: {
        type: 'SORT',
        label: 'Sort',
        category: 'Array',
        inputs: ['array'],
        computesMulti: true,
        compute: ({ array }, data) => {
            const arr = Array.isArray(array) ? [...array] : [];
            const order = data.order || 'asc';
            return arr.sort((a, b) => order === 'asc' ? a - b : b - a);
        },
        data: { order: 'asc' }
    },
    FILTER: {
        type: 'FILTER',
        label: 'Filter',
        category: 'Array',
        inputs: ['array', 'reference'],
        computesMulti: true,
        compute: ({ array, reference }, data) => {
            const arr = Array.isArray(array) ? array : [];
            const ref = reference ?? 0;
            const op = data.operator || '>';
            return arr.filter(item => {
                switch (op) {
                    case '>': return item > ref;
                    case '<': return item < ref;
                    case '>=': return item >= ref;
                    case '<=': return item <= ref;
                    case '==': return item == ref;
                    case '!=': return item != ref;
                    default: return false;
                }
            });
        },
        data: { operator: '>' }
    },
    ARRAY_FLATTEN: {
        type: 'ARRAY_FLATTEN',
        label: 'Flatten Arrays',
        category: 'Array',
        inputs: ['*'],
        computesMulti: true,
        compute: (inputs) => {
            // Takes multiple arrays and flattens them into a single array
            return inputs.flat(Infinity);
        }
    },
    OBJECT_COMBINE: {
        type: 'OBJECT_COMBINE',
        label: 'Combine Objects',
        category: 'Logic',
        inputs: ['*'],
        compute: (inputs) => {
            // Merges multiple objects into one (later objects override earlier)
            return inputs.reduce((acc, obj) => {
                if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
                    return { ...acc, ...obj };
                }
                return acc;
            }, {});
        }
    },
    OBJECT_FLATTEN: {
        type: 'OBJECT_FLATTEN',
        label: 'Flatten Object',
        category: 'Logic',
        inputs: ['object'],
        compute: ({ object }) => {
            // Flattens nested object with dot notation keys
            const flatten = (obj, prefix = '') => {
                const result = {};
                for (const [key, val] of Object.entries(obj || {})) {
                    const newKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                        Object.assign(result, flatten(val, newKey));
                    } else {
                        result[newKey] = val;
                    }
                }
                return result;
            };
            return flatten(typeof object === 'object' && object !== null ? object : {});
        }
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
    DIV: {
        type: 'DIV',
        label: 'Divide',
        category: 'Math',
        inputs: ['a', 'b'],
        compute: ({ a, b }) => {
            const num = a ?? 0;
            const den = b ?? 1; // Prevent division by zero default
            return den === 0 ? 0 : num / den;
        }
    },
    MIN: {
        type: 'MIN',
        label: 'Min',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => inputs.length > 0 ? Math.min(...inputs) : 0
    },
    MAX: {
        type: 'MAX',
        label: 'Max',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => inputs.length > 0 ? Math.max(...inputs) : 0
    },
    ROUND: {
        type: 'ROUND',
        label: 'Round',
        category: 'Math',
        inputs: ['val', 'decimals'],
        compute: ({ val, decimals }) => {
            const v = val ?? 0;
            const d = decimals ?? 0;
            const factor = Math.pow(10, Math.floor(d));
            return Math.round(v * factor) / factor;
        }
    },
    RANDOM: {
        type: 'RANDOM',
        label: 'Random',
        category: 'Math',
        inputs: ['min', 'max'],
        compute: ({ min, max }) => {
            const mn = min ?? 0;
            const mx = max ?? 1;
            return Math.random() * (mx - mn) + mn;
        }
    },
    CUSTOM: {
        type: 'CUSTOM',
        label: 'Custom JS',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs, data) => {
            try {
                const fn = new Function('inputs', data.func || 'return 0');
                return fn(inputs);
            } catch (e) {
                return `Error: ${e.message}`;
            }
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
