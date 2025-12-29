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

    // UNPACK node
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

    // PACK node
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

    // REDUCE node
    if (type === 'REDUCE') {
        return (
            <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Initial Value</label>
                <input
                    type="text"
                    value={data.initialValue ?? 0}
                    onChange={(e) => {
                        const val = e.target.value;
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

    // FINAL node
    if (type === 'FINAL') {
        return (
            <div className="flex-1 flex flex-col">
                <div className="flex-1 min-h-[60px] p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg flex items-center justify-center text-center">
                    <span className="text-lg font-bold text-green-800 dark:text-green-300 break-words w-full">
                        {inputs.length > 0 && inputs[0] !== undefined ? String(inputs[0]) : <span className="text-green-300/50 text-sm">Connect Input</span>}
                    </span>
                </div>
            </div>
        );
    }

    // GROUP node with results display
    if (type === 'GROUP' && data.showResults) {
        return (
            <div className="mt-2 flex-1 flex flex-col min-h-0 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1 mb-1">Outbound Values</div>
                <div className="flex-1 min-h-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-y-auto">
                    {(data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST') || []).map((out, i) => (
                        <div key={out.id} className="flex items-center justify-between p-1.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px]" title={out.data.label || `Output ${i + 1}`}>
                                {out.data.label || `Output ${i + 1}`}
                            </span>
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                {result && result[out.id] !== undefined ? formatResult(result[out.id]) : '-'}
                            </span>
                        </div>
                    ))}
                    {(!data.subGraph?.nodes.some(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST')) && (
                        <div className="p-2 text-center text-[10px] italic text-slate-400">No output nodes defined</div>
                    )}
                </div>
            </div>
        );
    }

    // COMMENT node
    if (type === 'COMMENT') {
        return (
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Color Picker */}
                <div className="flex items-center gap-1 mb-2 shrink-0">
                    <span className="text-[10px] text-slate-500">Color:</span>
                    {['#fef3c7', '#fce7f3', '#dbeafe', '#dcfce7', '#f3e8ff', '#fed7aa'].map(c => (
                        <button
                            key={c}
                            onClick={() => handleChange('color', c)}
                            className={`w-4 h-4 rounded-full border-2 ${data.color === c ? 'border-slate-600 scale-110' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                    <input
                        type="color"
                        value={data.color || '#fef3c7'}
                        onChange={(e) => handleChange('color', e.target.value)}
                        className="w-5 h-5 rounded cursor-pointer ml-1"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>
                {/* Comment Text */}
                <textarea
                    value={data.comment || ''}
                    onChange={(e) => handleChange('comment', e.target.value)}
                    placeholder="Add your notes..."
                    className="flex-1 min-h-[60px] w-full p-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded resize-none focus:outline-none focus:border-slate-400"
                    style={{ backgroundColor: data.color || '#fef3c7', color: '#374151' }}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!canEdit}
                />
            </div>
        );
    }

    // FILTER node (inside iterator context)
    if (type === 'FILTER' && !data.subGraph) {
        return (
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pl-1">Input</span>
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
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 pr-1">Ref</span>
            </div>
        );
    }

    // GROUP_INPUT / GROUP_OUTPUT nodes with port management
    if (type === 'GROUP_INPUT' || type === 'GROUP_OUTPUT' || type === 'GROUP_INPUT_LIST' || type === 'GROUP_OUTPUT_LIST') {
        return (
            <div className="space-y-2">
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Port Label</label>
                    <input
                        type="text"
                        value={data.label || ''}
                        onChange={(e) => handleChange('label', e.target.value)}
                        placeholder="Input/Output Name"
                        className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={!canEdit}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
                    <input
                        type="text"
                        value={data.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Optional description..."
                        className="w-full h-7 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500"
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={!canEdit}
                    />
                </div>
            </div>
        );
    }

    // Return null for nodes without specific body content
    return null;
};
