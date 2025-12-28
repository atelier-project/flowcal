import React from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2, Maximize2 } from 'lucide-react';
import { GaugeChart, LineChart, BarChart } from '../../ui/Charts';
import { DataTable } from '../../ui/DataTable';
import { DataNodeBody } from './bodies/DataNodeBody';

/**
 * NodeBody - Router component that renders type-specific body content
 * 
 * This component acts as a switch/router that delegates to specialized
 * body components based on the node type.
 */
export const NodeBody = ({
    type,
    data,
    handleChange,
    canEdit,
    inputs,
    result,
    onOpenEditor,
    id,
    // Form helpers
    addFormField,
    updateFormField,
    removeFormField,
    // Key helpers for UNPACK/PACK
    moveKey,
    // Group port helpers
    moveInput,
    moveOutput,
    inputHandles,
    outputHandles,
    // Result formatting
    formatResult
}) => {
    // Data input nodes (INPUT, TEXT_INPUT, DATE_INPUT)
    if (DataNodeBody.handlesType(type)) {
        return <DataNodeBody type={type} data={data} handleChange={handleChange} canEdit={canEdit} />;
    }

    // FORM node
    if (type === 'FORM') {
        const fields = data.fields || [];
        return (
            <div className="space-y-2">
                {fields.map((field, index) => (
                    <div key={index} className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/30 p-1 rounded border border-slate-100 dark:border-slate-700 group">
                        <input
                            type="text"
                            value={field.key}
                            onChange={(e) => updateFormField(index, 'key', e.target.value)}
                            className="w-20 px-1 bg-transparent text-xs font-mono border-b border-transparent focus:border-blue-500 dark:text-slate-300 focus:outline-none disabled:opacity-50"
                            placeholder="Key"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <span className="text-slate-300 dark:text-slate-600">=</span>
                        <input
                            type="text"
                            value={field.value ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                const num = parseFloat(val);
                                updateFormField(index, 'value', isNaN(num) ? val : num);
                            }}
                            className="flex-1 px-1 bg-transparent text-xs font-mono text-blue-600 dark:text-blue-400 font-bold border-b border-transparent focus:border-blue-500 focus:outline-none disabled:opacity-50"
                            placeholder="Value"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        {canEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFormField(index); }}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition-opacity"
                            >
                                <Trash2 size={10} />
                            </button>
                        )}
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

    // COMPARE node
    if (type === 'COMPARE') {
        return (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-1">A</span>
                <select
                    value={data.operator || '>'}
                    onChange={(e) => handleChange('operator', e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs py-1 px-1 font-mono text-center focus:outline-none focus:border-blue-500 cursor-pointer dark:text-slate-200"
                    onMouseDown={e => e.stopPropagation()}
                >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                    <option value=">=">&ge;</option>
                    <option value="<=">&le;</option>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                </select>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pr-1">B</span>
            </div>
        );
    }

    // SORT node
    if (type === 'SORT') {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Order:</span>
                <select
                    value={data.order || 'asc'}
                    onChange={(e) => handleChange('order', e.target.value)}
                    className="flex-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded text-xs py-1 px-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer dark:text-slate-200 disabled:opacity-50"
                    onMouseDown={e => e.stopPropagation()}
                    disabled={!canEdit}
                >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
        );
    }

    // GET node (index)
    if (type === 'GET') {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Idx:</span>
                <input
                    type="number"
                    value={data.index ?? 0}
                    onChange={(e) => handleChange('index', parseInt(e.target.value) || 0)}
                    className="w-16 h-6 px-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-blue-500 dark:text-slate-200 text-center"
                    onMouseDown={e => e.stopPropagation()}
                />
            </div>
        );
    }

    // GET_KEY node
    if (type === 'GET_KEY') {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Key:</span>
                <input
                    type="text"
                    value={data.key || ''}
                    onChange={(e) => handleChange('key', e.target.value)}
                    placeholder="propName"
                    className="w-24 h-6 px-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-blue-500 dark:text-slate-200"
                    onMouseDown={e => e.stopPropagation()}
                />
            </div>
        );
    }

    // IF node
    if (type === 'IF') {
        return (
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                If Condition is truthy (&gt;0), output TrueVal, else FalseVal.
            </div>
        );
    }

    // Generic descriptions
    if (type === 'RANGE') {
        return <div className="text-xs text-slate-500 dark:text-slate-400">Generates array from Start to End.</div>;
    }
    if (type === 'COLLECTOR') {
        return <div className="text-xs text-slate-500 dark:text-slate-400">Collects inputs into a single array.</div>;
    }

    // Visualizations
    if (type === 'GAUGE') {
        return <GaugeChart value={inputs[0] || 0} min={inputs[1] || 0} max={inputs[2] || 100} />;
    }
    if (type === 'PROGRESS') {
        return (
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-600">
                <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, ((typeof inputs[0] === 'number' ? inputs[0] : 0) / (typeof inputs[1] === 'number' ? inputs[1] : 100)) * 100))}%` }}
                />
            </div>
        );
    }
    if (type === 'LINE_CHART') {
        return <LineChart data={inputs[0]} />;
    }
    if (type === 'BAR_CHART') {
        return <BarChart data={inputs[0]} />;
    }
    if (type === 'TABLE') {
        return <DataTable data={inputs[0]} />;
    }

    // CUSTOM JS node
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

    // TEMPLATE node
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
                    <div className="text-sm font-mono text-blue-700 dark:text-blue-300 break-all">
                        {result !== undefined ? String(result) : '-'}
                    </div>
                </div>
            </div>
        );
    }

    // Return null for nodes without specific body content
    return null;
};
