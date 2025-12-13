import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Plus, Minus, X, Play, Code, Trash2, GripVertical, Settings, Activity,
    Download, Upload, FileText, Layers, ArrowRight, ArrowLeft, ChevronRight,
    Box, Flag, Maximize2, FileJson, Save, Gauge, Percent, Table as TableIcon,
    TrendingUp, BarChart as BarChartIcon, ListPlus
} from 'lucide-react';

/**
 * Utility: Generate a unique ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Utility: Calculate Bezier Curve Path for connections
 */
const getBezierPath = (start, end) => {
    const [sx, sy] = start;
    const [ex, ey] = end;
    const dist = Math.abs(sx - ex) + Math.abs(sy - ey);
    const controlOffset = Math.min(dist * 0.5, 150);

    return `M${sx},${sy} C${sx + controlOffset},${sy} ${ex - controlOffset},${ey} ${ex},${ey}`;
};

/**
 * Utility: Estimate Node Height for Hit Testing & Handle Alignment
 */
const getNodeHeight = (node) => {
    if (!node) return 160;

    if (node.type === 'GROUP') {
        const inputs = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
        const outputs = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT') || [];
        const count = Math.max(inputs.length, outputs.length);
        return Math.max(100, (count * 24) + 60);
    }

    if (node.type === 'COLLECTOR') {
        const count = node.data.inputCount || 2;
        return Math.max(120, (count * 24) + 60);
    }

    if (node.type === 'CUSTOM') return 240;
    if (node.type === 'TEMPLATE') return 220;
    if (node.type === 'FINAL') return 120;
    if (node.type === 'GAUGE' || node.type === 'LINE_CHART' || node.type === 'BAR_CHART' || node.type === 'TABLE') return 220;
    if (node.type === 'PROGRESS') return 140;
    if (node.type === 'RANGE') return 200;

    return 160;
};

// --- Standalone Engine Script (for Export) ---
const ENGINE_SCRIPT = `
/**
 * Standalone FlowCalc Engine
 * Generated automatically.
 */
function evaluateGraph(nodes, edges, contextInputs = {}) {
    const results = {};
    const memo = new Set(); 

    const getNodeValue = (nodeId, stack = []) => {
        if (stack.includes(nodeId)) return NaN; 
        if (results[nodeId] !== undefined) return results[nodeId];
        
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return 0;
        
        if (node.type === 'GROUP_INPUT') {
             return contextInputs[node.id] !== undefined ? contextInputs[node.id] : (node.data.value || 0);
        }

        const connectedEdges = edges.filter(e => e.target === node.id);
        
        const resolveSourceValue = (rawVal, handle) => {
            if (typeof rawVal === 'object' && rawVal !== null && handle) {
                return rawVal[handle] ?? 0;
            }
            if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) {
                return Object.values(rawVal)[0] ?? 0;
            }
            return rawVal;
        };

        // Robust Input Mapping
        const getInputs = () => {
            // Map based on specific handle definitions to ensure order
            const mapInput = (handleId) => {
                const edge = connectedEdges.find(e => e.targetHandle === handleId);
                if (!edge) return 0; // Default 0 if unconnected
                const raw = getNodeValue(edge.source, [...stack, nodeId]);
                return resolveSourceValue(raw, edge.sourceHandle);
            };

            if (node.type === 'COLLECTOR') {
                const arr = new Array(node.data.inputCount || 2).fill(0);
                connectedEdges.forEach(e => {
                    const idx = parseInt(e.targetHandle?.split('_')[1] || '0', 10);
                    if (!isNaN(idx)) {
                        const raw = getNodeValue(e.source, [...stack, nodeId]);
                        arr[idx] = resolveSourceValue(raw, e.sourceHandle);
                    }
                });
                return arr;
            }
            
            if (node.type === 'GAUGE') return [mapInput('val'), mapInput('min'), mapInput('max')];
            if (node.type === 'PROGRESS') return [mapInput('val'), mapInput('max')];
            if (node.type === 'RANGE') return [mapInput('start'), mapInput('end'), mapInput('step')];

            // Default linear mapping for nodes without named inputs
            return connectedEdges.map(e => {
                const raw = getNodeValue(e.source, [...stack, nodeId]);
                return resolveSourceValue(raw, e.sourceHandle);
            });
        };

        const inputVals = getInputs();
        
        let val = 0;
        try {
            switch(node.type) {
                case 'INPUT': val = node.data.value; break;
                case 'SUM': val = inputVals.reduce((a,b)=>a+b,0); break;
                case 'SUB': val = inputVals.length > 0 ? inputVals.reduce((a,b)=>a-b) : 0; break;
                case 'MUL': val = inputVals.reduce((a,b)=>a*b,1); break;
                case 'CUSTOM': 
                    const fn = new Function('inputs', node.data.func || 'return 0');
                    val = fn(inputVals);
                    break;
                case 'TEMPLATE': 
                    const template = node.data.template || '{0}';
                    val = template.replace(/{(\\d+)}/g, (m, i) => inputVals[i] !== undefined ? (typeof inputVals[i]==='number'?inputVals[i].toFixed(2):inputVals[i]) : m);
                    break;
                case 'RANGE':
                    const start = inputVals[0] ?? 0;
                    const end = inputVals[1] ?? 10;
                    const step = inputVals[2] ?? 1;
                    const len = Math.max(0, Math.floor((end - start) / step) + 1);
                    val = Array.from({length: len}, (_, i) => start + (i * step));
                    break;
                case 'COLLECTOR':
                    val = inputVals;
                    break;
                case 'FINAL':
                case 'GROUP_OUTPUT':
                case 'GAUGE':
                case 'PROGRESS':
                case 'LINE_CHART':
                case 'BAR_CHART':
                case 'TABLE':
                    val = inputVals.length > 0 ? inputVals[0] : 0;
                    break;
                case 'GROUP':
                    const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                    const subContext = {};
                    connectedEdges.forEach((edge) => {
                        const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle);
                        if (edge.targetHandle) {
                            subContext[edge.targetHandle] = sourceVal;
                        } else {
                            const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT');
                            if (firstInput) subContext[firstInput.id] = sourceVal;
                        }
                    });
                    
                    const subResults = evaluateGraph(subGraph.nodes, subGraph.edges, subContext);
                    
                    const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT');
                    if (outputs.length > 0) {
                        val = {};
                        outputs.forEach(out => {
                            val[out.id] = subResults[out.id];
                        });
                    } else {
                        val = 0;
                    }
                    break;
                default: val = 0;
            }
        } catch(e) { 
            console.error("Error calculating node", nodeId, e);
            val = NaN; 
        }
        
        results[nodeId] = val;
        return val;
    };
    
    nodes.forEach(n => getNodeValue(n.id));
    return results;
}
`;

