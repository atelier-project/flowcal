import React, { useRef, useMemo } from 'react';
import {
    Plus, Settings, Maximize2, Trash2, ArrowUp, ArrowDown, Plug, Copy
} from 'lucide-react';
import { getNodeHeight } from '../../utils/layout';
import { GaugeChart, LineChart, BarChart } from '../ui/Charts';
import { DataTable } from '../ui/DataTable';
import { Handle } from './Handle';
import { getUI } from './nodeUIMap';
import { getDefinition } from '../../engine/nodeDefinitions';

export const Node = ({ id, type, data, position, selected, isHovered, onDragStart, onDelete, onDuplicate, onUpdateData, onStartConnect, onOpenEditor, inputs, result, onEnterGroup }) => {
    const nodeRef = useRef(null);
    const ui = getUI(type);
    const def = getDefinition(type);

    const handleChange = (key, value) => {
        onUpdateData(id, { ...data, [key]: value });
    };

    const Icon = ui.icon || Plus;

    // --- Handle Logic ---

    const inputHandles = useMemo(() => {
        let handles = [];
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            handles = data.subGraph.nodes
                .filter(n => n.type === 'GROUP_INPUT')
                .map((n, idx) => ({ id: n.id, label: n.data.label || `Input ${idx + 1}` }));
        } else if (type === 'FORM') {
            const fields = data.fields || [];
            // Only generate handles if showInputs is true
            if (data.showInputs) {
                handles = fields.map((field, i) => ({
                    id: `field_${i}`,
                    label: '', // Don't show label on handle, it's next to the input
                    top: 48 + (i * 30)
                }));
            } else {
                handles = [];
            }
        } else if (type === 'COLLECTOR' || (def && def.dynamicInputs)) {
            const count = data.inputCount || 2;
            handles = Array.from({ length: count }).map((_, i) => ({ id: `in_${i}`, label: `${i}` }));
        } else if (def && def.inputs && !def.inputs.includes('*')) {
            handles = def.inputs.map((name) => ({
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }));
        } else if (type !== 'INPUT' && type !== 'GROUP_INPUT') {
            // Default single input for most nodes
            handles = [{ id: null, top: '50%' }];
        }

        // Apply custom order if exists
        if (data.inputOrder && Array.isArray(data.inputOrder) && handles.length > 0) {
            handles.sort((a, b) => {
                const idxA = data.inputOrder.indexOf(a.id);
                const idxB = data.inputOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }

        // Assign positions
        if (handles.length === 1 && handles[0].top) return handles; // Keep default centered
        return handles.map((h, i) => ({ ...h, top: 40 + (i * 24) }));

    }, [type, data.subGraph, data.inputCount, def, data.inputOrder]);

    const outputHandles = useMemo(() => {
        let handles = [];
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            handles = data.subGraph.nodes
                .filter(n => n.type === 'GROUP_OUTPUT')
                .map((n, idx) => ({ id: n.id, label: n.data.label || `Output ${idx + 1}` }));
        } else if (def && def.outputs) {
            handles = def.outputs.map((name) => ({
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }));
        } else if (!['GROUP_OUTPUT', 'FINAL', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE'].includes(type) && def.category !== 'Visuals' && type !== 'FINAL') {
            // Default single output
            handles = [{ id: null, top: '50%' }];
        }

        // Apply custom order
        if (data.outputOrder && Array.isArray(data.outputOrder) && handles.length > 0) {
            handles.sort((a, b) => {
                const idxA = data.outputOrder.indexOf(a.id);
                const idxB = data.outputOrder.indexOf(b.id);
                if (idxA === -1 && idxB === -1) return 0;
                if (idxA === -1) return 1;
                if (idxB === -1) return -1;
                return idxA - idxB;
            });
        }

        if (handles.length === 1 && handles[0].top) return handles;
        return handles.map((h, i) => ({ ...h, top: 40 + (i * 24) }));
    }, [type, data.subGraph, def, data.outputOrder]);

    const minHeight = getNodeHeight({ type, data });

    // --- Helpers ---
    const addCollectorInput = () => {
        onUpdateData(id, { ...data, inputCount: (data.inputCount || 2) + 1 });
    };

    const addFormField = () => {
        const fields = data.fields || [];
        const newField = { key: `Key ${fields.length + 1}`, value: 0 };
        onUpdateData(id, { ...data, fields: [...fields, newField] });
    };

    const updateFormField = (index, key, value) => {
        const fields = [...(data.fields || [])];
        if (fields[index]) {
            fields[index] = { ...fields[index], [key]: value };
            onUpdateData(id, { ...data, fields });
        }
    };

    const removeFormField = (index) => {
        const fields = (data.fields || []).filter((_, i) => i !== index);
        onUpdateData(id, { ...data, fields });
    };

    const formatResult = (val) => {
        if (val === undefined || val === null || Number.isNaN(val)) return '-';
        if (Array.isArray(val)) return `Array(${val.length})`;
        if (typeof val === 'number') return val.toFixed(2);
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    const moveInput = (index, direction) => {
        const currentOrder = inputHandles.map(h => h.id);
        const newOrder = [...currentOrder];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (swapIndex >= 0 && swapIndex < newOrder.length) {
            [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
            handleChange('inputOrder', newOrder);
        }
    };

    const moveOutput = (index, direction) => {
        const currentOrder = outputHandles.map(h => h.id);
        const newOrder = [...currentOrder];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        if (swapIndex >= 0 && swapIndex < newOrder.length) {
            [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
            handleChange('outputOrder', newOrder);
        }
    };

    return (
        <div
            ref={nodeRef}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                minHeight,
                width: data.width ? `${data.width}px` : undefined,
                backgroundColor: 'var(--bg-secondary)',
                borderColor: selected ? 'var(--accent-primary)' : 'var(--border-primary)',
                color: 'var(--text-primary)'
            }}
            className={`absolute ${!data.width ? 'w-64' : ''} rounded-lg shadow-lg border-2 transition-all duration-200 flex flex-col
        ${selected ? 'shadow-blue-500/20 z-20 ring-2 ring-blue-400' : 'z-10'}
        ${isHovered ? 'ring-4 ring-blue-300 ring-opacity-50 scale-105 shadow-xl' : ''}
        ${type === 'FINAL' ? 'border-green-500 shadow-green-100' : ''}
      `}
            onMouseDown={(e) => onDragStart(e, id)}
        >
            {/* Header */}
            <div
                style={{
                    backgroundColor: type === 'FINAL' ? undefined : 'var(--bg-tertiary)',
                    borderColor: 'var(--border-primary)'
                }}
                className={`flex items-center justify-between p-2 rounded-t-lg border-b select-none transition-colors
        ${type === 'FINAL' ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' : ''}
      `}>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm flex-1 min-w-0">
                    <span className={`p-1 rounded shadow-sm shrink-0 ${ui.colorClass?.split(' ')[1] ? 'bg-white dark:bg-slate-700 ' + ui.colorClass.split(' ')[1] : 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400'}`}>
                        <Icon size={16} />
                    </span>
                    <input
                        type="text"
                        value={data.label || ''}
                        placeholder={def.label || 'Node'}
                        onChange={(e) => handleChange('label', e.target.value)}
                        className="bg-transparent border-none p-0 text-slate-700 dark:text-slate-200 font-semibold text-sm w-full focus:outline-none focus:ring-0 placeholder:text-slate-500 dark:placeholder:text-slate-500 truncate"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>
                <div className="flex gap-1 items-center">
                    {type === 'INPUT' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleChange('useSlider', !data.useSlider); }}
                            className={`p-1 rounded ${data.useSlider ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'}`}
                            title="Toggle Slider"
                        >
                            <Settings size={14} />
                        </button>
                    )}
                    {type === 'FORM' && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleChange('showInputs', !data.showInputs); }}
                            className={`p-1 rounded ${data.showInputs ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'}`}
                            title={data.showInputs ? "Hide Input Ports" : "Show Input Ports (Enable Overrides)"}
                        >
                            <Plug size={14} />
                        </button>
                    )}
                    {type === 'COLLECTOR' && (
                        <button onClick={(e) => { e.stopPropagation(); addCollectorInput(); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Add Input Port"><Plus size={14} /></button>
                    )}
                    {type === 'CUSTOM' && (
                        <button onClick={(e) => { e.stopPropagation(); onOpenEditor(id, data.func); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Open Editor"><Maximize2 size={14} /></button>
                    )}
                    {type === 'GROUP' && (
                        <button onClick={(e) => { e.stopPropagation(); onEnterGroup(id); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Edit Group"><Settings size={14} /></button>
                    )}
                    {onDuplicate && (
                        <button onClick={(e) => { e.stopPropagation(); onDuplicate(id); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Duplicate (Ctrl+D)"><Copy size={14} /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3 flex-1 flex flex-col">
                {type === 'INPUT' && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Value</label>
                            <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">{data.value}</span>
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
                                    className="w-full accent-blue-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <div className="flex gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                                    <input
                                        className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-700 text-center dark:text-slate-300"
                                        value={data.min || 0}
                                        onChange={e => handleChange('min', parseFloat(e.target.value))}
                                        placeholder="Min"
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                    <span className="flex-1 text-center">Range</span>
                                    <input
                                        className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-700 text-center dark:text-slate-300"
                                        value={data.max || 100}
                                        onChange={e => handleChange('max', parseFloat(e.target.value))}
                                        placeholder="Max"
                                        onMouseDown={e => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        ) : (
                            <input
                                type="number"
                                value={data.value}
                                onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 font-mono dark:text-slate-200"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        )}
                    </div>
                )}

                {type === 'TEXT_INPUT' && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Text</label>
                        <input
                            type="text"
                            value={data.text ?? ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="Enter text..."
                            className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'DATE_INPUT' && (
                    <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Date</label>
                        <input
                            type="datetime-local"
                            value={data.date ?? ''}
                            onChange={(e) => handleChange('date', e.target.value)}
                            className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'FORM' && (
                    <div className="flex flex-col gap-2">
                        {(data.fields || []).map((field, i) => (
                            <div key={i} className="flex items-center gap-1 group/field">
                                {/* Input Handle spacer */}
                                {data.showInputs && <div className="w-3" />}
                                <input
                                    className="w-20 text-xs font-bold text-slate-600 dark:text-slate-300 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none px-1"
                                    value={field.key}
                                    onChange={(e) => updateFormField(i, 'key', e.target.value)}
                                    placeholder="Key"
                                    onMouseDown={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                />
                                <span className="text-slate-300 dark:text-slate-600">:</span>
                                <input
                                    className="flex-1 min-w-0 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-[2px] focus:border-blue-500 focus:outline-none dark:text-slate-300"
                                    value={field.value}
                                    onChange={(e) => updateFormField(i, 'value', e.target.value)} // String input allowed
                                    placeholder="Value"
                                    onMouseDown={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                />
                                <button onClick={(e) => { e.stopPropagation(); removeFormField(i); }} className="opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={(e) => { e.stopPropagation(); addFormField(); }}
                            className="text-xs flex items-center justify-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-700 border-dashed transition-colors"
                        >
                            <Plus size={12} /> Add Field
                        </button>
                    </div>
                )}

                {/* Logic Nodes */}
                {type === 'COMPARE' && (
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
                )}

                {/* Array Nodes */}
                {type === 'SORT' && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Order:</span>
                        <select
                            value={data.order || 'asc'}
                            onChange={(e) => handleChange('order', e.target.value)}
                            className="flex-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded text-xs py-1 px-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer dark:text-slate-200"
                            onMouseDown={e => e.stopPropagation()}
                        >
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                    </div>
                )}

                {type === 'FILTER' && (
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
                )}

                {type === 'GET' && (
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
                )}

                {type === 'GET_KEY' && (
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
                )}

                {type === 'IF' && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                        If Condition is truthy (&gt;0), output TrueVal, else FalseVal.
                    </div>
                )}

                {/* Generic descriptions */}
                {type === 'RANGE' && <div className="text-xs text-slate-500 dark:text-slate-400">Generates array from Start to End.</div>}
                {type === 'COLLECTOR' && <div className="text-xs text-slate-500 dark:text-slate-400">Collects inputs into a single array.</div>}

                {/* Visualizations */}
                {type === 'GAUGE' && <GaugeChart value={inputs[0] || 0} min={inputs[1] || 0} max={inputs[2] || 100} />}
                {type === 'PROGRESS' && (
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-200 dark:border-slate-600">
                        <div
                            className="bg-blue-500 h-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, ((typeof inputs[0] === 'number' ? inputs[0] : 0) / (typeof inputs[1] === 'number' ? inputs[1] : 100)) * 100))}%` }}
                        />
                    </div>
                )}
                {(type === 'LINE_CHART' || type === 'BAR_CHART') && (
                    type === 'LINE_CHART' ? <LineChart data={inputs[0]} /> : <BarChart data={inputs[0]} />
                )}
                {type === 'TABLE' && <DataTable data={inputs[0]} />}

                {type === 'CUSTOM' && (
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
                )}

                {type === 'TEMPLATE' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Template String</label>
                        <textarea
                            value={data.template || 'Total: {0}'}
                            onChange={(e) => handleChange('template', e.target.value)}
                            className="w-full h-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 font-mono resize-y text-slate-700 dark:text-slate-200"
                            placeholder="Result: {0}, Tax: {1}"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'FINAL' && (
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 min-h-[60px] p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg flex items-center justify-center text-center">
                            <span className="text-lg font-bold text-green-800 dark:text-green-300 break-words w-full">
                                {inputs.length > 0 && inputs[0] !== undefined ? String(inputs[0]) : <span className="text-green-300/50 text-sm">Connect Input</span>}
                            </span>
                        </div>
                    </div>
                )}

                {type === 'COMMENT' && (
                    <div className="flex-1 flex flex-col">
                        <textarea
                            value={data.text ?? ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="Add your notes..."
                            className="w-full flex-1 min-h-[60px] p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-sm text-amber-900 dark:text-amber-200 placeholder:text-amber-400 resize-none focus:outline-none focus:border-amber-400"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'GROUP' && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {inputHandles.length === 0 && outputHandles.length === 0 ? "Empty Group. Drop nodes here or Edit." : ""}
                        {isHovered && <div className="mt-2 text-blue-500 font-bold">Drop to move inside</div>}
                    </div>
                )}

                {/* Display Value for Group Input */}
                {type === 'GROUP_INPUT' && (
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">VALUE</span>
                            {typeof result === 'object' && result !== null ? (
                                <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-700 break-all whitespace-pre-wrap max-h-20 overflow-y-auto">
                                    {JSON.stringify(result, null, 1).replace(/"/g, '')}
                                </div>
                            ) : (
                                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                                    {formatResult(result)}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Render Labels for Group/Node Ports */}
                {inputHandles.map((h, i) => h.label && (
                    <div key={h.id || i} className="absolute left-3 flex items-center gap-1 group/handle"
                        style={{ top: typeof h.top === 'number' ? h.top : h.top, transform: 'translateY(-50%)' }}>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pointer-events-none">{h.label}</span>
                        {/* Reorder Inputs */}
                        {inputHandles.length > 1 && (
                            <div className="flex flex-col opacity-0 group-hover/handle:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded">
                                {i > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); moveInput(i, 'up'); }} className="p-[1px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500">
                                        <ArrowUp size={8} />
                                    </button>
                                )}
                                {i < inputHandles.length - 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); moveInput(i, 'down'); }} className="p-[1px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500">
                                        <ArrowDown size={8} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {outputHandles.map((h, i) => h.label && (
                    <div key={h.id || i} className="absolute right-3 flex flex-row-reverse items-center gap-1 group/handle"
                        style={{ top: typeof h.top === 'number' ? h.top : h.top, transform: 'translateY(-50%)' }}>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono pointer-events-none text-right">{h.label}</span>
                        {/* Reorder Outputs */}
                        {outputHandles.length > 1 && (
                            <div className="flex flex-col opacity-0 group-hover/handle:opacity-100 transition-opacity bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 rounded">
                                {i > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); moveOutput(i, 'up'); }} className="p-[1px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500">
                                        <ArrowUp size={8} />
                                    </button>
                                )}
                                {i < outputHandles.length - 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); moveOutput(i, 'down'); }} className="p-[1px] hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500">
                                        <ArrowDown size={8} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {/* Inputs Preview (for generic nodes that don't visualize) */}
                {def.category === 'Math' && type !== 'CUSTOM' && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
                        <span>Inputs: {inputs.length}</span>
                        <span>[{inputs.map(i => {
                            if (typeof i === 'number') return i.toFixed(1);
                            if (typeof i === 'object') return '{Obj}';
                            return String(i).substring(0, 5);
                        }).join(', ')}]</span>
                    </div>
                )}

                {/* Result Display - Hide for Sinks */}
                {def.category !== 'Visuals' && type !== 'FINAL' && type !== 'GROUP' && type !== 'GROUP_INPUT' && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50">
                        {/* Error Handling Display */}
                        {typeof result === 'string' && result.startsWith('Error:') ? (
                            <div className="text-xs font-bold text-red-500 break-words bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">
                                {result}
                            </div>
                        ) : type === 'TEMPLATE' ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">OUTPUT</span>
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700">
                                    {formatResult(result)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 mr-2">OUTPUT</span>
                                    {typeof result !== 'object' && (
                                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono text-right truncate">
                                            {formatResult(result)}
                                        </span>
                                    )}
                                </div>
                                {typeof result === 'object' && result !== null && (
                                    <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-700 break-all whitespace-pre-wrap max-h-20 overflow-y-auto">
                                        {JSON.stringify(result, null, 1).replace(/"/g, '')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {
                inputHandles.map(h => (
                    <Handle
                        key={h.id || 'default'}
                        type="input"
                        id={h.id}
                        position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                        onMouseDown={() => { }}
                        isValid={true}
                    />
                ))
            }

            {
                outputHandles.map(h => (
                    <Handle
                        key={h.id || 'default'}
                        type="output"
                        id={h.id}
                        position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                        onMouseDown={(e) => onStartConnect(e, id, h.id)}
                        isValid={true}
                    />
                ))
            }

            {/* Resize Handle for FORM, FINAL, and COMMENT */}
            {
                (type === 'FORM' || type === 'FINAL' || type === 'COMMENT') && (
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-tl"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startWidth = data.width || 200;
                            const handleMouseMove = (moveEvent) => {
                                const newWidth = Math.max(150, startWidth + (moveEvent.clientX - startX));
                                handleChange('width', newWidth);
                            };
                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };
                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-slate-400 dark:text-slate-500 absolute bottom-0.5 right-0.5 pointer-events-none">
                            <path d="M21 15L15 21M21 8L8 21" />
                        </svg>
                    </div>
                )
            }
        </div >
    );
};
