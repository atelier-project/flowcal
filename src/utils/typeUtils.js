/**
 * Type Utilities for Group Input/Output Interface Definitions
 * Supports TypeScript-like interface syntax for type checking.
 */

// Colors for different base types
export const TYPE_COLORS = {
    any: '#94a3b8',      // slate
    number: '#3b82f6',   // blue
    string: '#10b981',   // emerald
    boolean: '#f59e0b',  // amber
    array: '#8b5cf6',    // violet
    object: '#ec4899',   // pink
    unknown: '#ef4444',  // red (for errors/warnings)
};

/**
 * Parse a type definition string that may contain interfaces and type references.
 * 
 * Supports:
 * - Primitives: number, string, boolean, any
 * - Arrays: number[], string[], MyType[]
 * - Interfaces: interface MyObject { prop: type, ... }
 * - Type references with interfaces defined inline
 * 
 * @param {string} text - Full type definition text
 * @returns {{ interfaces: Object, inputType: string|null }}
 */
export function parseTypeDef(text) {
    if (!text || typeof text !== 'string') {
        return { interfaces: {}, inputType: 'any' };
    }

    const trimmed = text.trim();

    // If it's just a simple type (no interface keyword)
    if (!trimmed.includes('interface')) {
        // Check for input: syntax
        const inputMatch = trimmed.match(/^(?:input\s*:\s*)?(.+)$/i);
        if (inputMatch) {
            return { interfaces: {}, inputType: inputMatch[1].trim() };
        }
        return { interfaces: {}, inputType: trimmed };
    }

    const interfaces = {};
    let inputType = 'any';

    // Parse interface definitions
    // Match: interface Name { ... }
    const interfaceRegex = /interface\s+(\w+)\s*\{([^}]*)\}/g;
    let match;
    while ((match = interfaceRegex.exec(trimmed)) !== null) {
        const name = match[1];
        const body = match[2];
        const props = parseInterfaceBody(body);
        interfaces[name] = { type: 'interface', name, properties: props };
    }

    // Parse input type declaration
    // Match: input: TypeName or input: TypeName[]
    const inputMatch = trimmed.match(/input\s*:\s*(\w+(?:\[\])?)/i);
    if (inputMatch) {
        inputType = inputMatch[1].trim();
    } else {
        // If no explicit input, and we have interfaces, use the first one
        const interfaceNames = Object.keys(interfaces);
        if (interfaceNames.length > 0) {
            inputType = interfaceNames[0];
        }
    }

    return { interfaces, inputType };
}

/**
 * Parse the body of an interface definition.
 * @param {string} body - Contents between { and }
 * @returns {Object} - Map of property names to types
 */
function parseInterfaceBody(body) {
    const props = {};
    // Split by comma or newline, handle both formats
    const parts = body.split(/[,\n]/).map(p => p.trim()).filter(p => p);

    for (const part of parts) {
        // Match: propName: type or propName?: type
        const propMatch = part.match(/^(\w+)\??:\s*(.+)$/);
        if (propMatch) {
            props[propMatch[1]] = propMatch[2].trim();
        }
    }
    return props;
}

/**
 * Get the base type from a type string (stripping array notation)
 * @param {string} typeStr 
 * @returns {string}
 */
export function getBaseType(typeStr) {
    if (!typeStr) return 'any';
    const cleaned = typeStr.trim();
    if (cleaned.endsWith('[]')) {
        return 'array';
    }
    const lower = cleaned.toLowerCase();
    if (['number', 'string', 'boolean', 'any', 'array', 'object'].includes(lower)) {
        return lower;
    }
    // Custom type (interface reference)
    return 'object';
}

/**
 * Check if two types are compatible.
 * 'any' is compatible with everything.
 * Arrays are compatible if their element types are compatible.
 * Objects/interfaces are compatible with objects.
 * 
 * @param {string} sourceType - The type being connected from
 * @param {string} targetType - The type being connected to
 * @param {Object} sourceInterfaces - Interfaces defined in source context
 * @param {Object} targetInterfaces - Interfaces defined in target context
 * @returns {boolean}
 */
