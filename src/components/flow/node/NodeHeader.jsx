import React from 'react';
import {
    Plus, Settings, Maximize2, Trash2, Copy, ChevronDown, ChevronUp,
    Package, Eye, EyeOff, Lock, Unlock, Shield, ShieldAlert, MoreVertical, Type, Plug
} from 'lucide-react';

/**
 * NodeHeader - Renders the header bar of a node
 * 
 * Includes: icon, label input, lock/unlock, read-only toggle, 
 * collapse toggle, duplicate, delete, and type-specific buttons
 */
export const NodeHeader = ({
    // Node identity
    id,
    type,
    data,

    // UI config
    Icon,
    ui,
    def,

    // State
    showMenu,
    setShowMenu,

    // Permissions
    canEdit,
    canUnlock,
    isEffectivelyLocked,

    // Handlers
    handleChange,
    handleLockToggle,
    onUpdateData,
    onDelete,
    onDuplicate,
    onEnterGroup,
    onOpenEditor,
    onSaveAsCustom,
    setShowTypeModal,
    addCollectorInput,
    position
}) => {
    return (
        <div
            style={{
                backgroundColor: type === 'FINAL' ? undefined : 'var(--bg-tertiary)',
                borderColor: 'var(--border-primary)'
            }}
            className={`flex items-center justify-between p-2 rounded-t-lg border-b select-none transition-colors
                ${type === 'FINAL' ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800' : ''}`}
        >
            {/* Left side: Icon and Label */}
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold text-sm flex-1 min-w-0 relative group/hdr">
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
                    disabled={!canEdit}
                />
                {/* Hover popover: full name + type (handy when the label is truncated) */}
                <div
                    className="pointer-events-none absolute -top-2 left-0 -translate-y-full opacity-0 group-hover/hdr:opacity-100 transition-opacity duration-150 z-50 max-w-[260px] rounded-md px-2.5 py-1.5 shadow-lg border"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
                >
                    <div className="font-semibold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{data.label || def.label || type}</div>
                    <div className="text-[10px] font-normal whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{def.label || type} · <span className="font-mono">{type}</span></div>
                </div>
            </div>

            {/* Right side: Controls */}
            <div className="flex gap-1 items-center">
                {/* Lock Toggle for Owner/Admin OR Lock Indicator for others */}
                {(data.locked || canUnlock) && (
                    <button
                        onClick={handleLockToggle}
                        disabled={!canUnlock && data.locked}
                        className={`p-1 rounded ${data.locked ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : 'text-slate-300 hover:text-slate-500'}`}
                        title={data.locked ? (canUnlock ? "Unlock Node" : "Locked by Owner") : "Lock Node"}
                    >
                        {data.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                )}

                {/* Read-Only Toggle */}
                {(data.readOnly || canUnlock) && !data.locked && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (canUnlock) {
                                onUpdateData(id, { ...data, readOnly: !data.readOnly });
                            }
                        }}
                        disabled={!canUnlock && data.readOnly}
                        className={`p-1 rounded ${data.readOnly ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-slate-300 hover:text-slate-500'}`}
                        title={data.readOnly ? (canUnlock ? "Make Editable" : "Read-Only") : "Make Read-Only"}
                    >
                        {data.readOnly ? <ShieldAlert size={14} /> : <Shield size={14} />}
                    </button>
                )}

                {/* Hide regular controls if effectively locked */}
                {!isEffectivelyLocked && (
                    <>
                        {type === 'INPUT' && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleChange('useSlider', !data.useSlider); }}
                                className={`p-1 rounded ${data.useSlider ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'}`}
                                title="Toggle Slider"
                            >
                                <Settings size={14} />
                            </button>
                        )}

                        {(type === 'GROUP_INPUT' || type === 'GROUP_OUTPUT' || type === 'GROUP_INPUT_LIST' || type === 'GROUP_OUTPUT_LIST' || type === 'FORM' || type === 'PACK') && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowTypeModal(true); }}
                                className={`p-1 rounded ${data.typeDef && data.typeDef !== 'any' ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/30' : 'text-slate-400 hover:text-pink-500 dark:hover:text-pink-400'}`}
                                title="Define Type Interface"
                            >
                                <Type size={14} />
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
                            <button onClick={(e) => { e.stopPropagation(); addCollectorInput(); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Add Input Port">
                                <Plus size={14} />
                            </button>
                        )}

                        {type === 'CUSTOM' && (
                            <button onClick={(e) => { e.stopPropagation(); onOpenEditor(id, data.func); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Open Editor">
                                <Maximize2 size={14} />
                            </button>
                        )}

                        {(type === 'GROUP' || type === 'MAP' || type === 'FILTER' || type === 'REDUCE') ? (
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEnterGroup(id); }}
                                    className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1 mr-1"
                                    title="Edit Group"
                                >
                                    <Settings size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${showMenu ? 'text-slate-600 dark:text-slate-200' : 'text-slate-400'}`}
                                >
                                    <MoreVertical size={14} />
                                </button>

                                {showMenu && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleChange('showResults', !data.showResults); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                        >
                                            {data.showResults ? <EyeOff size={14} /> : <Eye size={14} />}
                                            {data.showResults ? "Hide Results" : "Show Results"}
                                        </button>

                                        {onSaveAsCustom && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onSaveAsCustom({ id, type, data, position }); setShowMenu(false); }}
                                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                            >
                                                <Package size={14} />
                                                Save as Node
                                            </button>
                                        )}

                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleChange('collapsed', !data.collapsed); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                        >
                                            {data.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                            {data.collapsed ? "Expand" : "Collapse"}
                                        </button>

                                        {onDuplicate && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onDuplicate(id); setShowMenu(false); }}
                                                className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                                            >
                                                <Copy size={14} />
                                                Duplicate
                                            </button>
                                        )}

                                        <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(id); setShowMenu(false); }}
                                            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Collapse toggle for large nodes */}
                                {['TEMPLATE', 'FORM', 'COMMENT', 'UNPACK', 'PACK', 'CUSTOM'].includes(type) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleChange('collapsed', !data.collapsed); }}
                                        className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1"
                                        title={data.collapsed ? 'Expand' : 'Collapse'}
                                    >
                                        {data.collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    </button>
                                )}
                                {onDuplicate && (
                                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(id); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Duplicate (Ctrl+D)">
                                        <Copy size={14} />
                                    </button>
                                )}
                                <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1">
                                    <Trash2 size={14} />
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
