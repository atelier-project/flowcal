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
        data: { value: 0, min: 0, max: 100, step: 1, useSlider: false, displayFormat: 'number', precision: null, displayUnit: '' }
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
    SELECT: {
        type: 'SELECT',
        label: 'Select',
        category: 'Data',
        inputs: [],
        outputs: ['value'],
        compute: (inputs, data) => {
            const opts = Array.isArray(data.options) ? data.options : [];
            let v = data.value;
            // Fall back to the first option if the stored selection isn't valid.
            if (opts.length > 0 && !opts.some(o => String(o.value) === String(v))) v = opts[0].value;
            // Coerce numeric-looking values to numbers; keep label strings as-is.
            if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
            return v ?? '';
        },
        data: { options: [{ label: 'Option A', value: 'a' }, { label: 'Option B', value: 'b' }], value: 'a', display: 'dropdown' }
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
                let val = inputs[i] !== undefined ? inputs[i] : (field.value ?? 0);

                // Auto-convert internal string values to numbers if they look like numbers
                // This fixes the issue where UI text inputs save numbers as strings
                if (inputs[i] === undefined && typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) {
                    val = Number(val);
                }

                result[field.key || `field_${i}`] = val;
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
    LOOKUP: {
        type: 'LOOKUP',
        label: 'Lookup / Switch',
        category: 'Logic',
        inputs: ['key'],
        outputs: ['value'],
        compute: ({ key }, data) => {
            const cases = Array.isArray(data.cases) ? data.cases : [];
            const mode = data.mode || 'exact';

            // Coerce numeric-looking strings to numbers so "8" and 8 match,
            // while preserving label strings like "e2-standard-8".
            const coerce = (v) => {
                if (typeof v !== 'string') return v;
                const trimmed = v.trim();
                if (trimmed === '') return v;
                const n = Number(trimmed);
                return Number.isNaN(n) ? v : n;
            };

            const hasDefault = data.default !== undefined && data.default !== '';
            const fallback = hasDefault ? coerce(data.default) : 0;
            if (cases.length === 0) return fallback;

            if (mode === 'exact') {
                const hit = cases.find(c => String(c.key) === String(key) || coerce(c.key) === coerce(key));
                return hit ? coerce(hit.value) : fallback;
            }

            // Threshold modes operate on numeric keys.
            const num = Number(key);
            if (Number.isNaN(num)) return fallback;
            const sorted = cases
                .map(c => ({ k: Number(c.key), value: c.value }))
                .filter(c => !Number.isNaN(c.k))
                .sort((a, b) => a.k - b.k);
            if (sorted.length === 0) return fallback;

            if (mode === 'up') {
                // Smallest threshold >= key (round up, e.g. size-up to next tier).
                const hit = sorted.find(c => c.k >= num);
                return coerce(hit ? hit.value : sorted[sorted.length - 1].value);
            }
            // mode === 'down': largest threshold <= key (round down).
            let chosen = sorted[0];
            for (const c of sorted) { if (c.k <= num) chosen = c; }
            return coerce(chosen.value);
        },
        data: { cases: [], default: '', mode: 'exact' }
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

    // Data Sources - Globals
    GET_GLOBAL: {
        type: 'GET_GLOBAL',
        label: 'Get Global',
        category: 'Data',
        inputs: [],
        outputs: ['value'],
        compute: () => null, // Value is resolved by evaluator's GET_GLOBAL special case
        data: { key: '' }
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
            const k = data.key || '';
            // Support Array "Pluck" / "Map"
            if (Array.isArray(object)) {
                return object.map(item => {
                    const obj = (typeof item === 'object' && item !== null) ? item : {};
                    return obj[k] ?? 0;
                });
            }
            // Standard single object get
            const obj = (typeof object === 'object' && object !== null) ? object : {};
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
    OBJECT_KEYS: {
        type: 'OBJECT_KEYS',
        label: 'Get Keys',
        category: 'Object',
        inputs: ['object'],
        computesMulti: true,
        compute: ({ object }) => {
            if (typeof object === 'object' && object !== null && !Array.isArray(object)) {
                return Object.keys(object);
            }
            return [];
        }
    },
    OBJECT_VALUES: {
        type: 'OBJECT_VALUES',
        label: 'Get Values',
        category: 'Object',
        inputs: ['object'],
        computesMulti: true,
        compute: ({ object }) => {
            if (typeof object === 'object' && object !== null && !Array.isArray(object)) {
                return Object.values(object);
            }
            return [];
        }
    },
    UNPACK: {
        type: 'UNPACK',
        label: 'Unpack Object',
        category: 'Object',
        inputs: ['object'],
        dynamicOutputs: true, // Outputs based on keys array
        computesMultiOutput: true,
        compute: (inputs, data) => {
            const obj = inputs.object;
            const keys = data.keys || [];
            const results = {};

            // Helper to traverse object path using dot notation
            const getNestedValue = (object, path) => {
                if (typeof object !== 'object' || object === null) return null;
                const parts = path.split('.');
                let current = object;
                for (const part of parts) {
                    if (current === null || current === undefined) return null;
                    if (typeof current !== 'object') return null;
                    current = current[part];
                }
                return current !== undefined ? current : null;
            };

            keys.forEach(key => {
                // Support dot notation for nested paths
                results[key] = getNestedValue(obj, key);
            });
            return results;
        },
        data: { keys: [] }
    },
    PACK: {
        type: 'PACK',
        label: 'Pack Object',
        category: 'Object',
        dynamicInputs: true, // Inputs are dynamically generated based on keys
        outputs: ['object'],
        compute: (inputs, data) => {
            // The evaluator already builds inputs as {key1: value1, key2: value2}
            // We just return it directly
            return inputs;
        },
        data: { keys: [] }
    },

    SUM: {
        type: 'SUM',
        label: 'Sum',
        category: 'Math',
        inputs: ['*'], // Variable inputs
        compute: (inputs) => inputs.flat(Infinity).reduce((a, b) => a + b, 0)
    },
    SUB: {
        type: 'SUB',
        label: 'Subtract',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => {
            const flat = inputs.flat(Infinity);
            return flat.length > 0 ? flat.reduce((a, b) => a - b) : 0;
        }
    },
    MUL: {
        type: 'MUL',
        label: 'Multiply',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => inputs.flat(Infinity).reduce((a, b) => a * b, 1)
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
        compute: (inputs) => {
            const flat = inputs.flat(Infinity);
            return flat.length > 0 ? Math.min(...flat) : 0;
        }
    },
    MAX: {
        type: 'MAX',
        label: 'Max',
        category: 'Math',
        inputs: ['*'],
        compute: (inputs) => {
            const flat = inputs.flat(Infinity);
            return flat.length > 0 ? Math.max(...flat) : 0;
        }
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
                // Security: Shadow global objects to prevent access
                // Note: This is not a perfect sandbox, but prevents accidental access and basic malicious attempts
                const fn = new Function(
                    'inputs',
                    'window',
                    'document',
                    'fetch',
                    'XMLHttpRequest',
                    'localStorage',
                    'sessionStorage',
                    'globalThis',
                    `"use strict"; ${data.func || 'return 0'}`
                );
                // Call with undefined for all shadowed globals
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
        outputs: ['text'],
        compute: (inputs, data) => {
            let template = data.template || '{0}';
            // Replace placeholders with input values
            template = template.replace(/{(\d+)}/g, (m, i) => inputs[i] !== undefined ? (typeof inputs[i] === 'number' ? inputs[i].toFixed(2) : inputs[i]) : m);
            // Convert literal \n to actual newlines
            template = template.replace(/\\n/g, '\n');
            return template;
        },
        data: { template: 'Total: {0}' }
    },
    FINAL: {
        type: 'FINAL',
        label: 'Final Result',
        category: 'Visuals',
        inputs: ['val'],
        compute: (inputs) => inputs.length > 0 ? inputs[0] : 0,
        data: { width: 200, unit: '', decimals: null }
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
        compute: (inputs, data) => data.value || 0,
        data: { label: '', description: '', typeDef: 'any' }
    },
    GROUP_INPUT_LIST: {
        type: 'GROUP_INPUT_LIST',
        label: 'Group List Input',
        category: 'Advanced',
        inputs: [],
        outputs: ['value'],
        compute: (inputs, data) => Array.isArray(data.value) ? data.value : [],
        data: { label: '', description: '', typeDef: 'any', value: [] }
    },
    GROUP_OUTPUT: {
        type: 'GROUP_OUTPUT',
        label: 'Group Output',
        category: 'Advanced',
        inputs: ['val'],
        compute: ({ val }) => val ?? 0,
        data: { label: '', description: '', typeDef: 'any' }
    },
    GROUP_OUTPUT_LIST: {
        type: 'GROUP_OUTPUT_LIST',
        label: 'Group List Output',
        category: 'Advanced',
        inputs: ['*'],
        outputs: ['value'],
        compute: (inputs) => Array.isArray(inputs) ? inputs : [],
        data: { label: '', description: '', typeDef: 'any', value: [] }
    },
    WARP_IN: {
        type: 'WARP_IN',
        label: 'Warp In',
        category: 'Advanced',
        inputs: ['val'],
        outputs: [], // No physical output wire
        compute: ({ val }) => val ?? 0,
        data: { tag: 'A' }
    },
    WARP_OUT: {
        type: 'WARP_OUT',
        label: 'Warp Out',
        category: 'Advanced',
        inputs: [],
        outputs: ['value'],
        compute: () => 0, // Handled by evaluator
        data: { tag: 'A' }
    },
    COMMENT: {
        type: 'COMMENT',
        label: 'Comment',
        category: 'Advanced',
        inputs: [],
        outputs: [], // No outputs for comments
        compute: () => null,
        data: { text: 'Add your notes here...', width: 256, height: 120, color: '#fef3c7' }
    },
    TEXT_LABEL: {
        type: 'TEXT_LABEL',
        label: 'Text Label',
        category: 'Advanced',
        inputs: [],
        outputs: [],
        compute: () => null,
        data: {
            text: 'Label',
            fontSize: 36,
            fontFamily: 'Inter',
            color: 'auto', // Special value that adapts to theme
            fontWeight: 'normal',
            textAlign: 'left'
        }
    },
    FRAME: {
        type: 'FRAME',
        label: 'Frame',
        category: 'Advanced',
        inputs: [],
        outputs: [],
        compute: () => null,
        data: { title: '', width: 300, height: 200, color: '#3b82f6', lineStyle: 'solid' }
    },
    FUNCTION: {
        type: 'FUNCTION',
        label: 'Function',
        category: 'Advanced',
        dynamicInputs: true,
        outputs: ['result'],
        compute: (inputs, data) => {
            const params = data.params || [];
            const code = data.code || 'return 0';

            // Build parameter object from inputs array
            const paramValues = {};
            params.forEach((param, i) => {
                paramValues[param.name || `p${i}`] = inputs[i] ?? param.default ?? 0;
            });

            try {
                // Create function with named parameters
                // Security: Shadow global objects to prevent access (same as CUSTOM node)
                const paramNames = params.map(p => p.name || `p${params.indexOf(p)}`);
                const fn = new Function(
                    ...paramNames,
                    'window',
                    'document',
                    'fetch',
                    'XMLHttpRequest',
                    'localStorage',
                    'sessionStorage',
                    'globalThis',
                    `"use strict"; ${code}`
                );
                // Call with undefined for all shadowed globals
                const result = fn(...paramNames.map(name => paramValues[name]));
                return result;
            } catch (e) {
                return `Error: ${e.message}`;
            }
        },
        data: {
            params: [], // Array of { name: 'x', default: 0 }
            code: 'return 0'
        }
    },

    // --- Iterator Nodes ---
    MAP: {
        type: 'MAP',
        label: 'Map',
        category: 'Iterator',
        inputs: ['array'],
        outputs: ['results'],
        hasSubGraph: true,
        compute: () => [], // Handled specially in evaluator
        data: { subGraph: { nodes: [], edges: [] } }
    },
    FILTER: {
        type: 'FILTER',
        label: 'Filter',
        category: 'Iterator',
        inputs: ['array'],
        outputs: ['results'],
        hasSubGraph: true,
        compute: () => [], // Handled specially in evaluator
        data: { subGraph: { nodes: [], edges: [] } }
    },
    REDUCE: {
        type: 'REDUCE',
        label: 'Reduce',
        category: 'Iterator',
        inputs: ['array'],
        outputs: ['result'],
        hasSubGraph: true,
        compute: () => 0, // Handled specially in evaluator
        data: { subGraph: { nodes: [], edges: [] }, initialValue: 0 }
    },

    // --- Iterator Context Nodes (only valid inside iterator subGraphs) ---
    MAP_ITEM: {
        type: 'MAP_ITEM',
        label: 'MAP: Current Item',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['item'],
        compute: (inputs, data) => data.value ?? null,
        data: { value: null },
        iteratorContext: 'MAP'
    },
    MAP_INDEX: {
        type: 'MAP_INDEX',
        label: 'MAP: Current Index',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['index'],
        compute: (inputs, data) => data.value ?? 0,
        data: { value: 0 },
        iteratorContext: 'MAP'
    },
    MAP_OUTPUT: {
        type: 'MAP_OUTPUT',
        label: 'MAP: Output',
        category: 'Iterator Context',
        inputs: ['value'],
        outputs: [],
        compute: (inputs) => inputs.value ?? inputs[0] ?? null,
        data: {},
        iteratorContext: 'MAP'
    },
    FILTER_ITEM: {
        type: 'FILTER_ITEM',
        label: 'FILTER: Current Item',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['item'],
        compute: (inputs, data) => data.value ?? null,
        data: { value: null },
        iteratorContext: 'FILTER'
    },
    FILTER_INDEX: {
        type: 'FILTER_INDEX',
        label: 'FILTER: Current Index',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['index'],
        compute: (inputs, data) => data.value ?? 0,
        data: { value: 0 },
        iteratorContext: 'FILTER'
    },
    FILTER_INCLUDE: {
        type: 'FILTER_INCLUDE',
        label: 'FILTER: Include?',
        category: 'Iterator Context',
        inputs: ['condition'],
        outputs: [],
        compute: (inputs) => Boolean(inputs.condition ?? inputs[0] ?? false),
        data: {},
        iteratorContext: 'FILTER'
    },
    REDUCE_ITEM: {
        type: 'REDUCE_ITEM',
        label: 'REDUCE: Current Item',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['item'],
        compute: (inputs, data) => data.value ?? null,
        data: { value: null },
        iteratorContext: 'REDUCE'
    },
    REDUCE_INDEX: {
        type: 'REDUCE_INDEX',
        label: 'REDUCE: Current Index',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['index'],
        compute: (inputs, data) => data.value ?? 0,
        data: { value: 0 },
        iteratorContext: 'REDUCE'
    },
    REDUCE_ACCUMULATOR: {
        type: 'REDUCE_ACCUMULATOR',
        label: 'REDUCE: Accumulator',
        category: 'Iterator Context',
        inputs: [],
        outputs: ['value'],
        compute: (inputs, data) => data.value ?? 0,
        data: { value: 0 },
        iteratorContext: 'REDUCE'
    },
    REDUCE_OUTPUT: {
        type: 'REDUCE_OUTPUT',
        label: 'REDUCE: New Accumulator',
        category: 'Iterator Context',
        inputs: ['value'],
        outputs: [],
        compute: (inputs) => inputs.value ?? inputs[0] ?? 0,
        data: {},
        iteratorContext: 'REDUCE'
    },

    // ── Atelier topology nodes ─────────────────────────────────────────────────
    // Display-only nodes generated by GET /api/topology in atelier-core.
    // Not intended for manual wiring — load via "Import flow" from a topology export.

    ATELIER_INGRESS: {
        type: 'ATELIER_INGRESS',
        label: 'Ingress',
        category: 'Atelier',
        inputs: [],
        outputs: ['service'],
        compute: (inputs, data) => ({
            name: data.name,
            host: data.host,
            path: data.path,
            app: data.app,
        }),
        data: { name: '', host: '', path: '/', app: '', status: '' }
    },

    ATELIER_SERVICE: {
        type: 'ATELIER_SERVICE',
        label: 'Service',
        category: 'Atelier',
        inputs: ['from_ingress'],
        outputs: ['pods'],
        compute: (inputs, data) => ({
            name: data.name,
            port: data.port,
            app: data.app,
        }),
        data: { name: '', port: 80, app: '', status: '' }
    },

    ATELIER_DEPLOYMENT: {
        type: 'ATELIER_DEPLOYMENT',
        label: 'Deployment',
        category: 'Atelier',
        inputs: ['from_service'],
        outputs: [],
        compute: (inputs, data) => ({
            name: data.name,
            ready: data.ready,
            image: data.image,
            app: data.app,
        }),
        data: { name: '', ready: '0/0', image: '', app: '', status: '' }
    }
};

export const getDefinition = (type) => NODE_LOGIC[type] || {};
