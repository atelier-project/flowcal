import React, { useRef, useMemo } from 'react';
import {
    Plus, Settings, Maximize2, Trash2, ArrowUp, ArrowDown, Plug, Copy, ChevronDown, ChevronUp, Package, Eye, EyeOff, Lock, Unlock, Shield, ShieldAlert, MoreVertical, Type
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNodeHeight } from '../../utils/layout';
import { GaugeChart, LineChart, BarChart } from '../ui/Charts';
import { DataTable } from '../ui/DataTable';
import { Handle } from './Handle';
import { getUI } from './nodeUIMap';
import { getDefinition } from '../../engine/nodeDefinitions';
import { TypeDefinitionModal } from './TypeDefinitionModal';
import { getTypeDisplayName, validateFormFields } from '../../utils/typeUtils';

export const Node = ({ id, type, data, position, selected, isHovered, onDragStart, onDelete, onDuplicate, onUpdateData, onStartConnect, onOpenEditor, inputs, result, onEnterGroup, onSaveAsCustom, readOnly, typeWarnings }) => {
    const nodeRef = useRef(null);
    const ui = getUI(type);
    const [showMenu, setShowMenu] = React.useState(false);
    const [showTypeModal, setShowTypeModal] = React.useState(false);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMenu && nodeRef.current && !nodeRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);
    const def = getDefinition(type);
    const { user, isAdmin } = useAuth();

    // --- Security / Lock Logic ---
    const isOwner = user?.id === data.lockedBy;
    const canUnlock = isOwner || isAdmin;

    // "Effectively Locked" means it is locked AND the current user cannot bypass it.
    // If you are the owner or admin, you "see through" the lock (but see the icon).
    const isEffectivelyLocked = data.locked && !canUnlock;

    // "Read Only" means you can see inside but not change values.
    // If locked, it is implicitly read-only for everyone except owner/admin.
    // However, if isEffectivelyLocked is true, we don't even show the editor, so readOnly check is secondary for body inputs.
    // We merge the prop `readOnly` (inherited context + data) with local logic.
    const isReadOnly = readOnly || data.readOnly || isEffectivelyLocked;

    // Can the user edit this node? 
    // They must hold the lock (or be admin) OR it must not be read-only.
    // If it's locked, only the owner/admin can edit.
    const canEdit = !isReadOnly && (!data.locked || canUnlock);

    const handleChange = (key, value) => {
        if (!canEdit) return; // Strict check
        onUpdateData(id, { ...data, [key]: value });
    };

    const handleLockToggle = (e) => {
        e.stopPropagation();
        if (!canUnlock && data.locked) return; // Should not happen due to UI hiding, but safe check

        if (data.locked) {
            // Unlock
            onUpdateData(id, { ...data, locked: false, lockedBy: null });
        } else {
            // Lock
            onUpdateData(id, { ...data, locked: true, lockedBy: user?.id });
        }
    };

    const Icon = ui.icon || Plus;

    // --- Handle Logic ---

    const inputHandles = useMemo(() => {
        let handles = [];
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            handles = data.subGraph.nodes
                .filter(n => n.type === 'GROUP_INPUT' || n.type === 'GROUP_INPUT_LIST')
                .map((n, idx) => ({
                    id: n.id,
                    label: n.data.label || `Input ${idx + 1}`,
                    description: n.data.description || ''
                }));
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
        } else if (type === 'FUNCTION') {
            const params = data.params || [];
            handles = params.map((param, i) => ({
                id: `param_${i}`,
                label: param.name || `p${i}`,
                top: 80 + (i * 30)
            }));
        } else if (type === 'PACK') {
            // Dynamic inputs from keys array - one input per key
            // NOTE: This must be BEFORE the generic dynamicInputs check
            const keys = data.keys || [];
            if (data.collapsed) {
                // All handles at single point when collapsed
                handles = keys.map((key) => ({ id: key, label: key, top: 20 }));
            } else {
                // Header ~40px, "Keys to Create" label ~20px, first key input at ~80px, each row ~28px
                handles = keys.map((key, idx) => ({
                    id: key,
                    label: key,
                    top: 48 + (idx * 24)
                }));
            }
        } else if (type === 'COLLECTOR' || (def && def.dynamicInputs)) {
            const count = data.inputCount || 2;
            handles = Array.from({ length: count }).map((_, i) => ({ id: `in_${i}`, label: `${i}` }));
        } else if (type === 'UNPACK') {
            // UNPACK has single object input - center vertically in the node
            handles = [{ id: 'object', label: 'Object', top: data.collapsed ? 20 : 110 }];
        } else if (type === 'CUSTOM') {
            // CUSTOM JS node - single input that accepts array, centered at 100 or 20 when collapsed
            handles = [{ id: null, top: data.collapsed ? 20 : 100 }];
        } else if (def && def.inputs && !def.inputs.includes('*')) {
            handles = def.inputs.map((name) => ({
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }));
        } else if (type === 'TEMPLATE') {
            // TEMPLATE has variable textarea, so fix input at top of body area
            handles = [{ id: null, top: 60 }];
        } else if (type === 'GROUP_OUTPUT' || type === 'GROUP_OUTPUT_LIST') {
            // GROUP_OUTPUT/GROUP_OUTPUT_LIST has single input - calculate position based on height
            const height = getNodeHeight({ type, data });
            handles = [{ id: null, top: height / 2 }];
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

        // Assign positions - if collapsed, all handles at single point
        if (data.collapsed) {
            return handles.map((h) => ({ ...h, top: 20 }));
        }
        if (handles.length === 1 && handles[0].top) return handles; // Keep default centered
        return handles.map((h, i) => ({ ...h, top: 40 + (i * 24) }));

    }, [type, data.subGraph, data.inputCount, data.params, data.keys, def, data.inputOrder, data.collapsed]);

    const minHeight = getNodeHeight({ type, data });

    const outputHandles = useMemo(() => {
        let handles = [];
        if (type === 'GROUP' && data.subGraph && data.subGraph.nodes) {
            handles = data.subGraph.nodes
                .filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST')
                .map((n, idx) => ({
                    id: n.id,
                    label: n.data.label || `Output ${idx + 1}`,
                    description: n.data.description || ''
                }));
        } else if (type === 'TEMPLATE') {
            // TEMPLATE output - fixed at same height as input for visual balance
            handles = [{ id: 'text', label: 'Text', top: 60 }];
        } else if (type === 'UNPACK') {
            // Dynamic outputs from keys array - position to align with key inputs
            const keys = data.keys || [];
            if (data.collapsed) {
                // All handles at single point when collapsed
                handles = keys.map((key) => ({ id: key, label: key, top: 20 }));
            } else {
                // Header ~40px, "Keys to Extract" label ~20px, first key input at ~80px, each row ~28px
                handles = keys.map((key, idx) => ({
                    id: key,
                    label: key,
                    top: 80 + (idx * 32)
                }));
            }
        } else if (def && def.outputs) {
            handles = def.outputs.map((name) => ({
                id: name,
                label: name.charAt(0).toUpperCase() + name.slice(1),
            }));
        } else if (!['GROUP_OUTPUT', 'GROUP_OUTPUT_LIST', 'FINAL', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE'].includes(type) && def.category !== 'Visuals' && type !== 'FINAL') {
            // Default single output - use calculated height for FORM nodes
            if (type === 'FORM') {
                handles = [{ id: null, top: minHeight / 2 }];
            } else if (type === 'GROUP_INPUT') {
                // GROUP_INPUT has content that affects height - calculate dynamically
                handles = [{ id: null, top: minHeight / 2 }];
            } else if (type === 'CUSTOM') {
                // CUSTOM JS node output - at 100 or 20 when collapsed
                handles = [{ id: null, top: data.collapsed ? 20 : 100 }];
            } else {
                handles = [{ id: null, top: '50%' }];
            }
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

        // All handles at single point when collapsed (except UNPACK which handles it above)
        if (data.collapsed && type !== 'UNPACK') {
            return handles.map((h) => ({ ...h, top: 20 }));
        }

        if (handles.length === 1 && handles[0].top) return handles;
        return handles.map((h, i) => h.top ? h : { ...h, top: 40 + (i * 24) });
    }, [type, data.subGraph, data.keys, def, data.outputOrder, minHeight, data.collapsed]);


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

    const moveKey = (index, direction) => {
        const keys = [...(data.keys || [])];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        if (swapIndex >= 0 && swapIndex < keys.length) {
            [keys[index], keys[swapIndex]] = [keys[swapIndex], keys[index]];
            handleChange('keys', keys);
        }
    };

    // Special rendering for TEXT_LABEL node - floating text without card
    if (type === 'TEXT_LABEL') {
        // Determine actual color based on 'auto' setting and theme
        const getTextColor = () => {
            if (data.color === 'auto' || !data.color) {
                // Check if dark mode via CSS variable or class
                return 'var(--text-primary, #1e293b)';
            }
            return data.color;
        };

        return (
            <div
                ref={nodeRef}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    pointerEvents: 'all'
                }}
                className="absolute z-10"
                onMouseDown={(e) => onDragStart(e, id)}
            >
                {/* Wrapper for better selection - has padding and hover effect */}
                <div
                    className={`inline-block px-2 py-1 rounded transition-colors ${selected
                        ? 'bg-blue-50/50 dark:bg-blue-900/20 ring-2 ring-blue-400'
                        : isHovered
                            ? 'bg-slate-100/50 dark:bg-slate-800/50'
                            : ''
                        }`}
                    style={{ cursor: 'move' }}
                >
                    {/* The text itself */}
                    <div
                        contentEditable={!readOnly}
                        suppressContentEditableWarning
                        onBlur={(e) => handleChange('text', e.currentTarget.textContent)}
                        onClick={(e) => { e.stopPropagation(); e.currentTarget.focus(); }}
                        style={{
                            fontSize: `${data.fontSize || 36}px`,
                            fontFamily: data.fontFamily || 'Inter',
                            color: getTextColor(),
                            fontWeight: data.fontWeight || 'normal',
                            textAlign: data.textAlign || 'left',
                            outline: 'none',
                            minWidth: '50px',
                            cursor: readOnly ? 'move' : 'text',
                            userSelect: readOnly ? 'none' : 'text'
                        }}
                        className="whitespace-pre-wrap"
                    >
                        {data.text || 'Label'}
                    </div>
                </div>

                {/* Controls - only visible when selected */}
                {selected && !readOnly && (
                    <div className="absolute -top-12 left-0 flex items-center gap-2 bg-white dark:bg-slate-800 rounded px-3 py-2 shadow-lg border border-slate-200 dark:border-slate-700 z-50">
                        {/* Font Size */}
                        <label className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span>Size:</span>
                            <input
                                type="number"
                                value={data.fontSize || 36}
                                onChange={(e) => handleChange('fontSize', parseInt(e.target.value) || 36)}
                                className="w-12 px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                                min="8"
                                max="72"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </label>

                        {/* Font Family */}
                        <select
                            value={data.fontFamily || 'Inter'}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                            className="text-[10px] px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <option value="Inter">Inter</option>
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times</option>
                            <option value="Courier New">Courier</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="monospace">Monospace</option>
                        </select>

                        {/* Font Weight */}
                        <select
                            value={data.fontWeight || 'normal'}
                            onChange={(e) => handleChange('fontWeight', e.target.value)}
                            className="text-[10px] px-1 py-0.5 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <option value="normal">Normal</option>
                            <option value="bold">Bold</option>
                            <option value="lighter">Light</option>
                        </select>

                        {/* Text Color */}
                        <input
                            type="color"
                            value={data.color === 'auto' ? '#1e293b' : (data.color || '#1e293b')}
                            onChange={(e) => handleChange('color', e.target.value)}
                            className="w-6 h-6 cursor-pointer border border-slate-300 dark:border-slate-600 rounded"
                            title="Text color"
                            onMouseDown={(e) => e.stopPropagation()}
                        />

                        {/* Delete Button */}
                        <button
                            onClick={() => onDelete(id)}
                            className="text-red-400 hover:text-red-600 p-1"
                            title="Delete label"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Special rendering for FRAME node - always stays at back
    if (type === 'FRAME') {
        return (
            <div
                ref={nodeRef}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    width: `${data.width || 300}px`,
                    height: `${data.height || 200}px`,
                    borderColor: data.color || '#3b82f6',
                    borderStyle: data.lineStyle || 'solid',
                    backgroundColor: `${data.color || '#3b82f6'}10`
                }}
                className={`absolute rounded-lg border-2 z-0 ${selected ? 'ring-2 ring-blue-400' : ''}`}
                onMouseDown={(e) => onDragStart(e, id)}
            >
                {/* Title */}
                <div className="absolute -top-6 left-2 flex items-center gap-2">
                    <input
                        type="text"
                        value={data.title || ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Frame"
                        className="bg-transparent text-sm font-semibold focus:outline-none px-1 rounded"
                        style={{ color: data.color || '#3b82f6', maxWidth: '150px' }}
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                </div>

                {/* Controls - only visible when selected */}
                {selected && (
                    <div className="absolute -top-6 right-2 flex items-center gap-2 bg-white dark:bg-slate-800 rounded px-2 py-1 shadow-sm border border-slate-200 dark:border-slate-700">
                        {/* Color Presets */}
                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'].map(c => (
                            <button
                                key={c}
                                onClick={() => handleChange('color', c)}
                                className={`w-3 h-3 rounded-full ${data.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                        <input
                            type="color"
                            value={data.color || '#3b82f6'}
                            onChange={(e) => handleChange('color', e.target.value)}
                            className="w-4 h-4 cursor-pointer border-0 p-0"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        {/* Line Style */}
                        <select
                            value={data.lineStyle || 'solid'}
                            onChange={(e) => handleChange('lineStyle', e.target.value)}
                            className="text-[10px] bg-transparent border-none focus:outline-none cursor-pointer"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                        </select>
                        {/* Delete Button */}
                        <button
                            onClick={() => onDelete(id)}
                            className="text-red-400 hover:text-red-600 p-0.5"
                            title="Delete frame"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}

                {/* Resize Handle */}
                <div
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-50 hover:opacity-100"
                    style={{
                        background: `linear-gradient(135deg, transparent 50%, ${data.color || '#3b82f6'} 50%)`,
                        borderBottomRightRadius: '6px'
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWidth = data.width || 300;
                        const startHeight = data.height || 200;

                        const onMove = (ev) => {
                            const newWidth = Math.max(100, startWidth + (ev.clientX - startX));
                            const newHeight = Math.max(60, startHeight + (ev.clientY - startY));
                            // Update both at once
                            onUpdateData(id, { ...data, width: newWidth, height: newHeight });
                        };

                        const onUp = () => {
                            document.removeEventListener('mousemove', onMove);
                            document.removeEventListener('mouseup', onUp);
                        };

                        document.addEventListener('mousemove', onMove);
                        document.addEventListener('mouseup', onUp);
                    }}
                    title="Drag to resize"
                />
            </div>
        );
    }

    return (
        <div
            ref={nodeRef}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                minHeight,
                width: data.width ? `${data.width}px` : undefined,
                height: data.height && !data.collapsed ? `${data.height}px` : undefined,
                backgroundColor: 'var(--bg-secondary)',
                borderColor: selected ? 'var(--accent-primary)' : 'var(--border-primary)',
                color: 'var(--text-primary)'
            }}
            className={`absolute ${!data.width ? 'w-64' : ''} rounded-lg shadow-lg border-2 flex flex-col transition-[box-shadow,border-color] duration-200
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
                                <button onClick={(e) => { e.stopPropagation(); addCollectorInput(); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Add Input Port"><Plus size={14} /></button>
                            )}
                            {type === 'CUSTOM' && (
                                <button onClick={(e) => { e.stopPropagation(); onOpenEditor(id, data.func); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Open Editor"><Maximize2 size={14} /></button>
                            )}
                            {type === 'GROUP' ? (
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
                                        <button onClick={(e) => { e.stopPropagation(); onDuplicate(id); }} className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-1" title="Duplicate (Ctrl+D)"><Copy size={14} /></button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1"><Trash2 size={14} /></button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Body - conditionally render based on collapsed state */}
            {!data.collapsed && <div className="p-3 space-y-3 flex-1 flex flex-col">
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
                                    className="w-full accent-blue-500 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    disabled={!canEdit}
                                />
                                <div className="flex gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                                    <input
                                        className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-700 text-center dark:text-slate-300 disabled:opacity-50"
                                        value={data.min || 0}
                                        onChange={e => handleChange('min', parseFloat(e.target.value))}
                                        placeholder="Min"
                                        onMouseDown={e => e.stopPropagation()}
                                        disabled={!canEdit}
                                    />
                                    <span className="flex-1 text-center">Range</span>
                                    <input
                                        className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-700 text-center dark:text-slate-300 disabled:opacity-50"
                                        value={data.max || 100}
                                        onChange={e => handleChange('max', parseFloat(e.target.value))}
                                        placeholder="Max"
                                        onMouseDown={e => e.stopPropagation()}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>
                        ) : (
                            <input
                                type="number"
                                value={data.value}
                                onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 font-mono dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                onMouseDown={(e) => e.stopPropagation()}
                                disabled={!canEdit}
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
                            className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
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
                            className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                    </div>
                )}

                {type === 'FORM' && (
                    <div className="flex flex-col gap-2">
                        {/* Type validation warning */}
                        {data.typeDef && data.typeDef !== 'any' && (() => {
                            const validation = validateFormFields(data.fields || [], data.typeDef);
                            if (!validation.valid) {
                                return (
                                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                                        <span className="text-amber-600 dark:text-amber-400 shrink-0">⚠️</span>
                                        <div className="flex-1">
                                            <div className="font-semibold text-amber-800 dark:text-amber-300">Type Mismatch</div>
                                            <div className="text-amber-700 dark:text-amber-400 mt-0.5">{validation.message}</div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {(data.fields || []).map((field, i) => (
                            <div key={i} className="flex items-center gap-1 group/field">
                                {/* Input Handle spacer */}
                                {data.showInputs && <div className="w-3" />}
                                <input
                                    className="w-20 text-xs font-bold text-slate-600 dark:text-slate-300 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none px-1 disabled:opacity-50"
                                    value={field.key}
                                    onChange={(e) => updateFormField(i, 'key', e.target.value)}
                                    placeholder="Key"
                                    onMouseDown={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                    disabled={!canEdit}
                                />
                                <span className="text-slate-300 dark:text-slate-600">:</span>
                                <input
                                    className="flex-1 min-w-0 text-xs font-mono bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-[2px] focus:border-blue-500 focus:outline-none dark:text-slate-300 disabled:opacity-50"
                                    value={field.value}
                                    onChange={(e) => updateFormField(i, 'value', e.target.value)} // String input allowed
                                    placeholder="Value"
                                    onMouseDown={e => e.stopPropagation()}
                                    onKeyDown={e => e.stopPropagation()}
                                    disabled={!canEdit}
                                />
                                <button disabled={!canEdit} onClick={(e) => { e.stopPropagation(); removeFormField(i); }} className="opacity-0 group-hover/field:opacity-100 text-slate-400 hover:text-red-500 dark:hover:text-red-400 disabled:hidden">
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={(e) => { e.stopPropagation(); addFormField(); }}
                            disabled={!canEdit}
                            className={`text-xs flex items-center justify-center gap-1 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/30 dark:hover:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-700 border-dashed transition-colors ${!canEdit ? 'hidden' : ''}`}
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
                            className="flex-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded text-xs py-1 px-2 font-medium focus:outline-none focus:border-blue-500 cursor-pointer dark:text-slate-200 disabled:opacity-50"
                            onMouseDown={e => e.stopPropagation()}
                            disabled={!canEdit}
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
                            className="w-full h-20 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-blue-500 font-mono resize-y text-slate-700 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Result: {0}, Tax: {1}"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                            <label className="block text-xs font-medium text-blue-500 dark:text-blue-400 mb-1">Output</label>
                            <div className="text-sm font-mono text-blue-700 dark:text-blue-300 break-words whitespace-pre-wrap">
                                {result !== undefined ? formatResult(result) : <span className="text-blue-300 italic">Connect inputs...</span>}
                            </div>
                        </div>
                    </div>
                )}

                {type === 'UNPACK' && (
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Keys to Extract</label>
                        {(data.keys || []).map((key, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => {
                                        const newKeys = [...(data.keys || [])];
                                        newKeys[i] = e.target.value;
                                        handleChange('keys', newKeys);
                                    }}
                                    placeholder="key name"
                                    className="flex-1 h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-violet-500"
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <div className="flex flex-col">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveKey(i, 'up'); }}
                                        disabled={i === 0}
                                        className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                        <ArrowUp size={10} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveKey(i, 'down'); }}
                                        disabled={i === (data.keys || []).length - 1}
                                        className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                        <ArrowDown size={10} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        const newKeys = (data.keys || []).filter((_, idx) => idx !== i);
                                        handleChange('keys', newKeys);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm"
                                    title="Remove key"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newKeys = [...(data.keys || []), ''];
                                handleChange('keys', newKeys);
                            }}
                            className="w-full mt-1 py-1 text-xs text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20"
                        >
                            + Add Key
                        </button>

                        {/* Show input object preview */}
                        {inputs.object && typeof inputs.object === 'object' && (
                            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] text-slate-400">Available keys: </span>
                                <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400">
                                    {Object.keys(inputs.object).join(', ')}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {type === 'PACK' && (
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">Keys to Create</label>
                        {(data.keys || []).map((key, i) => (
                            <div key={i} className="flex items-center gap-1">
                                <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => {
                                        const newKeys = [...(data.keys || [])];
                                        newKeys[i] = e.target.value;
                                        handleChange('keys', newKeys);
                                    }}
                                    placeholder="key name"
                                    className="flex-1 h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-violet-500"
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                                <div className="flex flex-col">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveKey(i, 'up'); }}
                                        disabled={i === 0}
                                        className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                        <ArrowUp size={10} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); moveKey(i, 'down'); }}
                                        disabled={i === (data.keys || []).length - 1}
                                        className="text-slate-400 hover:text-blue-500 disabled:opacity-30 disabled:hover:text-slate-400"
                                    >
                                        <ArrowDown size={10} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => {
                                        const newKeys = (data.keys || []).filter((_, idx) => idx !== i);
                                        handleChange('keys', newKeys);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm"
                                    title="Remove key"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={() => {
                                const newKeys = [...(data.keys || []), ''];
                                handleChange('keys', newKeys);
                            }}
                            className="w-full mt-1 py-1 text-xs text-violet-600 dark:text-violet-400 border border-dashed border-violet-300 dark:border-violet-700 rounded hover:bg-violet-50 dark:hover:bg-violet-900/20"
                        >
                            + Add Key
                        </button>
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

                {type === 'GROUP' && data.showResults && (
                    <div className="mt-2 flex-1 flex flex-col min-h-0 border-t border-slate-100 dark:border-slate-700/50 pt-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight px-1 mb-1">Outbound Values</div>
                        <div className="flex-1 min-h-0 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md overflow-y-auto">
                            {(data.subGraph?.nodes.filter(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST') || []).map((out, i) => (
                                <div key={out.id} className="flex items-center justify-between p-1.5 border-b last:border-0 border-slate-100 dark:border-slate-800">
                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate max-w-[100px]" title={out.data.label || `Output ${i + 1}`}>
                                        {out.data.label || `Output ${i + 1}`}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                        {result && result[out.id] !== undefined ? formatResult(result[out.id]) : '-'}
                                    </span>
                                </div>
                            ))}
                            {(!data.subGraph?.nodes.some(n => n.type === 'GROUP_OUTPUT' || n.type === 'GROUP_OUTPUT_LIST')) && (
                                <div className="p-2 text-center text-[10px] italic text-slate-400">No output nodes defined</div>
                            )}
                        </div>
                    </div>
                )}

                {type === 'COMMENT' && (
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        {/* Color Picker */}
                        <div className="flex items-center gap-1 mb-2 shrink-0">
                            <span className="text-[10px] text-slate-500">Color:</span>
                            {['#fef3c7', '#fce7f3', '#dbeafe', '#dcfce7', '#f3e8ff', '#fed7aa'].map(c => (
                                <button
                                    key={c}
                                    onClick={() => handleChange('color', c)}
                                    className={`w-4 h-4 rounded-full border-2 ${data.color === c ? 'border-slate-600 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                            <input
                                type="color"
                                value={data.color || '#fef3c7'}
                                onChange={(e) => handleChange('color', e.target.value)}
                                className="w-4 h-4 cursor-pointer border-0 p-0"
                                title="Custom color"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>
                        <textarea
                            value={data.text ?? ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            placeholder="Add your notes..."
                            style={{
                                backgroundColor: data.color || '#fef3c7',
                                height: `${data.height || 80}px`,
                                width: '100%'
                            }}
                            className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 overflow-y-auto"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}

                {type === 'FUNCTION' && (
                    <div className="space-y-2">
                        {/* Parameters */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Parameters</label>
                            {(data.params || []).map((param, i) => (
                                <div key={i} className="flex items-center gap-1 mb-1">
                                    <input
                                        type="text"
                                        value={param.name || ''}
                                        onChange={(e) => {
                                            const newParams = [...(data.params || [])];
                                            newParams[i] = { ...newParams[i], name: e.target.value };
                                            handleChange('params', newParams);
                                        }}
                                        placeholder={`p${i}`}
                                        className="flex-1 h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-emerald-500"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                    <button
                                        onClick={() => {
                                            const newParams = (data.params || []).filter((_, idx) => idx !== i);
                                            handleChange('params', newParams);
                                        }}
                                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm"
                                        title="Remove parameter"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newParams = [...(data.params || []), { name: '', default: 0 }];
                                    handleChange('params', newParams);
                                }}
                                className="w-full mt-1 py-1 text-xs text-emerald-600 dark:text-emerald-400 border border-dashed border-emerald-300 dark:border-emerald-700 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            >
                                + Add Parameter
                            </button>
                        </div>

                        {/* Code */}
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Formula</label>
                            <textarea
                                value={data.code || 'return 0'}
                                onChange={(e) => handleChange('code', e.target.value)}
                                className="w-full h-12 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-emerald-500 resize-none"
                                placeholder="return a + b"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>

                        {/* Result */}
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Result: </span>
                            <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                {result !== undefined && result !== null ? formatResult(result) : '—'}
                            </span>
                        </div>
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
                    <div className="space-y-2">
                        {/* Type Badge */}
                        {data.typeDef && data.typeDef !== 'any' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-pink-500 uppercase">Type</span>
                                <span className="px-2 py-0.5 text-[10px] font-mono bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded border border-pink-200 dark:border-pink-800 truncate max-w-full" title={data.typeDef}>
                                    {getTypeDisplayName(data.typeDef)}
                                </span>
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">Description</label>
                            <textarea
                                value={data.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="e.g., Object with keys: name, age"
                                className="w-full h-12 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-pink-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>
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
                    </div>
                )}

                {/* Display Value for Group Output */}
                {type === 'GROUP_OUTPUT' && (
                    <div className="space-y-2">
                        {/* Type Badge */}
                        {data.typeDef && data.typeDef !== 'any' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-pink-500 uppercase">Type</span>
                                <span className="px-2 py-0.5 text-[10px] font-mono bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded border border-pink-200 dark:border-pink-800 truncate max-w-full" title={data.typeDef}>
                                    {getTypeDisplayName(data.typeDef)}
                                </span>
                            </div>
                        )}
                        <div>
                            <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">Description</label>
                            <textarea
                                value={data.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="e.g., Calculated total with tax"
                                className="w-full h-12 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-pink-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}

                {/* Display Value for Group Output List */}
                {type === 'GROUP_OUTPUT_LIST' && (
                    <div className="space-y-2">
                        {/* Type Badge */}
                        {data.typeDef && data.typeDef !== 'any' && (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-pink-500 uppercase">Type</span>
                                <span className="px-2 py-0.5 text-[10px] font-mono bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded border border-pink-200 dark:border-pink-800 truncate max-w-full" title={data.typeDef}>
                                    {getTypeDisplayName(data.typeDef)}
                                </span>
                            </div>
                        )}
                        <div className="text-[10px] text-violet-500 mb-1">Aggregates multiple values into array</div>
                        <div>
                            <label className="block text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">Description</label>
                            <textarea
                                value={data.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="e.g., Collected results from map operation"
                                className="w-full h-12 px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-pink-500 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}

                {/* Render Labels for Group/Node Ports */}
                {inputHandles.map((h, i) => h.label && !(type === 'GROUP' && data.showResults) && (
                    <div key={h.id || i} className="absolute left-3 flex items-center gap-1 group/handle cursor-help"
                        style={{ top: typeof h.top === 'number' ? h.top : h.top, transform: 'translateY(-50%)' }}
                        title={h.description || undefined}>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{h.label}</span>
                        {h.description && <span className="text-[8px] text-pink-400 dark:text-pink-500">ⓘ</span>}
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
                {outputHandles.map((h, i) => h.label && type !== 'UNPACK' && !(type === 'GROUP' && data.showResults) && (
                    <div key={h.id || i} className="absolute right-3 flex flex-row-reverse items-center gap-1 group/handle cursor-help"
                        style={{ top: typeof h.top === 'number' ? h.top : h.top, transform: 'translateY(-50%)' }}
                        title={h.description || undefined}>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono text-right">{h.label}</span>
                        {h.description && <span className="text-[8px] text-pink-400 dark:text-pink-500">ⓘ</span>}
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

                {(type === 'WARP_IN' || type === 'WARP_OUT') && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Tag Name</label>
                        <input
                            type="text"
                            value={data.tag || ''}
                            onChange={(e) => handleChange('tag', e.target.value)}
                            placeholder="e.g. Price"
                            className="w-full px-2 py-1 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 text-slate-700 dark:text-slate-200"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <p className="text-[10px] text-slate-400">
                            {type === 'WARP_IN' ? 'Receives value for this tag.' : 'Outputs value from matching Warp In.'}
                        </p>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-mono text-slate-500">Val:</span>
                            <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                                {result !== undefined && result !== null ? (typeof result === 'object' ? JSON.stringify(result) : String(result)) : '-'}
                            </span>
                        </div>
                    </div>
                )}

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
                {def.category !== 'Visuals' && type !== 'FINAL' && type !== 'GROUP' && type !== 'GROUP_INPUT' && type !== 'COMMENT' && type !== 'WARP_IN' && type !== 'WARP_OUT' && (
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
            </div>}

            {
                inputHandles.map(h => {
                    // Check for type warning on this input handle
                    const handleKey = h.id || 'default';
                    const warning = typeWarnings && typeWarnings[`${id}:${handleKey}`];
                    // Get typeDef for GROUP nodes from subGraph input nodes
                    let handleTypeDef = null;
                    if (type === 'GROUP' && data.subGraph) {
                        const inputNode = data.subGraph.nodes.find(n => n.id === h.id);
                        if (inputNode && inputNode.data) {
                            handleTypeDef = inputNode.data.typeDef;
                        }
                    }
                    return (
                        <Handle
                            key={handleKey}
                            type="input"
                            id={h.id}
                            position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                            onMouseDown={() => { }}
                            isValid={!warning}
                            description={h.description}
                            typeWarning={warning}
                            typeDef={handleTypeDef}
                        />
                    );
                })
            }

            {
                outputHandles.map(h => {
                    // Get typeDef for GROUP nodes from subGraph output nodes
                    let handleTypeDef = null;
                    if (type === 'GROUP' && data.subGraph) {
                        const outputNode = data.subGraph.nodes.find(n => n.id === h.id);
                        if (outputNode && outputNode.data) {
                            handleTypeDef = outputNode.data.typeDef;
                        }
                    }
                    return (
                        <Handle
                            key={h.id || 'default'}
                            type="output"
                            id={h.id}
                            position={{ y: typeof h.top === 'number' ? `${h.top}px` : h.top }}
                            onMouseDown={(e) => onStartConnect(e, id, h.id)}
                            isValid={true}
                            typeDef={handleTypeDef}
                        />
                    );
                })
            }

            {/* Resize Handle for FORM, FINAL, GROUP, and COMMENT */}
            {
                (type === 'FORM' || type === 'FINAL' || type === 'GROUP' || type === 'COMMENT') && (
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize z-50 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-tl"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startWidth = data.width || (type === 'GROUP' ? 256 : 200);
                            const startHeight = data.height || (type === 'GROUP' ? 120 : 160);
                            const handleMouseMove = (moveEvent) => {
                                const newWidth = Math.max(150, startWidth + (moveEvent.clientX - startX));
                                const newHeight = Math.max(60, startHeight + (moveEvent.clientY - startY));
                                onUpdateData(id, { ...data, width: newWidth, height: newHeight });
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

            {/* Type Definition Modal */}
            {(type === 'GROUP_INPUT' || type === 'GROUP_OUTPUT' || type === 'GROUP_INPUT_LIST' || type === 'GROUP_OUTPUT_LIST' || type === 'FORM' || type === 'PACK') && (
                <TypeDefinitionModal
                    isOpen={showTypeModal}
                    onClose={() => setShowTypeModal(false)}
                    currentType={data.typeDef || 'any'}
                    onSave={(newType) => handleChange('typeDef', newType)}
                    nodeLabel={data.label || def.label}
                    nodeType={type}
                />
            )}
        </div >
    );
};