// --- Components ---

const Handle = ({ type, position, onMouseDown, isValid, id }) => {
    return (
        <div
            className={`absolute w-4 h-4 rounded-full border-2 cursor-crosshair transition-all duration-200 z-10 flex items-center justify-center
        ${type === 'input' ? '-left-2' : '-right-2'}
        ${isValid ? 'bg-green-400 border-green-600 hover:scale-125' : 'bg-slate-200 border-slate-400 hover:border-blue-500'}
        -translate-y-1/2
      `}
            style={{ top: position.y }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown && onMouseDown(e, type, id);
            }}
            title={id ? `Port: ${id}` : 'Connection Port'}
        >
            <div className="w-1 h-1 bg-slate-400 rounded-full pointer-events-none" />
        </div>
    );
};

// Simple Charts
const GaugeChart = ({ value, min = 0, max = 100 }) => {
    const safeValue = typeof value === 'number' ? value : 0;
    const safeMin = typeof min === 'number' ? min : 0;
    const safeMax = typeof max === 'number' ? max : 100;

    const p = Math.max(safeMin, Math.min(safeMax, safeValue));
    const percent = (safeMax - safeMin) === 0 ? 0 : (p - safeMin) / (safeMax - safeMin);
    const angle = 180 * percent;
    return (
        <div className="relative w-full h-24 flex flex-col items-center justify-end overflow-hidden">
            <div className="absolute top-4 w-32 h-16 rounded-t-full bg-slate-100 border-4 border-slate-200" />
            <div
                className="absolute top-4 w-32 h-16 rounded-t-full border-4 border-blue-500 border-b-0 origin-bottom transition-transform duration-500"
                style={{ transform: `rotate(${angle - 180}deg)` }}
            />
            <span className="relative z-10 text-2xl font-bold text-slate-700 -mb-1">{Math.round(safeValue)}</span>
            <div className="flex justify-between w-full px-4 text-[10px] text-slate-400 mt-2">
                <span>{safeMin}</span>
                <span>{safeMax}</span>
            </div>
        </div>
    );
};

const LineChart = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) return <div className="text-xs text-slate-300 text-center py-8">No Data</div>;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d - min) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full h-32 bg-slate-50 rounded border border-slate-100 relative p-2 overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" />
            </svg>
        </div>
    );
};

const BarChart = ({ data }) => {
    if (!Array.isArray(data) || data.length === 0) return <div className="text-xs text-slate-300 text-center py-8">No Data</div>;
    const max = Math.max(...data, 1);
    return (
        <div className="w-full h-32 bg-slate-50 rounded border border-slate-100 flex items-end gap-1 p-2">
            {data.map((d, i) => (
                <div key={i} className="flex-1 bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-all" style={{ height: `${Math.max((d / max) * 100, 5)}%` }} title={d} />
            ))}
        </div>
    );
};

