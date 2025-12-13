import React from 'react';
import {
    Download, Upload, FileJson, GripVertical, Activity, ListPlus,
    Plus, Minus, X, Code, Gauge, Percent, TrendingUp, BarChart as BarChartIcon,
    Table as TableIcon, FileText, Flag, Box, ArrowRight, ArrowLeft
} from 'lucide-react';

export const Sidebar = ({ onAddNode, onSave, onLoad, onExportJS, fileInputRef, pathLength }) => {
    return (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-30 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FlowCalc</h1>
            </div>

            <div className="px-4 py-2 border-b border-slate-100 flex gap-2 flex-wrap">
                <button onClick={onSave} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"><Download size={14} /></button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"><Upload size={14} /></button>
                <button onClick={onExportJS} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold"><FileJson size={14} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onLoad} />
            </div>

            <div className="p-4 space-y-2 overflow-y-auto flex-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data</p>
                <button onClick={() => onAddNode('INPUT')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><GripVertical size={14} /></div> Number Input</button>
                <button onClick={() => onAddNode('RANGE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><Activity size={14} /></div> Range Generator</button>
                <button onClick={() => onAddNode('COLLECTOR')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><ListPlus size={14} /></div> Array Collector</button>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Math</p>
                <button onClick={() => onAddNode('SUM')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-blue-100 text-blue-600 rounded"><Plus size={14} /></div> Sum</button>
                <button onClick={() => onAddNode('SUB')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-orange-100 text-orange-600 rounded"><Minus size={14} /></div> Subtract</button>
                <button onClick={() => onAddNode('MUL')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-purple-100 text-purple-600 rounded"><X size={14} /></div> Multiply</button>
                <button onClick={() => onAddNode('CUSTOM')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-slate-800 text-white rounded"><Code size={14} /></div> Custom JS</button>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Visuals</p>
                <button onClick={() => onAddNode('GAUGE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><Gauge size={14} /></div> Gauge</button>
                <button onClick={() => onAddNode('PROGRESS')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><Percent size={14} /></div> Progress Bar</button>
                <button onClick={() => onAddNode('LINE_CHART')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><TrendingUp size={14} /></div> Line Chart</button>
                <button onClick={() => onAddNode('BAR_CHART')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><BarChartIcon size={14} /></div> Bar Chart</button>
                <button onClick={() => onAddNode('TABLE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-teal-100 text-teal-600 rounded"><TableIcon size={14} /></div> Data Table</button>
                <button onClick={() => onAddNode('TEMPLATE')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-yellow-100 text-yellow-600 rounded"><FileText size={14} /></div> Text Template</button>
                <button onClick={() => onAddNode('FINAL')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-green-100 text-green-600 rounded"><Flag size={14} /></div> Final Result</button>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4">Advanced</p>
                <button onClick={() => onAddNode('GROUP')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-indigo-100 text-indigo-600 rounded"><Box size={14} /></div> Group Logic</button>
                {pathLength > 0 && (
                    <>
                        <button onClick={() => onAddNode('GROUP_INPUT')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-pink-100 text-pink-600 rounded"><ArrowRight size={14} /></div> Group Input</button>
                        <button onClick={() => onAddNode('GROUP_OUTPUT')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium"><div className="p-1 bg-pink-100 text-pink-600 rounded"><ArrowLeft size={14} /></div> Group Output</button>
                    </>
                )}
            </div>
        </div>
    );
};
