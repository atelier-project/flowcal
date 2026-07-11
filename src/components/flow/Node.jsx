import React, { useRef } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNodeHeight } from '../../utils/layout';
import { Handle } from './Handle';
import { getUI } from './nodeUIMap';
import { getDefinition } from '../../engine/nodeDefinitions';
import { TypeDefinitionModal } from './TypeDefinitionModal';
import { getTypeDisplayName } from '../../utils/typeUtils';
import { NodeHeader } from './node/NodeHeader';
import { useNodeHandles, NodeHandles } from './node/NodeHandles';
import { resolveNodeBody } from './node/bodies';

export const Node = ({ id, type, data, position, selected, isHovered, onDragStart, onDelete, onDuplicate, onUpdateData, onStartConnect, onOpenEditor, inputs, inputSources, result, onEnterGroup, onSaveAsCustom, readOnly, typeWarnings, availableGlobals }) => {
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

    // --- Handle Logic (extracted to hook) ---
    const { inputHandles, outputHandles } = useNodeHandles(type, data);
    const minHeight = getNodeHeight({ type, data });

    // Note: The detailed handle calculation logic is now in useNodeHandles hook
    // The original inputHandles and outputHandles useMemo blocks have been moved there

    // --- Helpers ---
    const addCollectorInput = () => {
        onUpdateData(id, { ...data, inputCount: (data.inputCount || 2) + 1 });
    };

    // REPORT row helpers. Rows are handle-indexed (in_0..in_{n-1}); we only add or
    // remove the last row so existing connections never re-index.
    const addReportRow = () => {
        onUpdateData(id, { ...data, inputCount: (data.inputCount || 2) + 1 });
    };
    const removeReportRow = () => {
        const count = data.inputCount || 2;
        if (count <= 1) return;
        const rowLabels = (data.rowLabels || []).slice(0, count - 1);
        onUpdateData(id, { ...data, inputCount: count - 1, rowLabels });
    };
    const updateReportLabel = (index, value) => {
        const rowLabels = [...(data.rowLabels || [])];
        rowLabels[index] = value;
        onUpdateData(id, { ...data, rowLabels });
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

    // FINAL node display formatting: optional decimal precision + unit suffix.
    const formatFinalValue = (val) => {
        let out;
        const hasDecimals = data.decimals !== undefined && data.decimals !== null && data.decimals !== '';
        if (typeof val === 'number' && !Number.isNaN(val)) {
            out = hasDecimals ? val.toFixed(Math.max(0, Number(data.decimals))) : String(val);
        } else {
            out = String(val);
        }
        return data.unit ? `${out} ${data.unit}` : out;
    };

    // INPUT node display formatting. Purely cosmetic — the raw value (data.value)
    // is what flows downstream; precision/percent/suffix only affect the readout.
    const formatInputDisplay = (val) => {
        const num = Number(val);
        if (Number.isNaN(num)) return String(val);
        const hasPrecision = data.precision !== undefined && data.precision !== null && data.precision !== '';
        const p = hasPrecision ? Math.max(0, Number(data.precision)) : undefined;
        if (data.displayFormat === 'percent') {
            const scaled = num * 100;
            return `${p !== undefined ? scaled.toFixed(p) : scaled}%`;
        }
        const base = p !== undefined ? num.toFixed(p) : String(num);
        return data.displayUnit ? `${base}${data.displayUnit}` : base;
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
            className={`group/node absolute ${!data.width ? 'w-64' : ''} rounded-lg shadow-[0_6px_18px_-4px_rgba(0,0,0,0.22)] border-2 flex flex-col transition-[box-shadow,border-color] duration-200
        ${selected ? 'shadow-blue-500/20 z-20 ring-2 ring-blue-400' : 'z-10'}
        ${isHovered ? 'ring-4 ring-blue-300 ring-opacity-50 scale-105 shadow-xl' : ''}
        ${type === 'FINAL' ? 'border-green-500 shadow-green-100' : ''}
      `}
            onMouseDown={(e) => onDragStart(e, id)}
        >
            {/* Header */}
            <NodeHeader
                id={id}
                type={type}
                data={data}
                Icon={Icon}
                ui={ui}
                def={def}
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                canEdit={canEdit}
                canUnlock={canUnlock}
                isEffectivelyLocked={isEffectivelyLocked}
                handleChange={handleChange}
                handleLockToggle={handleLockToggle}
                onUpdateData={onUpdateData}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onEnterGroup={onEnterGroup}
                onOpenEditor={onOpenEditor}
                onSaveAsCustom={onSaveAsCustom}
                setShowTypeModal={setShowTypeModal}
                addCollectorInput={addCollectorInput}
                position={position}
            />

            {/* Collapsed GROUP summary: one row per output (label : value), aligned
                to its port so the flow's state is readable without expanding, and
                each outgoing wire leaves from a distinct, labelled row. */}
            {type === 'GROUP' && data.collapsed && outputHandles.map((h) => (
                <div
                    key={h.id || 'out'}
                    className="absolute right-4 flex items-center gap-1.5 max-w-[85%] pointer-events-none"
                    style={{ top: typeof h.top === 'number' ? h.top : 40, transform: 'translateY(-50%)' }}
                    title={h.label}
                >
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{h.label}</span>
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 truncate">
                        {result && result[h.id] !== undefined ? formatResult(result[h.id]) : '–'}
                    </span>
                </div>
            ))}

            {/* Body - conditionally render based on collapsed state */}
            {!data.collapsed && <div className="p-3 space-y-3 flex-1 flex flex-col overflow-y-auto">
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

                {type === 'SELECT' && (() => {
                    const options = data.options || [];
                    const display = data.display || 'dropdown';
                    const setOptions = (next) => handleChange('options', next);
                    // Mirror compute's fallback so the picker reflects what the node outputs.
                    const effectiveValue = options.some(o => String(o.value) === String(data.value))
                        ? data.value
                        : (options[0]?.value ?? '');
                    return (
                        <div className="space-y-2">
                            {/* The picker */}
                            {display === 'radio' ? (
                                <div className="space-y-1">
                                    {options.map((o, i) => (
                                        <label key={i} className="flex items-center gap-2 text-sm cursor-pointer dark:text-slate-200">
                                            <input
                                                type="radio"
                                                name={`select-${id}`}
                                                checked={String(effectiveValue) === String(o.value)}
                                                onChange={() => handleChange('value', o.value)}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                disabled={!canEdit}
                                                className="accent-green-500 disabled:opacity-50"
                                            />
                                            <span className="truncate">{o.label || o.value || `Option ${i + 1}`}</span>
                                        </label>
                                    ))}
                                    {options.length === 0 && <p className="text-[10px] italic text-slate-400">No options yet — add some below.</p>}
                                </div>
                            ) : (
                                <select
                                    value={effectiveValue}
                                    onChange={(e) => handleChange('value', e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    disabled={!canEdit}
                                    className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-green-500 dark:text-slate-200 disabled:opacity-50"
                                >
                                    {options.length === 0 && <option value="">No options</option>}
                                    {options.map((o, i) => (
                                        <option key={i} value={o.value}>{o.label || o.value || `Option ${i + 1}`}</option>
                                    ))}
                                </select>
                            )}

                            {/* Authoring: display toggle + option list */}
                            {canEdit && (
                                <div className="border-t border-slate-100 dark:border-slate-700/50 pt-2 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Display</span>
                                        <div className="flex gap-1">
                                            {['dropdown', 'radio'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => handleChange('display', m)}
                                                    className={`px-2 py-0.5 rounded text-[10px] capitalize border ${display === m ? 'bg-green-500 text-white border-green-500' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
                                                >
                                                    {m}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-slate-400 px-0.5">
                                        <span>Label</span><span>Value</span><span></span>
                                    </div>
                                    {options.map((o, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1">
                                            <input
                                                type="text"
                                                value={o.label ?? ''}
                                                onChange={(e) => { const next = [...options]; next[i] = { ...next[i], label: e.target.value }; setOptions(next); }}
                                                placeholder="label"
                                                className="h-6 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-green-500"
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                            <input
                                                type="text"
                                                value={o.value ?? ''}
                                                onChange={(e) => { const next = [...options]; next[i] = { ...next[i], value: e.target.value }; setOptions(next); }}
                                                placeholder="value"
                                                className="h-6 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-green-500"
                                                onMouseDown={(e) => e.stopPropagation()}
                                            />
                                            <button
                                                onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                                                className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm"
                                                title="Remove option"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setOptions([...options, { label: '', value: '' }])}
                                        className="w-full mt-1 py-1 text-xs text-green-600 dark:text-green-400 border border-dashed border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                        + Add option
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })()}

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

                {/* Logic Nodes */}
                {/* Registry-resolved bodies (issue #34): node bodies migrated out
                    of this switch. Exactly one body matches a given node type
                    (the GROUP family is the exception and stays inline below), so
                    this renders in place of the old inline blocks. */}
                {(() => {
                    const RegistryBody = resolveNodeBody(type);
                    return RegistryBody
                        ? <RegistryBody
                            type={type} id={id} data={data} inputs={inputs} result={result} inputSources={inputSources}
                            handleChange={handleChange} canEdit={canEdit} globals={availableGlobals}
                            moveKey={moveKey}
                            addFormField={addFormField} updateFormField={updateFormField} removeFormField={removeFormField}
                            addReportRow={addReportRow} removeReportRow={removeReportRow} updateReportLabel={updateReportLabel}
                            formatInputDisplay={formatInputDisplay} formatResult={formatResult} formatFinalValue={formatFinalValue}
                            onOpenEditor={onOpenEditor}
                        />
                        : null;
                })()}

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
                        ) : type === 'UNPACK' && typeof result === 'object' && result !== null ? (
                            /* UNPACK: Show each key's value separately */
                            <div className="flex flex-col gap-1">
                                {(data.keys || []).map((key, i) => (
                                    <div key={i} className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400">{key}:</span>
                                        <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-1 rounded border border-slate-100 dark:border-slate-700 break-all whitespace-pre-wrap max-h-16 overflow-y-auto">
                                            {result[key] !== undefined
                                                ? JSON.stringify(result[key], null, 1).replace(/"/g, '')
                                                : 'null'}
                                        </div>
                                    </div>
                                ))}
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
            </div>
            }

            {/* Port labels — rendered as node-level overlays (siblings of the
                handle dots) so the first row isn't clipped by the body's
                overflow-y-auto. */}
            {inputHandles.map((h, i) => h.label && !(type === 'GROUP' && data.showResults) && (
                <div key={`lbl-${h.id || i}`} className="absolute left-3 flex items-center gap-1 group/handle cursor-help"
                    style={{ top: typeof h.top === 'number' ? h.top : h.top, marginTop: 0, transform: 'translateY(-50%)' }}
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
            {outputHandles.map((h, i) => h.label && type !== 'UNPACK' && !(type === 'GROUP' && (data.showResults || data.collapsed)) && (
                <div key={`lbl-${h.id || i}`} className="absolute right-3 flex flex-row-reverse items-center gap-1 group/handle cursor-help"
                    style={{ top: typeof h.top === 'number' ? h.top : h.top, marginTop: 0, transform: 'translateY(-50%)' }}
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

            {/* Width resize (right edge) for the remaining nodes — lets you widen a
                node to read a long label. Width keeps the output handles attached;
                height stays content-driven. The types below have their own
                width+height corner handle, and collapsed nodes aren't resized. */}
            {
                canEdit && !data.collapsed &&
                !['FORM', 'FINAL', 'GROUP', 'COMMENT', 'FRAME', 'TEXT_LABEL'].includes(type) && (
                    <div
                        className="absolute top-8 bottom-2 right-0 w-1.5 cursor-ew-resize z-40 rounded-full opacity-0 group-hover/node:opacity-50 hover:!opacity-100 bg-blue-400"
                        title="Drag to resize width"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startWidth = data.width || 256;
                            const handleMouseMove = (moveEvent) => {
                                const newWidth = Math.max(140, startWidth + (moveEvent.clientX - startX));
                                onUpdateData(id, { ...data, width: newWidth });
                            };
                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };
                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }}
                    />
                )
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
            {
                (type === 'GROUP_INPUT' || type === 'GROUP_OUTPUT' || type === 'GROUP_INPUT_LIST' || type === 'GROUP_OUTPUT_LIST' || type === 'FORM' || type === 'PACK') && (
                    <TypeDefinitionModal
                        isOpen={showTypeModal}
                        onClose={() => setShowTypeModal(false)}
                        currentType={data.typeDef || 'any'}
                        onSave={(newType) => handleChange('typeDef', newType)}
                        nodeLabel={data.label || def.label}
                        nodeType={type}
                    />
                )
            }
        </div >
    );
};
