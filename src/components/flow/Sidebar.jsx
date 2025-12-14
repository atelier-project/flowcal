
import React, { useMemo, useState, useRef } from 'react';
import { Download, Upload, FileJson, Search, HelpCircle, Package, Trash2, Share } from 'lucide-react';
import { NODE_LOGIC } from '../../engine/nodeDefinitions';
import { getDescription } from '../../engine/nodeDescriptions';
import { getUI } from './nodeUIMap';

export const Sidebar = ({ onAddNode, onSave, onLoad, onExportJS, fileInputRef, pathLength, theme, onHelp, projectTitle, onTitleChange, customNodes = [], onAddCustomNode, onImportCustomNode, onDeleteCustomNode, onExportCustomNode }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef(null);
    const customImportRef = useRef(null);

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

    // Wrapper to preserve scroll position when adding nodes
    const handleAddNode = (type) => {
        const scrollTop = scrollRef.current?.scrollTop || 0;
        onAddNode(type);
        // Restore scroll position after React re-renders
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollTop;
            }
        });
    };

    const CategorySection = ({ title, nodes }) => {
        if (!nodes || nodes.length === 0) return null;
        return (
            <>
                <p style={{ color: 'var(--text-muted)' }} className="text-xs font-bold uppercase tracking-wider mb-2 mt-4 first:mt-0">{title}</p>
                {nodes.map(def => {
                    if (def.type === 'GROUP_INPUT' || def.type === 'GROUP_OUTPUT') {
                        if (pathLength === 0) return null; // Show only inside groups
                    }
                    const ui = getUI(def.type);
                    const Icon = ui.icon;
                    return (
                        <button
                            key={def.type}
                            onClick={() => handleAddNode(def.type)}
                            title={getDescription(def.type)}
                            style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-primary)'
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:opacity-80 transition-all text-sm font-medium mb-2"
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
        <div className="w-64 theme-bg-secondary border-r theme-border-primary flex flex-col z-30 shadow-xl overflow-hidden theme-text-primary" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}>
            <div className="p-4 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <h1 className={`text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent ${theme === 'cyberpunk' ? 'cyberpunk-logo' : ''} ${theme === 'dracula' ? 'dracula-logo' : ''} ${theme === 'sunset' ? 'sunset-logo' : ''} ${theme === 'ocean' ? 'ocean-logo' : ''} ${theme === 'forest' ? 'forest-logo' : ''}`}>FlowCalc</h1>
                <input
                    type="text"
                    value={projectTitle || ''}
                    onChange={(e) => onTitleChange?.(e.target.value)}
                    placeholder="Project Title"
                    className="w-full mt-2 px-2 py-1 text-sm rounded border focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
            </div>

            <div className="px-4 py-2 border-b flex gap-2 flex-wrap" style={{ borderColor: 'var(--border-primary)' }}>
                <button onClick={onSave} title="Save flow to file" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} className="flex-1 flex items-center justify-center gap-2 p-2 rounded text-xs font-semibold hover:opacity-80 transition-opacity"><Download size={14} /></button>
                <button onClick={() => fileInputRef.current?.click()} title="Load flow from file" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} className="flex-1 flex items-center justify-center gap-2 p-2 rounded text-xs font-semibold hover:opacity-80 transition-opacity"><Upload size={14} /></button>
                <button onClick={onExportJS} title="Export as JavaScript" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }} className="flex-1 flex items-center justify-center gap-2 p-2 rounded text-xs font-semibold hover:opacity-80 transition-opacity"><FileJson size={14} /></button>
                <button onClick={onHelp} title="Help & Documentation" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} className="flex-1 flex items-center justify-center gap-2 p-2 rounded text-xs font-semibold hover:opacity-80 transition-opacity"><HelpCircle size={14} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onLoad} />
                <input type="file" ref={customImportRef} className="hidden" accept=".json" onChange={onImportCustomNode} />
            </div>

            {/* Search Input */}
            <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-primary)',
                            color: 'var(--text-primary)'
                        }}
                        className="w-full pl-7 pr-2 py-1.5 border rounded text-sm focus:outline-none placeholder:opacity-50"
                    />
                </div>
            </div>

            <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto">
                <CategorySection title="Data" nodes={filteredCategories['Data']} />
                <CategorySection title="String" nodes={filteredCategories['String']} />
                <CategorySection title="Date" nodes={filteredCategories['Date']} />
                <CategorySection title="Array" nodes={filteredCategories['Array']} />
                <CategorySection title="Object" nodes={filteredCategories['Object']} />
                <CategorySection title="Logic" nodes={filteredCategories['Logic']} />
                <CategorySection title="Math" nodes={filteredCategories['Math']} />
                <CategorySection title="Visuals" nodes={filteredCategories['Visuals']} />
                <CategorySection title="Advanced" nodes={filteredCategories['Advanced']} />

                {/* Custom Nodes Section */}
                {customNodes.length > 0 && (
                    <>
                        <p style={{ color: 'var(--text-muted)' }} className="text-xs font-bold uppercase tracking-wider mb-2 mt-4">Custom Nodes</p>
                        {customNodes.map(cn => (
                            <div key={cn.id} className="mb-2">
                                <button
                                    onClick={() => onAddCustomNode(cn.id)}
                                    title={cn.description || cn.name}
                                    style={{
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-primary)',
                                        color: 'var(--text-primary)'
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:opacity-80 transition-all text-sm font-medium"
                                >
                                    <div className="p-1 rounded bg-purple-500 text-white">
                                        <Package size={14} />
                                    </div>
                                    <span className="flex-1 text-left">{cn.name}</span>
                                </button>
                                <div className="flex gap-1 mt-1">
                                    <button
                                        onClick={() => onExportCustomNode(cn.id)}
                                        className="flex-1 text-xs p-1 rounded hover:opacity-70"
                                        style={{ color: 'var(--text-muted)' }}
                                        title="Export"
                                    >
                                        <Share size={12} className="mx-auto" />
                                    </button>
                                    <button
                                        onClick={() => onDeleteCustomNode(cn.id)}
                                        className="flex-1 text-xs p-1 rounded hover:text-red-500"
                                        style={{ color: 'var(--text-muted)' }}
                                        title="Delete"
                                    >
                                        <Trash2 size={12} className="mx-auto" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                )}

                {/* Import Custom Node Button */}
                <button
                    onClick={() => customImportRef.current?.click()}
                    style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
                    className="w-full flex items-center justify-center gap-2 p-2 mt-4 rounded border border-dashed hover:opacity-70 text-xs"
                >
                    <Upload size={12} />
                    Import Custom Node
                </button>

                {Object.keys(filteredCategories).length === 0 && searchQuery && (
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">No nodes found</p>
                )}
            </div>
        </div>
    );
};