const DataTable = ({ data }) => {
    const arr = Array.isArray(data) ? data : [data];
    return (
        <div className="w-full h-32 overflow-auto bg-white border border-slate-200 rounded text-xs">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <th className="p-1 pl-2">Index</th>
                        <th className="p-1">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {arr.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50">
                            <td className="p-1 pl-2 text-slate-400 font-mono">{i}</td>
                            <td className="p-1 font-mono text-blue-600 truncate max-w-[100px]" title={typeof row === 'object' ? JSON.stringify(row) : String(row)}>
                                {typeof row === 'object' ? JSON.stringify(row) : String(row)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const Node = ({ id, type, data, position, selected, isHovered, onDragStart, onDelete, onUpdateData, onStartConnect, onOpenEditor, inputs, result, onEnterGroup }) => {
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

const ConnectionLine = ({ id, start, end, onDelete }) => {
    const d = getBezierPath(start, end);
    return (
        <g className="group">
            <path d={d} stroke="rgba(59, 130, 246, 0.5)" strokeWidth="4" fill="none" className="transition-colors duration-200 group-hover:stroke-red-200" />
            <path d={d} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-dash transition-colors duration-200 group-hover:stroke-red-500" />
            <circle cx={end[0]} cy={end[1]} r="3" fill="#3b82f6" className="transition-colors duration-200 group-hover:fill-red-500" />
            <path d={d} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer pointer-events-auto" onDoubleClick={(e) => { e.stopPropagation(); onDelete(id); }} >
                <title>Double-click to delete</title>
            </path>
        </g>
    );
};

const BackgroundGrid = ({ offset }) => (
    <svg className="absolute inset-0 w-full h-full -z-10 opacity-10 pointer-events-none">
        <pattern id="grid" x={offset.x % 40} y={offset.y % 40} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
);

const SelectionBox = ({ rect }) => {
    if (!rect) return null;
    const width = Math.abs(rect.current.x - rect.start.x);
    const height = Math.abs(rect.current.y - rect.start.y);
    const x = Math.min(rect.current.x, rect.start.x);
    const y = Math.min(rect.current.y, rect.start.y);

    return (
        <div
            className="absolute border border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none z-50"
            style={{ left: x, top: y, width, height }}
        />
    );
};

const CodeEditorModal = ({ isOpen, initialCode, onSave, onClose }) => {
    const [code, setCode] = useState(initialCode);
    useEffect(() => { if (isOpen) setCode(initialCode || 'return inputs.reduce((a,b) => a+b, 0);'); }, [isOpen, initialCode]);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl flex flex-col h-[80vh]">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                    <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Code className="text-blue-600" /> Edit Custom Logic</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="flex-1 p-0 relative">
                    <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-full p-4 font-mono text-sm bg-slate-900 text-green-400 resize-none focus:outline-none" spellCheck={false} />
                </div>
                <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50 rounded-b-lg">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancel</button>
                    <button onClick={() => onSave(code)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"><Save size={16} /> Save Changes</button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Logic ---

export default function NodeCalcApp() {
    const [nodes, setNodes] = useState([
        { id: '1', type: 'INPUT', position: { x: 50, y: 50 }, data: { value: 10, label: 'Base Price' } },
        { id: '2', type: 'INPUT', position: { x: 50, y: 350 }, data: { value: 20, label: 'Tax Rate' } },
        { id: '3', type: 'SUM', position: { x: 400, y: 200 }, data: { label: 'Subtotal' } },
        { id: '4', type: 'MUL', position: { x: 750, y: 200 }, data: { value: 2, label: 'Final Total' } },
    ]);
    const [edges, setEdges] = useState([
        { id: 'e1-3', source: '1', target: '3' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
    ]);

    const [path, setPath] = useState([]);
    const [results, setResults] = useState({});
    const [generatedCode, setGeneratedCode] = useState('');
    const fileInputRef = useRef(null);
    const containerRef = useRef(null);

    const [dragState, setDragState] = useState(null);
    const [connectionState, setConnectionState] = useState(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(1);
    const [hoverGroup, setHoverGroup] = useState(null);

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectionBox, setSelectionBox] = useState(null);
    const [editor, setEditor] = useState({ isOpen: false, nodeId: null, code: '' });

    const NODE_WIDTH = 256;

    // --- IO Handlers ---

    const handleSave = () => {
        const config = { nodes, edges, viewport: { pan, scale } };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flowcalc-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLoad = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const config = JSON.parse(event.target.result);
                if (Array.isArray(config.nodes) && Array.isArray(config.edges)) {
                    setNodes(config.nodes);
                    setEdges(config.edges);
                    if (config.viewport) {
                        setPan(config.viewport.pan || { x: 0, y: 0 });
                        setScale(config.viewport.scale || 1);
                    }
                }
            } catch (err) {
                console.error("Failed to load config", err);
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    const handleExportJS = () => {
        if (path.length > 0) {
            alert("Please return to Root level to export the full application.");
            return;
        }
        const graphData = { nodes, edges };
        const fileContent = `
${ENGINE_SCRIPT}
const graphData = ${JSON.stringify(graphData, null, 2)};
console.log("Starting Calculation...");
const results = evaluateGraph(graphData.nodes, graphData.edges);
console.log("Final Results:", results);
if (typeof module !== 'undefined') module.exports = { evaluateGraph, graphData };
`;
        const blob = new Blob([fileContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flowcalc-runner.js`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Helpers ---

    const enterGroup = (groupId) => {
        const groupNode = nodes.find(n => n.id === groupId);
        if (!groupNode || groupNode.type !== 'GROUP') return;
        const subGraph = groupNode.data.subGraph || { nodes: [], edges: [] };
        setPath(prev => [...prev, { id: groupId, label: groupNode.data.label || 'Group', nodes, edges, viewport: { pan, scale } }]);
        setNodes(subGraph.nodes);
        setEdges(subGraph.edges);
        setPan({ x: 0, y: 0 });
        setScale(1);
        setConnectionState(null);
        setSelectedIds(new Set());
    };

    const jumpToPath = (index) => {
        const unwind = (targetIdx) => {
            let currN = nodes;
            let currE = edges;
            const stack = [...path];
            while (stack.length > targetIdx + 1) {
                const frame = stack.pop();
                const groupId = frame.id;
                currN = frame.nodes.map(n =>
                    n.id === groupId ? { ...n, data: { ...n.data, subGraph: { nodes: currN, edges: currE } } } : n
                );
                currE = frame.edges;
            }
            setNodes(currN);
            setEdges(currE);
            if (stack.length === 0) { setPan({ x: 0, y: 0 }); setScale(1); }
            setPath(stack);
            setSelectedIds(new Set());
        };
        unwind(index);
    };

    const getHandlePosition = (nodeId, type, handleId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return [0, 0];

        let y = node.position.y;
        let x = node.position.x;

        if (type === 'input') {
            if (node.type === 'GROUP' && handleId) {
                const handles = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
                const idx = handles.findIndex(h => h.id === handleId);
                if (idx !== -1) y += 40 + (idx * 24);
                else y += 50;
            } else if (node.type === 'COLLECTOR') {
                const idx = parseInt(handleId?.split('_')[1] || '0', 10);
                y += 40 + (idx * 24);
            } else if (node.type === 'RANGE') {
                if (handleId === 'start') y += 40;
                else if (handleId === 'end') y += 64;
                else if (handleId === 'step') y += 88;
                else y += 40;
            } else if (node.type === 'GAUGE') {
                if (handleId === 'val') y += 40;
                else if (handleId === 'min') y += 64;
                else if (handleId === 'max') y += 88;
                else y += 40;
            } else if (node.type === 'PROGRESS') {
                if (handleId === 'val') y += 40;
                else if (handleId === 'max') y += 64;
                else y += 40;
            } else if (node.type === 'CUSTOM') {
                y += 100;
            } else if (node.type !== 'INPUT' && node.type !== 'GROUP_INPUT') {
                // For generic nodes without named input handles, center vertically
                // The visual handle is at "top: 50%" relative to the node
                const h = getNodeHeight(node);
                y += h / 2;
            } else {
                y += 20;
            }
        } else {
            // Output
            x += NODE_WIDTH;
            if (node.type === 'GROUP' && handleId) {
                const handles = node.data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT') || [];
                const idx = handles.findIndex(h => h.id === handleId);
                if (idx !== -1) y += 40 + (idx * 24);
                else y += 50;
            } else {
                const height = getNodeHeight(node);
                y += height / 2;
            }
        }

        return [x, y];
    };

    useEffect(() => {
        const evaluateScope = (graphNodes, graphEdges, contextInputs = {}) => {
            const localResults = {};
            const getNodeValue = (nodeId, stack = []) => {
                if (stack.includes(nodeId)) return NaN;
                if (localResults[nodeId] !== undefined) return localResults[nodeId];

                const node = graphNodes.find(n => n.id === nodeId);
                if (!node) return 0;

                if (node.type === 'GROUP_INPUT') {
                    return contextInputs[node.id] !== undefined ? contextInputs[node.id] : (node.data.value || 0);
                }

                const connectedEdges = graphEdges.filter(e => e.target === node.id);

                const resolveSourceValue = (rawVal, handle) => {
                    if (typeof rawVal === 'object' && rawVal !== null && handle) return rawVal[handle] ?? 0;
                    if (typeof rawVal === 'object' && rawVal !== null && !Array.isArray(rawVal)) return Object.values(rawVal)[0] ?? 0;
                    return rawVal;
                };

                const getInputs = () => {
                    const mapInput = (handleId) => {
                        const edge = connectedEdges.find(e => e.targetHandle === handleId);
                        if (!edge) return 0;
                        const raw = getNodeValue(edge.source, [...stack, nodeId]);
                        return resolveSourceValue(raw, edge.sourceHandle);
                    };

                    if (node.type === 'COLLECTOR') {
                        const arr = new Array(node.data.inputCount || 2).fill(0);
                        connectedEdges.forEach(e => {
                            const idx = parseInt(e.targetHandle?.split('_')[1] || '0', 10);
                            if (!isNaN(idx)) {
                                const raw = getNodeValue(e.source, [...stack, nodeId]);
                                arr[idx] = resolveSourceValue(raw, e.sourceHandle);
                            }
                        });
                        return arr;
                    }

                    if (node.type === 'GAUGE') return [mapInput('val'), mapInput('min'), mapInput('max')];
                    if (node.type === 'PROGRESS') return [mapInput('val'), mapInput('max')];
                    if (node.type === 'RANGE') return [mapInput('start'), mapInput('end'), mapInput('step')];

                    return connectedEdges.map(e => {
                        const raw = getNodeValue(e.source, [...stack, nodeId]);
                        return resolveSourceValue(raw, e.sourceHandle);
                    });
                };

                const inputVals = getInputs();

                let val = 0;
                try {
                    switch (node.type) {
                        case 'INPUT': val = node.data.value; break;
                        case 'SUM': val = inputVals.reduce((a, b) => a + b, 0); break;
                        case 'SUB': val = inputVals.length > 0 ? inputVals.reduce((a, b) => a - b) : 0; break;
                        case 'MUL': val = inputVals.reduce((a, b) => a * b, 1); break;
                        case 'CUSTOM':
                            const fn = new Function('inputs', node.data.func || 'return 0');
                            val = fn(inputVals);
                            break;
                        case 'TEMPLATE':
                            const template = node.data.template || '{0}';
                            val = template.replace(/{(\d+)}/g, (m, i) => inputVals[i] !== undefined ? (typeof inputVals[i] === 'number' ? inputVals[i].toFixed(2) : inputVals[i]) : m);
                            break;
                        case 'RANGE':
                            const start = inputVals[0] ?? 0;
                            const end = inputVals[1] ?? 10;
                            const step = inputVals[2] ?? 1;
                            const len = Math.max(0, Math.floor((end - start) / step) + 1);
                            val = Array.from({ length: len }, (_, i) => start + (i * step));
                            break;
                        case 'COLLECTOR':
                            val = inputVals;
                            break;
                        case 'FINAL':
                        case 'GROUP_OUTPUT':
                        case 'GAUGE':
                        case 'PROGRESS':
                        case 'LINE_CHART':
                        case 'BAR_CHART':
                        case 'TABLE':
                            val = inputVals.length > 0 ? inputVals[0] : 0;
                            break;
                        case 'GROUP':
                            const subGraph = node.data.subGraph || { nodes: [], edges: [] };
                            const subContext = {};
                            connectedEdges.forEach((edge) => {
                                const sourceVal = resolveSourceValue(getNodeValue(edge.source, [...stack, nodeId]), edge.sourceHandle);
                                if (edge.targetHandle) {
                                    subContext[edge.targetHandle] = sourceVal;
                                } else {
                                    const firstInput = subGraph.nodes.find(n => n.type === 'GROUP_INPUT');
                                    if (firstInput) subContext[firstInput.id] = sourceVal;
                                }
                            });
                            const subResults = evaluateScope(subGraph.nodes, subGraph.edges, subContext);
                            const outputs = subGraph.nodes.filter(n => n.type === 'GROUP_OUTPUT');
                            if (outputs.length > 0) {
                                val = {};
                                outputs.forEach(out => { val[out.id] = subResults[out.id]; });
                            } else {
                                val = 0;
                            }
                            break;
                        default: val = 0;
                    }
                } catch (e) { val = NaN; }
                localResults[nodeId] = val;
                return val;
            };
            graphNodes.forEach(n => getNodeValue(n.id));
            return localResults;
        };

        let currentContext = {};
        if (path.length > 0) {
            for (let i = 0; i < path.length; i++) {
                const frame = path[i];
                const frameNodes = frame.nodes;
                const frameEdges = frame.edges;
                const frameResults = evaluateScope(frameNodes, frameEdges, currentContext);
                const groupId = frame.id;
                const groupNode = frameNodes.find(n => n.id === groupId);

                if (groupNode) {
                    const subContext = {};
                    const connectedEdges = frameEdges.filter(e => e.target === groupId);
                    connectedEdges.forEach(edge => {
                        const rawVal = frameResults[edge.source];
                        let val = rawVal;
                        if (typeof rawVal === 'object' && rawVal !== null && edge.sourceHandle) {
                            val = rawVal[edge.sourceHandle];
                        } else if (typeof rawVal === 'object' && rawVal !== null) {
                            val = Object.values(rawVal)[0];
                        }
                        if (edge.targetHandle) subContext[edge.targetHandle] = val;
                    });
                    currentContext = subContext;
                }
            }
        }
        const finalResults = evaluateScope(nodes, edges, currentContext);
        setResults(finalResults);
        setGeneratedCode(`// Calculated ${Object.keys(finalResults).length} values.\n// Live updates enabled.`);
    }, [nodes, edges, path]);

    // --- Handlers (Mouse/Key) ---

    const handleWheel = useCallback((e) => {
        e.preventDefault(); e.stopPropagation();
        const zoomSensitivity = 0.001;
        const minScale = 0.1; const maxScale = 3;
        const delta = -e.deltaY * zoomSensitivity;
        const newScale = Math.min(Math.max(minScale, scale + delta), maxScale);
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const scaleRatio = newScale / scale;
        const newPan = { x: mouseX - (mouseX - pan.x) * scaleRatio, y: mouseY - (mouseY - pan.y) * scaleRatio };
        setScale(newScale); setPan(newPan);
    }, [scale, pan]);

    const handleMouseDown = (e) => {
        if (e.button === 0 && e.target === containerRef.current) {
            if (!e.shiftKey) setSelectedIds(new Set());
            const rect = containerRef.current.getBoundingClientRect();
            const x = (e.clientX - rect.left - pan.x) / scale;
            const y = (e.clientY - rect.top - pan.y) / scale;
            setSelectionBox({ start: { x, y }, current: { x, y } });
            if (!e.shiftKey) {
                setSelectionBox(null);
                setDragState({ type: 'pan', startPan: { ...pan }, startMouse: { x: e.clientX, y: e.clientY } });
            }
        }
    };

    const handleNodeDragStart = (e, id) => {
        e.stopPropagation();
        let newSelectedIds = new Set(selectedIds);
        if (e.shiftKey) {
            if (newSelectedIds.has(id)) newSelectedIds.delete(id);
            else newSelectedIds.add(id);
        } else {
            if (!newSelectedIds.has(id)) newSelectedIds = new Set([id]);
        }
        setSelectedIds(newSelectedIds);
        setDragState({ type: 'node', ids: Array.from(newSelectedIds), startMouse: { x: e.clientX, y: e.clientY } });
    };

    const handleConnectionStart = (e, sourceId, handleId) => {
        e.stopPropagation();
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;
        setConnectionState({ sourceId, sourceHandle: handleId, mousePos: { x, y } });
    };

    const handleMouseMove = useCallback((e) => {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;

        if (selectionBox) {
            setSelectionBox(prev => ({ ...prev, current: { x, y } }));
            const startX = Math.min(selectionBox.start.x, x);
            const endX = Math.max(selectionBox.start.x, x);
            const startY = Math.min(selectionBox.start.y, y);
            const endY = Math.max(selectionBox.start.y, y);
            const selected = new Set();
            nodes.forEach(n => {
                const nh = getNodeHeight(n);
                const overlap = (n.position.x < endX && n.position.x + NODE_WIDTH > startX && n.position.y < endY && n.position.y + nh > startY);
                if (overlap) selected.add(n.id);
            });
            setSelectedIds(selected);
        }

        if (dragState) {
            if (dragState.type === 'node') {
                const dx = (e.clientX - dragState.startMouse.x) / scale;
                const dy = (e.clientY - dragState.startMouse.y) / scale;
                setNodes(ns => ns.map(n => {
                    if (dragState.ids.includes(n.id)) {
                        return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
                    }
                    return n;
                }));
                setDragState(prev => ({ ...prev, startMouse: { x: e.clientX, y: e.clientY } }));

                if (dragState.ids.length === 1) {
                    const draggingNode = nodes.find(n => n.id === dragState.ids[0]);
                    if (draggingNode && draggingNode.type !== 'GROUP_INPUT' && draggingNode.type !== 'GROUP_OUTPUT') {
                        const targetGroup = nodes.find(n =>
                            n.id !== draggingNode.id && n.type === 'GROUP' &&
                            x >= n.position.x && x <= n.position.x + NODE_WIDTH &&
                            y >= n.position.y && y <= n.position.y + getNodeHeight(n)
                        );
                        setHoverGroup(targetGroup ? targetGroup.id : null);
                    }
                }
            } else if (dragState.type === 'pan') {
                setPan({ x: dragState.startPan.x + (e.clientX - dragState.startMouse.x), y: dragState.startPan.y + (e.clientY - dragState.startMouse.y) });
            }
        }
        if (connectionState) setConnectionState(prev => ({ ...prev, mousePos: { x, y } }));
    }, [dragState, connectionState, pan, scale, nodes, selectionBox]);

    const handleMouseUp = (e) => {
        if (dragState?.type === 'node' && hoverGroup && dragState.ids.length === 1) {
            const draggedNode = nodes.find(n => n.id === dragState.ids[0]);
            const targetGroupNode = nodes.find(n => n.id === hoverGroup);
            if (draggedNode && targetGroupNode) {
                const remainingNodes = nodes.filter(n => n.id !== draggedNode.id);
                const remainingEdges = edges.filter(e => e.source !== draggedNode.id && e.target !== draggedNode.id);
                const subGraph = targetGroupNode.data.subGraph || { nodes: [], edges: [] };
                const newNode = { ...draggedNode, position: { x: 50 + (subGraph.nodes.length * 20), y: 50 + (subGraph.nodes.length * 20) } };
                const newSubGraph = { ...subGraph, nodes: [...subGraph.nodes, newNode] };
                setNodes(remainingNodes.map(n => n.id === hoverGroup ? { ...n, data: { ...n.data, subGraph: newSubGraph } } : n));
                setEdges(remainingEdges);
                setSelectedIds(new Set());
            }
        }

        if (connectionState) {
            const rect = containerRef.current.getBoundingClientRect();
            const mx = (e.clientX - rect.left - pan.x) / scale;
            const my = (e.clientY - rect.top - pan.y) / scale;
            const targetNode = [...nodes].reverse().find(n => {
                const height = getNodeHeight(n);
                return mx >= n.position.x - 20 && mx <= n.position.x + NODE_WIDTH + 20 && my >= n.position.y - 20 && my <= n.position.y + height + 20;
            });

            if (targetNode && targetNode.id !== connectionState.sourceId) {
                let targetHandle = null;
                // Determine Target Handle based on drop position
                if (targetNode.type === 'GROUP') {
                    const handles = targetNode.data.subGraph?.nodes.filter(n => n.type === 'GROUP_INPUT') || [];
                    let minDist = 1000;
                    handles.forEach((h, i) => {
                        const hy = targetNode.position.y + 40 + (i * 24);
                        const dist = Math.abs(my - hy);
                        if (dist < 20 && dist < minDist) { minDist = dist; targetHandle = h.id; }
                    });
                    if (!targetHandle && handles.length > 0) targetHandle = handles[0].id;
                } else if (targetNode.type === 'COLLECTOR') {
                    const count = targetNode.data.inputCount || 2;
                    let minDist = 1000;
                    for (let i = 0; i < count; i++) {
                        const hy = targetNode.position.y + 40 + (i * 24);
                        const dist = Math.abs(my - hy);
                        if (dist < 20 && dist < minDist) { minDist = dist; targetHandle = `in_${i}`; }
                    }
                } else if (targetNode.type === 'RANGE') {
                    if (Math.abs(my - (targetNode.position.y + 40)) < 20) targetHandle = 'start';
                    else if (Math.abs(my - (targetNode.position.y + 64)) < 20) targetHandle = 'end';
                    else targetHandle = 'step';
                } else if (targetNode.type === 'GAUGE') {
                    if (Math.abs(my - (targetNode.position.y + 40)) < 20) targetHandle = 'val';
                    else if (Math.abs(my - (targetNode.position.y + 64)) < 20) targetHandle = 'min';
                    else targetHandle = 'max';
                } else if (targetNode.type === 'PROGRESS') {
                    if (Math.abs(my - (targetNode.position.y + 40)) < 20) targetHandle = 'val';
                    else targetHandle = 'max';
                }

                const exists = edges.some(edge =>
                    edge.source === connectionState.sourceId &&
                    edge.target === targetNode.id &&
                    edge.targetHandle === targetHandle &&
                    edge.sourceHandle === connectionState.sourceHandle
                );

                if (!exists) {
                    setEdges(prev => [...prev, { id: `e-${generateId()}`, source: connectionState.sourceId, target: targetNode.id, targetHandle, sourceHandle: connectionState.sourceHandle }]);
                }
            }
        }
        setDragState(null);
        setConnectionState(null);
        setSelectionBox(null);
        setHoverGroup(null);
    };

    const addNode = (type) => {
        const id = generateId();
        const rect = containerRef.current.getBoundingClientRect();
        const x = (-pan.x + rect.width / 2) / scale - 100;
        const y = (-pan.y + rect.height / 2) / scale - 50;
        setNodes(prev => [...prev, { id, type, position: { x, y }, data: { value: 0, label: '', subGraph: { nodes: [], edges: [] } } }]);
    };

    const handleSaveEditor = (newCode) => {
        setNodes(ns => ns.map(n => n.id === editor.nodeId ? { ...n, data: { ...n.data, func: newCode } } : n));
        setEditor({ isOpen: false, nodeId: null, code: '' });
    };

    // --- Render ---
    return (
        <div className="flex w-full h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
            <CodeEditorModal isOpen={editor.isOpen} initialCode={editor.code} onClose={() => setEditor({ ...editor, isOpen: false })} onSave={handleSaveEditor} />

            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-30 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FlowCalc</h1>
                </div>

                <div className="px-4 py-2 border-b border-slate-100 flex gap-2 flex-wrap">
                    <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"><Download size={14} /></button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"><Upload size={14} /></button>
                    <button onClick={handleExportJS} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold"><FileJson size={14} /></button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleLoad} />
                </div>

                <div className="p-4 space-y-2 overflow-y-auto flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data</p>
                    <button onClick={() => addNode('INPUT')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><GripVertical size={14} /></div> Number Input</button>
                    <button onClick={() => addNode('RANGE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><Activity size={14} /></div> Range Generator</button>
                    <button onClick={() => addNode('COLLECTOR')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><ListPlus size={14} /></div> Array Collector</button>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Math</p>
                    <button onClick={() => addNode('SUM')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-blue-100 text-blue-600 rounded"><Plus size={14} /></div> Sum</button>
                    <button onClick={() => addNode('SUB')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-orange-100 text-orange-600 rounded"><Minus size={14} /></div> Subtract</button>
                    <button onClick={() => addNode('MUL')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-purple-100 text-purple-600 rounded"><X size={14} /></div> Multiply</button>
                    <button onClick={() => addNode('CUSTOM')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-slate-800 text-white rounded"><Code size={14} /></div> Custom JS</button>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Visuals</p>
                    <button onClick={() => addNode('GAUGE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><Gauge size={14} /></div> Gauge</button>
                    <button onClick={() => addNode('PROGRESS')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><Percent size={14} /></div> Progress Bar</button>
                    <button onClick={() => addNode('LINE_CHART')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><TrendingUp size={14} /></div> Line Chart</button>
                    <button onClick={() => addNode('BAR_CHART')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><BarChartIcon size={14} /></div> Bar Chart</button>
                    <button onClick={() => addNode('TABLE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><TableIcon size={14} /></div> Data Table</button>
                    <button onClick={() => addNode('TEMPLATE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-yellow-100 text-yellow-600 rounded"><FileText size={14} /></div> Text Template</button>
                    <button onClick={() => addNode('FINAL')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><Flag size={14} /></div> Final Result</button>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Advanced</p>
                    <button onClick={() => addNode('GROUP')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-indigo-100 text-indigo-600 rounded"><Box size={14} /></div> Group Logic</button>
                    {path.length > 0 && (
                        <>
                            <button onClick={() => addNode('GROUP_INPUT')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-pink-100 text-pink-600 rounded"><ArrowRight size={14} /></div> Group Input</button>
                            <button onClick={() => addNode('GROUP_OUTPUT')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-pink-100 text-pink-600 rounded"><ArrowLeft size={14} /></div> Group Output</button>
                        </>
                    )}
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-slate-50 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            >
                <BackgroundGrid offset={pan} />
                {selectionBox && (
                    <div style={{
                        position: 'absolute',
                        left: Math.min(selectionBox.start.x, selectionBox.current.x) * scale + pan.x,
                        top: Math.min(selectionBox.start.y, selectionBox.current.y) * scale + pan.y,
                        width: Math.abs(selectionBox.current.x - selectionBox.start.x) * scale,
                        height: Math.abs(selectionBox.current.y - selectionBox.start.y) * scale,
                        border: '1px dashed #3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        pointerEvents: 'none',
                        zIndex: 100
                    }} />
                )}
                <div className="absolute top-4 left-4 z-40 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm">
                    <button onClick={() => jumpToPath(-1)} className={`hover:text-blue-600 ${path.length === 0 ? 'font-bold text-blue-600' : 'text-slate-500'}`}>Root</button>
                    {path.map((item, idx) => (
                        <React.Fragment key={item.id}>
                            <ChevronRight size={14} className="text-slate-300" />
                            <button onClick={() => jumpToPath(idx)} className={`hover:text-blue-600 ${idx === path.length - 1 ? 'font-bold text-blue-600' : 'text-slate-500'}`}>{item.label}</button>
                        </React.Fragment>
                    ))}
                </div>
                <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }} className="relative w-full h-full">
                    <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none z-0">
                        {edges.map(edge => {
                            const start = getHandlePosition(edge.source, 'output', edge.sourceHandle);
                            const end = getHandlePosition(edge.target, 'input', edge.targetHandle);
                            return <ConnectionLine key={edge.id} id={edge.id} start={start} end={end} onDelete={(id) => setEdges(prev => prev.filter(e => e.id !== id))} />;
                        })}
                        {connectionState && (
                            <path d={getBezierPath(getHandlePosition(connectionState.sourceId, 'output', connectionState.sourceHandle), [connectionState.mousePos.x, connectionState.mousePos.y])} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="opacity-60" />
                        )}
                    </svg>
                    {nodes.map(node => (
                        <Node
                            key={node.id}
                            {...node}
                            inputs={edges.filter(e => e.target === node.id).map(e => results[e.source] || 0)}
                            result={results[node.id]}
                            selected={selectedIds.has(node.id)}
                            isHovered={hoverGroup === node.id}
                            onDragStart={handleNodeDragStart}
                            onDelete={(id) => { setNodes(prev => prev.filter(n => n.id !== id)); setEdges(prev => prev.filter(e => e.source !== id && e.target !== id)); }}
                            onUpdateData={(id, data) => setNodes(ns => ns.map(n => n.id === id ? { ...n, data } : n))}
                            onStartConnect={handleConnectionStart}
                            onEnterGroup={enterGroup}
                            onOpenEditor={(id, code) => setEditor({ isOpen: true, nodeId: id, code })}
                        />
                    ))}
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                    <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600">+</button>
                    <button onClick={() => setScale(1)} className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600 text-xs font-bold w-8">{Math.round(scale * 100)}%</button>
                    <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 bg-white rounded shadow text-slate-600 hover:text-blue-600">-</button>
                </div>
            </div>
            <style>{`@keyframes dash { to { stroke-dashoffset: -20; } } .animate-dash { animation: dash 1s linear infinite; }`}</style>
        </div>
    );
}