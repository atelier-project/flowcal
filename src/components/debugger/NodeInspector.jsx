import React, { useState } from 'react';
import { X, Activity, Database, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { getDefinition } from '../../engine/nodeDefinitions';

export const NodeInspector = ({ node, result, onClose }) => {
    const [showInternal, setShowInternal] = useState(false);

    if (!node) return null;

    const def = getDefinition(node.type);

    // Format value for display
    const formatValue = (val, truncate = false) => {
        if (val === undefined) return <span className="text-slate-400 italic">undefined</span>;
        if (val === null) return <span className="text-slate-400 italic">null</span>;

        const type = typeof val;

        if (type === 'string') return <span className="text-green-400">"{val}"</span>;
        if (type === 'number') return <span className="text-blue-400">{val}</span>;
        if (type === 'boolean') return <span className="text-purple-400">{val.toString().toUpperCase()}</span>;

        if (Array.isArray(val)) {
            const isEmpty = val.length === 0;
            return (
                <div className="text-slate-300">
                    <span className="text-yellow-500">Array({val.length}){isEmpty ? ' []' : ''}</span>
                    {!isEmpty && (
                        <div className="pl-4 border-l-2 border-slate-700 mt-1">
                            {val.map((item, i) => (
                                <div key={i} className="whitespace-nowrap overflow-hidden text-ellipsis">
                                    <span className="text-slate-500 text-xs mr-2">{i}:</span>
                                    {/* Truncate nested arrays/objects if requested, otherwise show full */}
                                    {formatValue(item, truncate)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'object') {
            const keys = Object.keys(val);
            const isEmpty = keys.length === 0;
            return (
                <div className="text-slate-300">
                    <span className="text-yellow-500">Object{isEmpty ? ' {}' : ''}</span>
                    {!isEmpty && (
                        <div className="pl-4 border-l-2 border-slate-700 mt-1">
                            {keys.map(key => (
                                <div key={key} className="whitespace-nowrap overflow-hidden text-ellipsis">
                                    <span className="text-purple-300 text-xs mr-2">{key}:</span>
                                    {formatValue(val[key], truncate)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return <span className="text-slate-300">{String(val)}</span>;
    };

    return (
        <div className="absolute top-20 right-4 w-96 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl overflow-hidden z-[60] text-sm flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 shrink-0">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Activity size={16} className="text-green-500" />
                    Node Inspector
                </div>
                <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
                {/* Identity Section */}
                <div className="p-3 border-b border-slate-800">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Node Identity</div>
                    <div className="text-white font-mono font-bold text-base">{node.data.label || def.label || 'Unnamed Node'}</div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">ID: {node.id}</span>
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-700">TYPE: {node.type}</span>
                    </div>
                </div>

                {/* Output/Result Section - Expandable */}
                <div className="p-3 border-b border-slate-800 bg-slate-900/50">
                    <div className="text-xs text-green-500 uppercase font-bold tracking-wider mb-2 flex items-center gap-2">
                        <ArrowRight size={12} />
                        Current Output
                    </div>
                    <div className="font-mono bg-black/50 p-2 rounded border border-slate-800 overflow-x-auto min-h-[3rem]">
                        {formatValue(result, false)}
                    </div>
                </div>

                {/* Internal Data Section - Collapsible */}
                <div className="border-t border-slate-800">
                    <button
                        onClick={() => setShowInternal(!showInternal)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider flex items-center gap-2">
                            <Database size={12} />
                            Internal Data
                        </div>
                        {showInternal ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                    </button>

                    {showInternal && (
                        <div className="p-3 pt-0 bg-slate-900/30">
                            <div className="font-mono bg-black/30 p-2 rounded border border-slate-800/50 overflow-x-auto text-xs text-slate-400">
                                <pre>{JSON.stringify(node.data, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
