import React from 'react';
import { Maximize2 } from 'lucide-react';

/**
 * ValueNodeBody — bodies that edit a node's primary value/expression and show a
 * formatted output: the number INPUT (with slider + display-format controls),
 * the CUSTOM JS function, and the TEMPLATE string.
 *
 * Needs the value/result formatters and the code-editor opener from Node.jsx.
 *
 * Handles: INPUT, CUSTOM, TEMPLATE
 */
export const ValueNodeBody = ({
    type,
    id,
    data,
    inputs,
    result,
    handleChange,
    canEdit,
    formatInputDisplay,
    formatResult,
    onOpenEditor,
}) => {
    if (type === 'INPUT') {
        return (
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Value</label>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">{formatInputDisplay(data.value)}</span>
                </div>
                {data.useSlider ? (
                    <div className="space-y-2 pt-1">
                        <input
                            type="range"
                            min={data.min || 0}
                            max={data.max || 100}
                            step={data.step || 1}
                            value={data.value}
                            onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                            className="w-full accent-blue-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <div className="flex gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                            <input
                                className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-700 text-center dark:text-slate-300 disabled:opacity-50"
                                value={data.min || 0}
                                onChange={e => handleChange('min', parseFloat(e.target.value))}
                                placeholder="Min"
                                onMouseDown={e => e.stopPropagation()}
                                disabled={!canEdit}
                            />
                            <span className="flex-1 text-center">Range</span>
                            <input
                                className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-700 text-center dark:text-slate-300 disabled:opacity-50"
                                value={data.max || 100}
                                onChange={e => handleChange('max', parseFloat(e.target.value))}
                                placeholder="Max"
                                onMouseDown={e => e.stopPropagation()}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                ) : (
                    <input
                        type="number"
                        value={data.value}
                        onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 font-mono dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={!canEdit}
                    />
                )}
                {canEdit && (
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400 dark:text-slate-500">
                        <select
                            value={data.displayFormat || 'number'}
                            onChange={(e) => handleChange('displayFormat', e.target.value)}
                            className="h-6 px-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-blue-500"
                            onMouseDown={(e) => e.stopPropagation()}
                            title="Display format (does not change the value sent downstream)"
                        >
                            <option value="number">123</option>
                            <option value="percent">%</option>
                        </select>
                        <span className="shrink-0">Dec</span>
                        <input
                            type="number"
                            min={0}
                            max={10}
                            value={data.precision ?? ''}
                            onChange={(e) => handleChange('precision', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                            placeholder="auto"
                            className="w-10 h-6 px-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:border-blue-500"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        {data.displayFormat !== 'percent' && (
                            <input
                                type="text"
                                value={data.displayUnit ?? ''}
                                onChange={(e) => handleChange('displayUnit', e.target.value)}
                                placeholder="suffix"
                                className="w-12 h-6 px-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:border-blue-500"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (type === 'CUSTOM') {
        return (
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Function (inputs array)</label>
                <textarea
                    value={data.func || 'return inputs.reduce((a,b) => a+b, 0);'}
                    className="w-full h-24 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono text-[10px] resize-none focus:outline-none"
                    onMouseDown={e => e.stopPropagation()}
                    onDoubleClick={() => onOpenEditor(id, data.func, inputs)}
                    readOnly
                />
                <button
                    onClick={() => onOpenEditor(id, data.func, inputs)}
                    className="mt-1 w-full flex items-center justify-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                    <Maximize2 size={12} /> Open Editor
                </button>
            </div>
        );
    }

    if (type === 'TEMPLATE') {
        return (
            <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Template String</label>
                <textarea
                    value={data.template || 'Total: {0}'}
                    onChange={(e) => handleChange('template', e.target.value)}
                    className="w-full h-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 font-mono resize-y text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Result: {0}, Tax: {1}"
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!canEdit}
                />
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                    <label className="block text-xs font-medium text-blue-500 dark:text-blue-400 mb-1">Output</label>
                    <div className="text-sm font-mono text-blue-700 dark:text-blue-300 break-words whitespace-pre-wrap">
                        {result !== undefined ? formatResult(result) : <span className="text-blue-300 italic">Connect inputs...</span>}
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

ValueNodeBody.handlesType = (type) => ['INPUT', 'CUSTOM', 'TEMPLATE'].includes(type);
