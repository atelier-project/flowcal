import React, { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Save, FolderOpen, MousePointer2, Type, HelpCircle, Package, Share, Trash2, LogOut, Download, Upload, FileJson, Search, ShieldAlert, User, Settings } from 'lucide-react';
import { NODE_LOGIC } from '../../engine/nodeDefinitions';
import { getDescription } from '../../engine/nodeDescriptions';
import { getUI } from './nodeUIMap';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ onAddNode, onSave, onLocalSave, onLoad, fileInputRef, pathLength, theme, onHelp, projectTitle, onTitleChange, customNodes = [], onAddCustomNode, onImportCustomNode, onDeleteCustomNode, onExportCustomNode, isGuest, isSaving, lastSaved, onOpenSettings, isRestricted, currentIterator }) => {
    const { isAdmin } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef(null);
    const customImportRef = useRef(null);

    const categories = useMemo(() => {
        const cats = {};
        Object.values(NODE_LOGIC).forEach(def => {
            // Filter Iterator Context nodes based on currentIterator
            // If we're inside an iterator, only show context nodes for that iterator type
            // If we're not inside an iterator, hide all context nodes
            if (def.category === 'Iterator Context') {
                if (!currentIterator) return; // Hide all context nodes when not in an iterator
                if (def.iteratorContext !== currentIterator) return; // Hide non-matching context nodes
            }

            if (!cats[def.category]) cats[def.category] = [];
            cats[def.category].push(def);
        });
        return cats;
    }, [currentIterator]);

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
                    // Group Logic nodes: only show inside groups
                    if (def.type === 'GROUP_INPUT' || def.type === 'GROUP_OUTPUT' || def.type === 'GROUP_INPUT_LIST' || def.type === 'GROUP_OUTPUT_LIST') {
                        if (pathLength === 0) return null;
                    }
                    // Iterator context nodes: only show inside their respective iterator
                    const iteratorContextType = def.iteratorContext;
                    if (iteratorContextType) {
                        // These are context nodes (MAP_ITEM, FILTER_INCLUDE, etc.)
                        // Only show if we're inside the correct iterator type
                        // For now, show if pathLength > 0 (inside any group-like container)
                        if (pathLength === 0) return null;
                    }
                    // WARP nodes are visible everywhere
                    // GROUP nodes should always be available to allow nesting
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
                            <div className={`p - 1 rounded ${ui.colorClass?.split(' ')[1] ? 'bg-white ' + ui.colorClass.split(' ')[1] : 'bg-slate-100 text-slate-600'} `}>
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
                <h1 className={`text - xl font - bold bg - gradient - to - r from - blue - 600 to - purple - 600 bg - clip - text text - transparent ${theme === 'cyberpunk' ? 'cyberpunk-logo' : ''} ${theme === 'dracula' ? 'dracula-logo' : ''} ${theme === 'sunset' ? 'sunset-logo' : ''} ${theme === 'ocean' ? 'ocean-logo' : ''} ${theme === 'forest' ? 'forest-logo' : ''} `}>FlowCalc</h1>
                <input
                    type="text"
                    value={projectTitle || ''}
                    onChange={(e) => onTitleChange?.(e.target.value)}
                    placeholder="Project Title"
                    className="w-full mt-2 px-2 py-1 text-sm rounded border focus:outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
            </div>

            {/* Toolbar */}
            <div className="px-4 py-2 border-b flex gap-2 flex-wrap items-center" style={{ borderColor: 'var(--border-primary)' }}>
                {/* Primary Save Action */}
                <button
                    onClick={onSave}
                    disabled={isSaving || (isGuest && isRestricted)}
                    className={`p-1.5 rounded transition-colors shadow-sm ${isGuest
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-70'
                        } `}
                    title={isGuest ? (isRestricted ? "Download Disabled by Owner" : "Download as File") : "Save to Cloud"}
                >
                    {isSaving ? (
                        <div className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full"></div>
                    ) : isGuest ? (
                        <Download size={14} />
                    ) : (
                        <Save size={14} />
                    )}
                </button>

                {/* Secondary Actions */}
                {!isGuest && (
                    <button
                        onClick={onLocalSave}
                        disabled={isRestricted}
                        title={isRestricted ? "Backup Disabled by Owner" : "Backup (.json)"}
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                        className="p-1.5 rounded hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={14} />
                    </button>
                )}

                <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Load flow from file"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    className="p-1.5 rounded hover:opacity-80 transition-opacity"
                >
                    <Upload size={14} />
                </button>

                <button
                    onClick={onOpenSettings}
                    title="Flow Settings"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    className="p-1.5 rounded hover:opacity-80 transition-opacity"
                >
                    <Settings size={14} />
                </button>

                <button
                    onClick={onHelp}
                    title="Help & Documentation"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    className="p-1.5 rounded hover:opacity-80 transition-opacity"
                >
                    <HelpCircle size={14} />
                </button>

                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onLoad} />
                <input type="file" ref={customImportRef} className="hidden" accept=".json" onChange={onImportCustomNode} />
            </div>

            {/* Last Saved Status */}
            {!isGuest && lastSaved && (
                <div className="px-4 py-1 text-[10px] text-slate-400 border-b flex items-center justify-center gap-1" style={{ borderColor: 'var(--border-primary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Synced {lastSaved.toLocaleTimeString()}
                </div>
            )}

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
                <CategorySection title="Iterator" nodes={filteredCategories['Iterator']} />
                <CategorySection title="Iterator Context" nodes={filteredCategories['Iterator Context']} />
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

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity text-sm font-bold">
                        <ShieldAlert size={16} />
                        Admin Panel
                    </Link>
                )}
                <Link to="/profile" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors text-sm font-medium">
                    <User size={16} />
                    Profile & Settings
                </Link>
                <Link to="/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors text-sm font-medium">
                    <LogOut size={16} className="rotate-180" />
                    Back to Dashboard / Login
                </Link>
            </div>
        </div>
    );
};
