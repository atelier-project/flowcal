
export const TYPES = {
    ANY: 'any',
    STRING: 'string',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    ARRAY: 'array',
    OBJECT: 'object',
    DATE: 'date'
};

/**
 * Checks if two types are compatible.
 * @param {string|object} sourceType - The type of the output (provider). Can be string ('number') or object ({ type: 'array', itemType: 'number' })
 * @param {string|object} targetType - The type of the input (receiver).
 * @param {boolean} strictMode - If true, enforces strict typing.
 * @returns {boolean}
 */
export const areTypesCompatible = (sourceType, targetType, strictMode = false) => {
    // Normalize inputs to objects if they are strings
    const source = typeof sourceType === 'string' ? { type: sourceType } : (sourceType || { type: TYPES.ANY });
    const target = typeof targetType === 'string' ? { type: targetType } : (targetType || { type: TYPES.ANY });

    // 1. If strict mode is OFF, 'any' is a wildcard for everything
    if (!strictMode) {
        if (source.type === TYPES.ANY || target.type === TYPES.ANY) return true;
    } else {
        // In strict mode, 'any' can only connect to 'any' (or we could be slightly more lenient, but let's be strict for now)
        // Actually, typically 'any' source should satisfy specific target, but specific source shouldn't satisfy 'any' target without cast?
        // Let's stick to simple strict equality for now, unless one is explicit wildcard.
        if (target.type === TYPES.ANY) return true; // Accepting 'any' input usually means "I handle anything"
        if (source.type === TYPES.ANY) return false; // In strict mode, un-typed output shouldn't flow into typed input safely
    }

    // 2. Base Type mismatch
    if (source.type !== target.type) {
        // Coercion allowances (Non-Strict only)
        if (!strictMode) {
            // Number -> String (safe)
            if (source.type === TYPES.NUMBER && target.type === TYPES.STRING) return true;
            // Boolean -> String (safe)
            if (source.type === TYPES.BOOLEAN && target.type === TYPES.STRING) return true;
            // Boolean -> Number (0/1)
            if (source.type === TYPES.BOOLEAN && target.type === TYPES.NUMBER) return true;
        }
        return false;
    }

    // 3. Complex Type Check (Array input matching)
    if (source.type === TYPES.ARRAY) {
        // If target doesn't specify itemType, it accepts any array
        if (!target.itemType) return true;
        // If source doesn't specify itemType (generic array), we assume compat (or fail in strict?)
        // Let's say generic array satisfies specific array in non-strict.
        if (!source.itemType) return !strictMode;

        // Recursive check for item types
        return areTypesCompatible(source.itemType, target.itemType, strictMode);
    }

    return true;
};

/**
 * Validates a value against a type definition at runtime.
 * @param {any} value 
 * @param {string|object} typeDef 
 * @returns {boolean}
 */
export const validateValue = (value, typeDef) => {
    const type = typeof typeDef === 'string' ? { type: typeDef } : (typeDef || { type: TYPES.ANY });

    if (type.type === TYPES.ANY) return true;
    if (value === undefined || value === null) return true; // Allow nullable for now?

    switch (type.type) {
        case TYPES.STRING: return typeof value === 'string';
        case TYPES.NUMBER: return typeof value === 'number' && !isNaN(value);
        case TYPES.BOOLEAN: return typeof value === 'boolean';
        case TYPES.OBJECT: return typeof value === 'object' && !Array.isArray(value);
        case TYPES.DATE: return value instanceof Date || !isNaN(Date.parse(value));
        case TYPES.ARRAY:
            if (!Array.isArray(value)) return false;
            if (type.itemType) {
                return value.every(item => validateValue(item, type.itemType));
            }
            return true;
        default: return true;
    }
};
