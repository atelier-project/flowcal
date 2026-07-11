import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { validateFormFields } from '../../../../utils/typeUtils';

/**
 * StructuredNodeBody — bodies that edit structured data: key/value field lists
 * and key arrays. These need the field/key mutation helpers from Node.jsx
 * (addFormField/updateFormField/removeFormField/moveKey) in addition to
 * data/handleChange/canEdit.
 *
 * Handles: FORM, UNPACK, PACK, REDUCE
 */
export const StructuredNodeBody = ({
    type,
    data,
    inputs,
    handleChange,
    canEdit,
    moveKey,
    addFormField,
    updateFormField,
    removeFormField,
}) => {
    if (type === 'FORM') {
        return (
            <div className="flex flex-col gap-2">
                {/* Type validation warning */}
                {data.typeDef && data.typeDef !== 'any' && (() => {
                    const validation = validateFormFields(data.fields || [], data.typeDef);
                    if (!validation.valid) {
                        return (
                            <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                                <span className="text-amber-600 dark:text-amber-400 shrink-0">⚠️</span>
                                <div className="flex-1">
                                    <div className="font-semibold text-amber-800 dark:text-amber-300">Type Mismatch</div>
                                    <div className="text-amber-700 dark:text-amber-400 mt-0.5">{validation.message}</div>
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}

                {(data.fields || []).map((field, i) => (
                    <div key={i} className="flex items-center gap-1 group/field">
                        {/* Input Handle spacer */}
                        {data.showInputs && <div className="w-3" />}
                        <input
                            className="shrink-0 min-w-16 max-w-24 text-xs font-bold text-slate-600 dark:text-slate-300 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none px-1 disabled:opacity-50"
                            value={field.key}
                            onChange={(e) => updateFormField(i, 'key', e.target.value)}
                            placeholder="Key"
                            onMouseDown={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <span className="text-slate-300 dark:text-slate-600 shrink-0">:</span>
                        <input
                            className="flex-1 min-w-12 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-[2px] focus:border-blue-500 focus:outline-none dark:text-slate-300 disabled:opacity-50"
                            value={field.value}
                            onChange={(e) => updateFormField(i, 'value', e.target.value)} // String input allowed
                            placeholder="Value"
                            onMouseDown={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <button disabled={!canEdit} onClick={(e) => { e.stopPropagation(); removeFormField(i); }} className="opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:hidden shrink-0">
                            <Trash2 size={12} />
                        </button>
                    </div>
                ))}
                <button
                    onClick={(e) => { e.stopPropagation(); addFormField(); }}
                    disabled={!canEdit}
                    className={`text-xs flex items-center justify-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-700 border-dashed transition-colors ${!canEdit ? 'hidden' : ''}`}
                >
                    <Plus size={12} /> Add Field
                </button>
            </div>
        );
    }

    if (type === 'UNPACK') {
        return (
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Keys to Extract</label>
                {(data.keys || []).map((key, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                                const newKeys = [...(data.keys || [])];
                                newKeys[i] = e.target.value;
                                handleChange('keys', newKeys);
                            }}
                            placeholder="key name"
                            className="flex-1 h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-violet-500"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        <div className="flex flex-col">
                            <button
                                onClick={(e) => { e.stopPropagation(); moveKey(i, 'up'); }}
                                disabled={i === 0}
                                className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <ArrowUp size={10} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); moveKey(i, 'down'); }}
                                disabled={i === (data.keys || []).length - 1}
                                className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <ArrowDown size={10} />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                const newKeys = (data.keys || []).filter((_, idx) => idx !== i);
                                handleChange('keys', newKeys);
                            }}
                            className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm"
                            title="Remove key"
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newKeys = [...(data.keys || []), ''];
                        handleChange('keys', newKeys);
                    }}
                    className="w-full mt-1 py-1 text-xs text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                    + Add Key
                </button>

                {/* Show input object preview */}
                {inputs.object && typeof inputs.object === 'object' && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400">Available keys: </span>
                        <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400">
                            {Object.keys(inputs.object).join(', ')}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    if (type === 'PACK') {
        return (
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Keys to Create</label>
                {(data.keys || []).map((key, i) => (
                    <div key={i} className="flex items-center gap-1">
                        <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                                const newKeys = [...(data.keys || [])];
                                newKeys[i] = e.target.value;
                                handleChange('keys', newKeys);
                            }}
                            placeholder="key name"
                            className="flex-1 h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-violet-500"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        <div className="flex flex-col">
                            <button
                                onClick={(e) => { e.stopPropagation(); moveKey(i, 'up'); }}
                                disabled={i === 0}
                                className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <ArrowUp size={10} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); moveKey(i, 'down'); }}
                                disabled={i === (data.keys || []).length - 1}
                                className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                            >
                                <ArrowDown size={10} />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                const newKeys = (data.keys || []).filter((_, idx) => idx !== i);
                                handleChange('keys', newKeys);
                            }}
                            className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm"
                            title="Remove key"
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newKeys = [...(data.keys || []), ''];
                        handleChange('keys', newKeys);
                    }}
                    className="w-full mt-1 py-1 text-xs text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20"
                >
                    + Add Key
                </button>
            </div>
        );
    }

    if (type === 'REDUCE') {
        return (
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Initial Value</label>
                <input
                    type="text"
                    value={data.initialValue ?? 0}
                    onChange={(e) => {
                        const val = e.target.value;
                        // Try to parse as number, otherwise keep as string
                        const parsed = parseFloat(val);
                        handleChange('initialValue', isNaN(parsed) ? val : parsed);
                    }}
                    placeholder="0"
                    className="w-full h-8 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono focus:outline-none focus:border-cyan-500"
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!canEdit}
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Enter inside to add: Current Item, Accumulator, and New Accumulator nodes
                </p>
            </div>
        );
    }

    return null;
};

StructuredNodeBody.handlesType = (type) => ['FORM', 'UNPACK', 'PACK', 'REDUCE'].includes(type);