export function isTypeCompatible(sourceType, targetType, sourceInterfaces = {}, targetInterfaces = {}) {
    if (!sourceType || !targetType) return true;

    const src = sourceType.trim().toLowerCase();
    const tgt = targetType.trim().toLowerCase();

    // 'any' is always compatible
    if (src === 'any' || tgt === 'any') return true;

    // Exact match (case-insensitive)
    if (src === tgt) return true;

    // Array compatibility
    const srcIsArray = src.endsWith('[]');
    const tgtIsArray = tgt.endsWith('[]');

    if (srcIsArray && tgtIsArray) {
        // Check element type compatibility
        const srcElem = src.slice(0, -2);
        const tgtElem = tgt.slice(0, -2);
        return isTypeCompatible(srcElem, tgtElem, sourceInterfaces, targetInterfaces);
    }

    if (srcIsArray !== tgtIsArray) {
        // One is array, one is not - incompatible
        return false;
    }

    // For strict type checking:
    // - Primitives (number, string, boolean) must match exactly (handled above)
    // - Custom types (MyObject, etc.) must match exactly (handled above)
    // - Generic 'object' only matches 'object', not custom types
    // If we get here, types don't match exactly and aren't 'any'
    return false;
}

/**
 * Get a short display name for a type (for badges).
 * @param {string} typeDef - Full type definition text
 * @returns {string}
 */
export function getTypeDisplayName(typeDef) {
    if (!typeDef || typeDef === 'any') return 'any';

    const { inputType } = parseTypeDef(typeDef);
    if (!inputType || inputType === 'any') return 'any';

    // Shorten long type names for display
    if (inputType.length > 12) {
        return inputType.substring(0, 10) + '..';
    }
    return inputType;
}

/**
 * Get the color for a type.
 * @param {string} typeDef 
 * @returns {string}
 */
export function getTypeColor(typeDef) {
    const baseType = getBaseType(typeDef);
    return TYPE_COLORS[baseType] || TYPE_COLORS.unknown;
}

/**
 * Get output type for built-in node types.
 * @param {string} nodeType 
 * @returns {string}
 */
export function getNodeOutputType(nodeType) {
    const typeMap = {
        'INPUT': 'number',
        'TEXT_INPUT': 'string',
        'DATE_INPUT': 'number',
        'RANGE': 'number[]',
        'COLLECTOR': 'array',
        'FORM': 'object',
        'COMPARE': 'number',
        'IF': 'any',
        'STRING_CONCAT': 'string',
        'STRING_SPLIT': 'string[]',
        'STRING_REPLACE': 'string',
        'STRING_UPPER': 'string',
        'STRING_LOWER': 'string',
        'STRING_LENGTH': 'number',
        'STRING_TRIM': 'string',
        'STRING_SUBSTRING': 'string',
        'DATE_NOW': 'number',
        'DATE_FORMAT': 'string',
        'DATE_PARSE': 'number',
        'DATE_DIFF': 'number',
        'GET': 'any',
        'GET_KEY': 'any',
        'LENGTH': 'number',
        'SLICE': 'array',
        'SORT': 'array',
        'FILTER': 'array',
        'ARRAY_FLATTEN': 'array',
        'OBJECT_COMBINE': 'object',
        'OBJECT_FLATTEN': 'object',
        'OBJECT_KEYS': 'string[]',
        'OBJECT_VALUES': 'array',
        'UNPACK': 'object',
        'PACK': 'object',
        'SUM': 'number',
        'SUB': 'number',
        'MUL': 'number',
        'DIV': 'number',
        'MIN': 'number',
        'MAX': 'number',
        'ROUND': 'number',
        'FLOOR': 'number',
        'CEIL': 'number',
        'RANDOM': 'number',
        'CUSTOM': 'any',
        'TEMPLATE': 'string',
        'WARP_OUT': 'any',
        'FUNCTION': 'any',
    };
    return typeMap[nodeType] || 'any';
}

/**
 * Validate if FORM node fields match the declared type definition.
 * @param {Array} fields - FORM fields array with {key, value} objects
 * @param {string} typeDef - Type definition string
 * @returns {{ valid: boolean, message: string|null }}
 */
export function validateFormFields(fields = [], typeDef) {
    if (!typeDef || typeDef === 'any') {
        return { valid: true, message: null };
    }

    const { interfaces, inputType } = parseTypeDef(typeDef);

    // If it's a simple type (not an interface), we can't validate structure
    if (!interfaces[inputType]) {
        return { valid: true, message: null };
    }

    const interfaceDef = interfaces[inputType];
    const expectedProps = interfaceDef.properties || {};
    const expectedKeys = Object.keys(expectedProps);
    const actualKeys = fields.map(f => f.key).filter(k => k && k.trim());

    // Check for missing properties
    const missing = expectedKeys.filter(key => !actualKeys.includes(key));
    if (missing.length > 0) {
        return {
            valid: false,
            message: `Missing fields: ${missing.join(', ')}`
        };
    }

    // Check for extra properties
    const extra = actualKeys.filter(key => !expectedKeys.includes(key));
    if (extra.length > 0) {
        return {
            valid: false,
            message: `Unexpected fields: ${extra.join(', ')}`
        };
    }

    return { valid: true, message: null };
}
