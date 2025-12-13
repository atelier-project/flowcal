
import React, { useMemo, useState } from 'react';
import { Download, Upload, FileJson, Search } from 'lucide-react';
import { NODE_LOGIC } from '../../engine/nodeDefinitions';
import { getUI } from './nodeUIMap';

export const Sidebar = ({ onAddNode, onSave, onLoad, onExportJS, fileInputRef, pathLength }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const categories = useMemo(() => {
        const cats = {};
        Object.values(NODE_LOGIC).forEach(def => {
            if (!cats[def.category]) cats[def.category] = [];
            cats[def.category].push(def);
        });
        return cats;
    }, []);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        const query = searchQuery.toLowerCase();
        const filtered = {};
        for (const [cat, nodes] of Object.entries(categories)) {
            const matchingNodes = nodes.filter(def =>
                def.label.toLowerCase().includes(query) ||
                def.type.toLowerCase().includes(query)
            );
            if (matchingNodes.length > 0) {
                filtered[cat] = matchingNodes;
            }
        }
        return filtered;
    }, [categories, searchQuery]);

    const CategorySection = ({ title, nodes }) => {
        if (!nodes || nodes.length === 0) return null;
        return (
            <>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 mt-4 first:mt-0">{title}</p>
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
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400 hover:bg-slate-50 dark:bg-slate-700 transition-all text-sm font-medium mb-2 text-slate-700 dark:text-slate-200"
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
        <div className="w-64 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 shadow-xl overflow-hidden text-slate-800 dark:text-slate-100">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FlowCalc</h1>
            </div>

            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700 flex gap-2 flex-wrap">
                <button onClick={onSave} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold"><Download size={14} /></button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 p-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-xs font-semibold"><Upload size={14} /></button>
                <button onClick={onExportJS} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-100 dark:bg-blue-700 hover:bg-blue-200 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-200 rounded text-xs font-semibold"><FileJson size={14} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onLoad} />
            </div>

            {/* Search Input */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-sm focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
                <CategorySection title="Data" nodes={filteredCategories['Data']} />
                <CategorySection title="String" nodes={filteredCategories['String']} />
                <CategorySection title="Date" nodes={filteredCategories['Date']} />
                <CategorySection title="Array" nodes={filteredCategories['Array']} />
                <CategorySection title="Object" nodes={filteredCategories['Object']} />
                <CategorySection title="Logic" nodes={filteredCategories['Logic']} />
                <CategorySection title="Math" nodes={filteredCategories['Math']} />
                <CategorySection title="Visuals" nodes={filteredCategories['Visuals']} />
                <CategorySection title="Advanced" nodes={filteredCategories['Advanced']} />
                {Object.keys(filteredCategories).length === 0 && searchQuery && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No nodes found</p>
                )}
            </div>
        </div>
    );
};
