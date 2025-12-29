import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Type, Zap, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

/**
 * Sliding modal for defining type interfaces on GROUP_INPUT/GROUP_OUTPUT nodes.
 * Supports TypeScript-like interface syntax.
 * Uses React Portal to render outside the transformed canvas.
 */
export const TypeDefinitionModal = ({ isOpen, onClose, currentType, onSave, nodeLabel, nodeType }) => {
    const [typeDef, setTypeDef] = useState('');
    const [showHelp, setShowHelp] = useState(false);

    // Determine if this is a list input node (requires array types)
    const isListInput = nodeType === 'GROUP_INPUT_LIST';
    // Determine if this is a list output node (outputs array types)
    const isListOutput = nodeType === 'GROUP_OUTPUT_LIST';

    // Define presets based on node type
    const presets = useMemo(() => {
        if (isListInput || isListOutput) {
            // GROUP_INPUT_LIST/GROUP_OUTPUT_LIST: only array types
            return ['any', 'number[]', 'string[]', 'object[]', 'array-of-objects'];
        } else {
            // GROUP_INPUT or GROUP_OUTPUT: only non-array types (single values)
            return ['any', 'number', 'string', 'boolean', 'object'];
        }
    }, [isListInput, isListOutput]);

    // Check if current type is valid for this node type
    const typeWarning = useMemo(() => {
        if (!typeDef || typeDef === 'any') return null;
        const isArrayType = typeDef.includes('[]') || typeDef.toLowerCase().includes('array');
        if ((isListInput || isListOutput) && !isArrayType) {
            return `Group ${isListInput ? 'Input' : 'Output'} List expects an array type (e.g., number[], MyType[])`;
        }
        if (!isListInput && !isListOutput && isArrayType && nodeType !== 'GROUP_OUTPUT') {
            return 'Group Input expects a single value type (e.g., number, string, object)';
        }
        return null;
    }, [typeDef, isListInput, isListOutput, nodeType]);

    useEffect(() => {
        if (isOpen) {
            setTypeDef(currentType || 'any');
        }
    }, [isOpen, currentType]);

    const handleSave = () => {
        const trimmed = typeDef.trim();
        if (!trimmed) {
            onSave('any');
        } else {
            onSave(trimmed);
        }
        onClose();
    };

    const insertPreset = (preset) => {
        if (preset === 'any' || preset === 'number' || preset === 'string' || preset === 'boolean') {
            setTypeDef(preset);
        } else if (preset === 'number[]' || preset === 'string[]' || preset === 'object[]') {
            setTypeDef(preset);
        } else if (preset === 'object') {
            setTypeDef(`interface MyObject {
  property: number,
}

input: MyObject`);
        } else if (preset === 'array-of-objects') {
            setTypeDef(`interface MyObject {
  change: number,
  retention: number,
  growth: number,
}

input: MyObject[]`);
        }
    };

    if (!isOpen) return null;

    // Use portal to render at body level, escaping transformed canvas
    return createPortal(
        <div className="fixed inset-y-0 right-0 w-[480px] bg-white dark:bg-slate-900 shadow-2xl z-[1000] transform transition-transform duration-300 border-l border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 shrink-0">
                <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Type className="text-pink-500" size={20} />
                    Define Type Interface
                    {(isListInput || isListOutput) && <span className="text-xs font-normal text-slate-400">(Array)</span>}
                </h2>
                <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 flex flex-col gap-4 min-h-0 overflow-y-auto">
                {/* Node Label */}
                {nodeLabel && (
                    <div className="text-sm text-slate-500 dark:text-slate-400 shrink-0">
                        Defining type for: <span className="font-semibold text-slate-700 dark:text-slate-200">{nodeLabel}</span>
                        {isListInput && <span className="ml-2 text-xs text-violet-500">(accepts multiple values)</span>}
                    </div>
                )}

                {/* Type Warning */}
                {typeWarning && (
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 shrink-0">
                        <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                        <span className="text-xs text-amber-700 dark:text-amber-400">{typeWarning}</span>
                    </div>
                )}

                {/* Quick Presets */}
                <div className="space-y-2 shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Zap size={12} />
                        Quick Presets {isListInput ? '(Array Types)' : '(Value Types)'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {presets.map(preset => (
                            <button
                                key={preset}
                                onClick={() => insertPreset(preset)}
                                className="px-3 py-1.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 border border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                            >
                                {preset}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Type Definition Input - Takes remaining space */}
                <div className="flex-1 flex flex-col min-h-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 shrink-0">Type Definition</h3>
                    <textarea
                        value={typeDef}
                        onChange={(e) => setTypeDef(e.target.value)}
                        placeholder="any"
                        className="flex-1 w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 dark:text-white font-mono text-sm resize-none min-h-[200px]"
                        spellCheck={false}
                    />
                </div>

                {/* Collapsible Syntax Help */}
                <div className="shrink-0">
                    <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                        {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Syntax Examples
                    </button>
                    {showHelp && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="space-y-1 text-xs font-mono text-blue-700 dark:text-blue-300">
                                <div><span className="text-blue-500">Primitive:</span> number, string, boolean</div>
                                <div><span className="text-blue-500">Array:</span> number[], string[]</div>
                                <div className="whitespace-pre-wrap text-[11px]">{`interface MyType {
  name: string,
  value: number,
}
input: MyType[]`}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2 shrink-0">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                    <Save size={16} />
                    Save Type
                </button>
            </div>
        </div>
        , document.body);
};
