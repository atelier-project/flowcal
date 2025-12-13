import React, { useRef, useMemo } from 'react';
import {
    Plus, Minus, X, Play, Code, Trash2, Settings, Activity,
    FileText, ArrowRight, ArrowLeft,
    Box, Flag, Maximize2, Gauge, Percent, Table as TableIcon,
    TrendingUp, BarChart as BarChartIcon, ListPlus
} from 'lucide-react';
import { getNodeHeight } from '../../utils/layout';
import { GaugeChart, LineChart, BarChart } from '../ui/Charts';
import { DataTable } from '../ui/DataTable';
import { Handle } from './Handle';

export const Node = ({ id, type, data, position, selected, isHovered, onDragStart, onDelete, onUpdateData, onStartConnect, onOpenEditor, inputs, result, onEnterGroup }) => {
    const nodeRef = useRef(null);

    const handleChange = (key, value) => {
        onUpdateData(id, { ...data, [key]: value });
    };

    const getIcon = () => {
        switch (type) {
            case 'SUM': return <Plus size={16} />;
            case 'SUB': return <Minus size={16} />;
            case 'MUL': return <X size={16} />;
            case 'CUSTOM': return <Code size={16} />;
            case 'TEMPLATE': return <FileText size={16} />;
            case 'FINAL': return <Flag size={16} />;
            case 'GROUP': return <Box size={16} />;
            case 'GROUP_INPUT': return <ArrowRight size={16} />;
            case 'GROUP_OUTPUT': return <ArrowLeft size={16} />;
            case 'GAUGE': return <Gauge size={16} />;
            case 'PROGRESS': return <Percent size={16} />;
            case 'LINE_CHART': return <TrendingUp size={16} />;
            case 'BAR_CHART': return <BarChartIcon size={16} />;
            case 'TABLE': return <TableIcon size={16} />;
            case 'COLLECTOR': return <ListPlus size={16} />;
            case 'RANGE': return <Activity size={16} />;
            default: return <Activity size={16} />;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'INPUT': return 'Number Input';
            case 'SUM': return 'Add Inputs';
            case 'SUB': return 'Subtract';
            case 'MUL': return 'Multiply';
            case 'CUSTOM': return 'Custom JS';
            case 'TEMPLATE': return 'Text Output';
            case 'FINAL': return 'Final Result';
            case 'GROUP': return 'Group Logic';
            case 'GROUP_INPUT': return 'Group Input';
            case 'GROUP_OUTPUT': return 'Group Output';
            case 'GAUGE': return 'Gauge';
            case 'PROGRESS': return 'Progress Bar';
            case 'LINE_CHART': return 'Line Chart';
            case 'BAR_CHART': return 'Bar Chart';
            case 'TABLE': return 'Data Table';
            case 'COLLECTOR': return 'Array Collector';
            case 'RANGE': return 'Range Generator';
            default: return 'Node';
        }
    };

    // --- Handle Logic ---

    const inputHandles = useMemo(() => {
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            return data.subGraph.nodes
                .filter(n => n.type === 'GROUP_INPUT')
                .map((n, idx) => ({ id: n.id, label: n.data.label || `Input ${idx + 1}`, top: 40 + (idx * 24) }));
        }
        if (type === 'COLLECTOR') {
            const count = data.inputCount || 2;
            return Array.from({ length: count }).map((_, i) => ({ id: `in_${i}`, label: `${i}`, top: 40 + (i * 24) }));
        }
        if (type === 'RANGE') {
            return [
                { id: 'start', label: 'Start', top: 40 },
                { id: 'end', label: 'End', top: 64 },
                { id: 'step', label: 'Step', top: 88 },
            ];
        }
        if (type === 'PROGRESS') {
            return [
                { id: 'val', label: 'Val', top: 40 },
                { id: 'max', label: 'Max', top: 64 }
            ];
        }
        if (type === 'GAUGE') {
            return [
                { id: 'val', label: 'Val', top: 40 },
                { id: 'min', label: 'Min', top: 64 },
                { id: 'max', label: 'Max', top: 88 }
            ];
        }
        if (type === 'INPUT' || type === 'GROUP_INPUT') return [];
        return [{ id: null, top: '50%' }];
    }, [type, data.subGraph, data.inputCount]);

    const outputHandles = useMemo(() => {
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            return data.subGraph.nodes
                .filter(n => n.type === 'GROUP_OUTPUT')
                .map((n, idx) => ({ id: n.id, label: n.data.label || `Output ${idx + 1}`, top: 40 + (idx * 24) }));
        }
        if (type === 'GROUP_OUTPUT' || type === 'FINAL' || type === 'GAUGE' || type === 'PROGRESS' || type === 'LINE_CHART' || type === 'BAR_CHART' || type === 'TABLE') return [];
        if (type === 'GROUP_INPUT') return [{ id: null, top: '50%' }];

        return [{ id: null, top: '50%' }];
    }, [type, data.subGraph]);

    const minHeight = getNodeHeight({ type, data });

    // --- Helpers ---
    const addCollectorInput = () => {
        onUpdateData(id, { ...data, inputCount: (data.inputCount || 2) + 1 });
    };

    const formatResult = (val) => {
        if (val === undefined || val === null || Number.isNaN(val)) return '-';
        if (Array.isArray(val)) return `Array(${val.length})`;
        if (typeof val === 'number') return val.toFixed(2);
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    return (
        <div
            ref={nodeRef}
            style={{ transform: `translate(${position.x}px, ${position.y}px)`, minHeight }}
            className={`absolute w-64 bg-white rounded-lg shadow-lg border-2 transition-all duration-200 flex flex-col
        ${selected ? 'border-blue-500 shadow-blue-500/20 z-20 ring-2 ring-blue-400' : 'border-slate-200 hover:border-slate-300 z-10'}
        ${isHovered ? 'ring-4 ring-blue-300 ring-opacity-50 scale-105 shadow-xl border-blue-400' : ''}
        ${type === 'FINAL' ? 'border-green-500 shadow-green-100' : ''}
      `}
            onMouseDown={(e) => onDragStart(e, id)}
        >
            {/* Header */}
            <div className={`flex items-center justify-between p-2 rounded-t-lg border-b select-none
        ${type === 'FINAL' ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100'}
      `}>
                <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm flex-1 min-w-0">
                    <span className={`p-1 rounded shadow-sm shrink-0 ${type === 'FINAL' ? 'bg-white text-green-600' : 'bg-white text-blue-600'}`}>{getIcon()}</span>
                    <input
                        type="text"
                        value={data.label || ''}
                        placeholder={getTitle()}
                        onChange={(e) => handleChange('label', e.target.value)}
                        className="bg-transparent border-none p-0 text-slate-700 font-semibold text-sm w-full focus:outline-none focus:ring-0 placeholder:text-slate-500 truncate"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>
                <div className="flex gap-1 items-center">
                    {type === 'COLLECTOR' && (
                        <button onClick={(e) => { e.stopPropagation(); addCollectorInput(); }} className="text-slate-400 hover:text-blue-500 p-1" title="Add Input Port"><Plus size={14} /></button>
                    )}
                    {type === 'CUSTOM' && (
                        <button onClick={(e) => { e.stopPropagation(); onOpenEditor(id, data.func); }} className="text-slate-400 hover:text-blue-500 p-1" title="Open Editor"><Maximize2 size={14} /></button>
                    )}
                    {type === 'GROUP' && (
                        <button onClick={(e) => { e.stopPropagation(); onEnterGroup(id); }} className="text-slate-400 hover:text-blue-500 p-1" title="Edit Group"><Settings size={14} /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="text-slate-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-3 flex-1 flex flex-col">
                {type === 'INPUT' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Value</label>
                        <input
                            type="number"
                            value={data.value}
                            onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500 font-mono"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'RANGE' && (
                    <div className="text-xs text-slate-500">
                        Generates array from Start to End.
                    </div>
                )}

                {type === 'COLLECTOR' && (
                    <div className="text-xs text-slate-500">
                        Collects inputs into a single array.
                    </div>
                )}

                {/* Visualizations */}
                {type === 'GAUGE' && <GaugeChart value={inputs[0] || 0} min={inputs[1] || 0} max={inputs[2] || 100} />}
                {type === 'PROGRESS' && (
                    <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
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
                        <label className="block text-xs font-medium text-slate-500 mb-1">Function (inputs array)</label>
                        <textarea
                            value={data.func || 'return inputs.reduce((a,b) => a+b, 0);'}
                            onChange={(e) => handleChange('func', e.target.value)}
                            className="w-full h-24 px-2 py-1 bg-slate-900 text-green-400 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 font-mono resize-none"
                            placeholder="return inputs[0] + 1;"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'TEMPLATE' && (
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Template String</label>
                        <textarea
                            value={data.template || 'Total: {0}'}
                            onChange={(e) => handleChange('template', e.target.value)}
                            className="w-full h-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-500 font-mono resize-y text-slate-700"
                            placeholder="Result: {0}, Tax: {1}"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'FINAL' && (
                    <div className="flex-1 flex flex-col">
                        <div className="flex-1 min-h-[60px] p-3 bg-green-50 border border-green-100 rounded-lg flex items-center justify-center text-center">
                            <span className="text-lg font-bold text-green-800 break-words w-full">
                                {inputs.length > 0 && inputs[0] !== undefined ? String(inputs[0]) : <span className="text-green-300 text-sm">Connect Input</span>}
                            </span>
                        </div>
                    </div>
                )}

                {type === 'GROUP' && (
                    <div className="text-xs text-slate-500 italic">
                        {inputHandles.length === 0 && outputHandles.length === 0 ? "Empty Group. Drop nodes here or Edit." : ""}
                        {isHovered && <div className="mt-2 text-blue-500 font-bold">Drop to move inside</div>}
                    </div>
                )}

                {/* Render Labels for Group/Node Ports */}
                {inputHandles.map((h, i) => h.label && (
                    <div key={h.id || i} className="absolute left-3 text-[10px] text-slate-400 font-mono pointer-events-none" style={{ top: typeof h.top === 'number' ? h.top - 7 : `calc(${h.top} - 7px)` }}>
                        {h.label}
                    </div>
                ))}
                {outputHandles.map((h, i) => h.label && (
                    <div key={h.id || i} className="absolute right-3 text-[10px] text-slate-400 font-mono pointer-events-none text-right" style={{ top: typeof h.top === 'number' ? h.top - 7 : `calc(${h.top} - 7px)` }}>
                        {h.label}
                    </div>
                ))}

                {/* Inputs Preview (for generic nodes that don't visualize) */}
                {['INPUT', 'SUM', 'SUB', 'MUL', 'CUSTOM'].includes(type) && (
                    <div className="text-xs text-slate-500 flex justify-between">
                        <span>Inputs: {inputs.length}</span>
                        <span>[{inputs.map(i => {
                            if (typeof i === 'number') return i.toFixed(1);
                            if (typeof i === 'object') return '{Obj}';
                            return String(i).substring(0, 5);
                        }).join(', ')}]</span>
                    </div>
                )}

                {/* Result Display - Hide for Sinks */}
                {!['GROUP_INPUT', 'GROUP', 'FINAL', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE'].includes(type) && (
                    <div className="pt-2 border-t border-slate-100">
                        {type === 'TEMPLATE' ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-slate-400">OUTPUT</span>
                                <div className="text-sm font-bold text-blue-600 font-mono whitespace-pre-wrap break-words bg-slate-50 p-2 rounded border border-slate-100">
                                    {formatResult(result)}
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 shrink-0 mr-2">OUTPUT</span>
                                <span className="text-sm font-bold text-blue-600 font-mono text-right truncate" title={String(result)}>
                                    {formatResult(result)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {inputHandles.map(h => (
                <Handle
                    key={h.id || 'default'}
                    type="input"
                    id={h.id}
                    position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                    onMouseDown={() => { }}
                    isValid={true}
                />
            ))}

            {outputHandles.map(h => (
                <Handle
                    key={h.id || 'default'}
                    type="output"
                    id={h.id}
                    position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                    onMouseDown={(e) => onStartConnect(e, id, h.id)}
                    isValid={true}
                />
            ))}
        </div>
    );
};
