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
    TEXT_INPUT: {
        type: 'TEXT_INPUT',
        label: 'Text Input',
        category: 'Data',
        inputs: [],
        outputs: ['text'],
        compute: (inputs, data) => data.text ?? '',
        data: { text: '' }
    },
    DATE_INPUT: {
        type: 'DATE_INPUT',
        label: 'Date Input',
        category: 'Data',
        inputs: [],
        outputs: ['timestamp'],
        compute: (inputs, data) => {
            // Returns timestamp in milliseconds
            const dateStr = data.date || '';
            if (!dateStr) return Date.now();
            const parsed = Date.parse(dateStr);
            return isNaN(parsed) ? Date.now() : parsed;
        },
        data: { date: '' }
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

    // String
    STRING_CONCAT: {
        type: 'STRING_CONCAT',
        label: 'Concat Strings',
        category: 'String',
        inputs: ['*'],
        compute: (inputs) => inputs.map(i => String(i ?? '')).join('')
    },
    STRING_SPLIT: {
        type: 'STRING_SPLIT',
        label: 'Split String',
        category: 'String',
        inputs: ['text', 'delimiter'],
        computesMulti: true,
        compute: ({ text, delimiter }, data) => {
            const str = String(text ?? '');
            const delim = delimiter !== undefined ? String(delimiter) : (data.delimiter || ',');
            return str.split(delim);
        },
        data: { delimiter: ',' }
    },
    STRING_REPLACE: {
        type: 'STRING_REPLACE',
        label: 'Replace',
        category: 'String',
        inputs: ['text', 'find', 'replace'],
        compute: ({ text, find, replace }, data) => {
            const str = String(text ?? '');
            const f = find !== undefined ? String(find) : (data.find || '');
            const r = replace !== undefined ? String(replace) : (data.replace || '');
            return str.replaceAll(f, r);
        },
        data: { find: '', replace: '' }
    },
    STRING_UPPER: {
        type: 'STRING_UPPER',
        label: 'Uppercase',
        category: 'String',
        inputs: ['text'],
        compute: ({ text }) => String(text ?? '').toUpperCase()
    },
    STRING_LOWER: {
        type: 'STRING_LOWER',
        label: 'Lowercase',
        category: 'String',
        inputs: ['text'],
        compute: ({ text }) => String(text ?? '').toLowerCase()
    },
    STRING_LENGTH: {
        type: 'STRING_LENGTH',
        label: 'String Length',
        category: 'String',
        inputs: ['text'],
        compute: ({ text }) => String(text ?? '').length
    },
    STRING_TRIM: {
        type: 'STRING_TRIM',
        label: 'Trim',
        category: 'String',
        inputs: ['text'],
        compute: ({ text }) => String(text ?? '').trim()
    },
    STRING_SUBSTRING: {
        type: 'STRING_SUBSTRING',
        label: 'Substring',
        category: 'String',
        inputs: ['text', 'start', 'end'],
        compute: ({ text, start, end }) => {
            const str = String(text ?? '');
            const s = start ?? 0;
            const e = end ?? str.length;
            return str.substring(s, e);
        }
    },

    // Date & Time
    DATE_NOW: {
        type: 'DATE_NOW',
        label: 'Now',
        category: 'Date',
        inputs: [],
        compute: () => Date.now()
    },
    DATE_FORMAT: {
        type: 'DATE_FORMAT',
        label: 'Format Date',
        category: 'Date',
        inputs: ['timestamp'],
        compute: ({ timestamp }, data) => {
            const ts = timestamp ?? Date.now();
            const date = new Date(ts);
            const format = data.format || 'iso';
            switch (format) {
                case 'iso': return date.toISOString();
                case 'date': return date.toLocaleDateString();
                case 'time': return date.toLocaleTimeString();
                case 'datetime': return date.toLocaleString();
                case 'unix': return Math.floor(ts / 1000);
                default: return date.toISOString();
            }
        },
        data: { format: 'iso' }
    },
    DATE_PARSE: {
        type: 'DATE_PARSE',
        label: 'Parse Date',
        category: 'Date',
        inputs: ['text'],
        compute: ({ text }) => {
            const parsed = Date.parse(String(text ?? ''));
            return isNaN(parsed) ? 0 : parsed;
        }
    },
    DATE_DIFF: {
        type: 'DATE_DIFF',
        label: 'Date Diff',
        category: 'Date',
        inputs: ['date1', 'date2'],
        compute: ({ date1, date2 }, data) => {
            const d1 = date1 ?? Date.now();
            const d2 = date2 ?? Date.now();
            const diffMs = Math.abs(d1 - d2);
            const unit = data.unit || 'ms';
            switch (unit) {
                case 'ms': return diffMs;
                case 'seconds': return diffMs / 1000;
                case 'minutes': return diffMs / 60000;
                case 'hours': return diffMs / 3600000;
                case 'days': return diffMs / 86400000;
                default: return diffMs;
            }
        },
        data: { unit: 'days' }
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
        category: 'Object',
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
        category: 'Object',
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
        category: 'Object',
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
    FLOOR: {
        type: 'FLOOR',
        label: 'Floor',
        category: 'Math',
        inputs: ['val'],
        compute: ({ val }) => Math.floor(val ?? 0)
    },
    CEIL: {
        type: 'CEIL',
        label: 'Ceil',
        category: 'Math',
        inputs: ['val'],
        compute: ({ val }) => Math.ceil(val ?? 0)
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
        category: 'Advanced',
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
        compute: (inputs) => inputs.length > 0 ? inputs[0] : 0,
        data: { width: 200 }
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
