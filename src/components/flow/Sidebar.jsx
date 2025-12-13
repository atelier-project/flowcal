import React, { useMemo } from 'react';
import { Download, Upload, FileJson } from 'lucide-react';
import { NODE_LOGIC } from '../../engine/nodeDefinitions';
import { getUI } from './nodeUIMap';

export const Sidebar = ({ onAddNode, onSave, onLoad, onExportJS, fileInputRef, pathLength }) => {

    const categories = useMemo(() => {
        const cats = {};
        Object.values(NODE_LOGIC).forEach(def => {
            if (!cats[def.category]) cats[def.category] = [];
            cats[def.category].push(def);
        });
        return cats;
    }, []);

    const CategorySection = ({ title, nodes }) => {
        if (!nodes || nodes.length === 0) return null;
        return (
            <>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">{title}</p>
                {nodes.map(def => {
                    if (def.type === 'GROUP_INPUT' || def.type === 'GROUP_OUTPUT') {
                        if (pathLength === 0) return null; // Show only inside groups
                    }
                    const ui = getUI(def.type);
                    const Icon = ui.icon;
                    return (
                        <button
                            key={def.type}
                            onClick={() => onAddNode(def.type)}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all text-sm font-medium mb-2"
                        >
                            <div className={`p-1 rounded ${ui.colorClass?.split(' ')[1] ? 'bg-white ' + ui.colorClass.split(' ')[1] : 'bg-slate-100 text-slate-600'}`}>
                                <Icon size={14} />
                            </div>
                            {def.label}
                        </button>
                    );
                })}
            </>
        );
    };

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

            <div className="p-4 flex-1 overflow-y-auto">
                <CategorySection title="Data" nodes={categories['Data']} />
                <CategorySection title="Logic" nodes={categories['Logic']} />
                <CategorySection title="Math" nodes={categories['Math']} />
                <CategorySection title="Visuals" nodes={categories['Visuals']} />
                <CategorySection title="Advanced" nodes={categories['Advanced']} />
            </div>
        </div>
    );
};
