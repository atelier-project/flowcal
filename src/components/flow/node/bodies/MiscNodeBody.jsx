import React from 'react';

/**
 * MiscNodeBody — the remaining single-block bodies that don't share a tidy
 * theme: LOOKUP (case table), FINAL (headline result + caption/unit/decimals),
 * REPORT (labelled multi-row readout), COMMENT (sticky note), FUNCTION
 * (params + formula + result).
 *
 * The GROUP family stays inline: a GROUP node renders two body blocks
 * (always + when showResults), which the one-body-per-type registry can't model.
 *
 * Handles: LOOKUP, FINAL, REPORT, COMMENT, FUNCTION
 */
export const MiscNodeBody = ({
    type,
    data,
    inputs,
    result,
    inputSources,
    handleChange,
    canEdit,
    formatResult,
    formatFinalValue,
    addReportRow,
    removeReportRow,
    updateReportLabel,
}) => {
    if (type === 'LOOKUP') {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Match</label>
                    <select
                        value={data.mode || 'exact'}
                        onChange={(e) => handleChange('mode', e.target.value)}
                        className="flex-1 h-6 px-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:border-orange-500 disabled:opacity-50"
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={!canEdit}
                    >
                        <option value="exact">Exact</option>
                        <option value="up">Round up ≥</option>
                        <option value="down">Round down ≤</option>
                    </select>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-1 text-[10px] text-slate-400 px-1">
                    <span>{(data.mode && data.mode !== 'exact') ? 'Threshold' : 'Key'}</span>
                    <span>Value</span>
                    <span></span>
                </div>
                {(data.cases || []).map((c, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1">
                        <input
                            type="text"
                            value={c.key ?? ''}
                            onChange={(e) => {
                                const next = [...(data.cases || [])];
                                next[i] = { ...next[i], key: e.target.value };
                                handleChange('cases', next);
                            }}
                            placeholder="key"
                            className="h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <input
                            type="text"
                            value={c.value ?? ''}
                            onChange={(e) => {
                                const next = [...(data.cases || [])];
                                next[i] = { ...next[i], value: e.target.value };
                                handleChange('cases', next);
                            }}
                            placeholder="value"
                            className="h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-orange-500 disabled:opacity-50"
                            onMouseDown={(e) => e.stopPropagation()}
                            disabled={!canEdit}
                        />
                        <button
                            onClick={() => {
                                const next = (data.cases || []).filter((_, idx) => idx !== i);
                                handleChange('cases', next);
                            }}
                            className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 text-sm disabled:opacity-30"
                            title="Remove case"
                            disabled={!canEdit}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => handleChange('cases', [...(data.cases || []), { key: '', value: '' }])}
                    className="w-full mt-1 py-1 text-xs text-orange-600 dark:text-orange-400 border border-dashed border-orange-300 dark:border-orange-700 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-40"
                    disabled={!canEdit}
                >
                    + Add Case
                </button>
                <div className="flex items-center gap-2 pt-1">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Default</label>
                    <input
                        type="text"
                        value={data.default ?? ''}
                        onChange={(e) => handleChange('default', e.target.value)}
                        placeholder="if no match"
                        className="flex-1 h-6 px-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-mono focus:outline-none focus:border-orange-500 disabled:opacity-50"
                        onMouseDown={(e) => e.stopPropagation()}
                        disabled={!canEdit}
                    />
                </div>
                {result !== undefined && (
                    <div className="mt-1 p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded text-center">
                        <span className="text-xs font-mono font-bold text-orange-700 dark:text-orange-300">{formatResult(result)}</span>
                    </div>
                )}
            </div>
        );
    }

    if (type === 'FINAL') {
        return (
            <div className="flex-1 flex flex-col">
                {data.caption && (
                    <div className="mb-1 text-xs font-medium text-green-800/80 dark:text-green-300/80 whitespace-pre-wrap break-words">
                        {data.caption.replace(/\\n/g, '\n')}
                    </div>
                )}
                <div className="flex-1 min-h-[60px] p-3 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg flex items-center justify-center text-center">
                    <span className="text-lg font-bold text-green-800 dark:text-green-300 whitespace-pre-wrap break-words w-full">
                        {inputs.length > 0 && inputs[0] !== undefined ? formatFinalValue(inputs[0]) : <span className="text-green-300/50 text-sm">Connect Input</span>}
                    </span>
                </div>
                {canEdit && (
                    <div className="mt-2 space-y-1">
                        <textarea
                            value={data.caption ?? ''}
                            onChange={(e) => handleChange('caption', e.target.value)}
                            placeholder={'Caption (optional) — use \\n for line breaks'}
                            rows={2}
                            className="w-full px-1.5 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] resize-y focus:outline-none focus:border-green-500 text-slate-600 dark:text-slate-300"
                            onMouseDown={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                            <span className="shrink-0">Unit</span>
                            <input
                                type="text"
                                value={data.unit ?? ''}
                                onChange={(e) => handleChange('unit', e.target.value)}
                                placeholder="e.g. TB"
                                className="w-16 h-6 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:border-green-500"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                            <span className="shrink-0 ml-1">Decimals</span>
                            <input
                                type="number"
                                min={0}
                                max={10}
                                value={data.decimals ?? ''}
                                onChange={(e) => handleChange('decimals', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                                placeholder="auto"
                                className="w-12 h-6 px-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-center focus:outline-none focus:border-green-500"
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (type === 'REPORT') {
        return (
            <div className="flex-1 flex flex-col gap-2">
                {canEdit ? (
                    <input
                        type="text"
                        value={data.title ?? ''}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Report title"
                        className="w-full px-1 py-0.5 bg-transparent border-b border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-green-500"
                        onMouseDown={(e) => e.stopPropagation()}
                    />
                ) : (data.title ? <div className="px-1 text-sm font-bold text-slate-700 dark:text-slate-200">{data.title}</div> : null)}

                <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {Array.from({ length: data.inputCount || 2 }).map((_, i) => {
                        const count = data.inputCount || 2;
                        const isLast = i === count - 1;
                        const placeholder = (inputSources && inputSources[i]) || `Value ${i + 1}`;
                        const value = Array.isArray(result) ? result[i] : undefined;
                        return (
                            <div key={i} className="flex items-center justify-between gap-2 px-2 min-h-[28px] bg-slate-50/50 dark:bg-slate-900/30">
                                {canEdit ? (
                                    <input
                                        type="text"
                                        value={data.rowLabels?.[i] ?? ''}
                                        onChange={(e) => updateReportLabel(i, e.target.value)}
                                        placeholder={placeholder}
                                        className="min-w-0 flex-1 bg-transparent text-xs text-slate-500 dark:text-slate-400 focus:outline-none placeholder:opacity-70"
                                        onMouseDown={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="min-w-0 flex-1 text-xs text-slate-500 dark:text-slate-400 truncate">{data.rowLabels?.[i] || placeholder}</span>
                                )}
                                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 text-right whitespace-pre-wrap break-words max-w-[55%]">
                                    {formatResult(value)}
                                </span>
                                {canEdit && isLast && count > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeReportRow(); }}
                                        className="shrink-0 w-4 h-4 flex items-center justify-center text-red-400 hover:text-red-600 text-sm leading-none"
                                        title="Remove last row"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {canEdit && (
                    <button
                        onClick={(e) => { e.stopPropagation(); addReportRow(); }}
                        className="w-full py-1 text-xs text-green-600 dark:text-green-400 border border-dashed border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                        + Add row
                    </button>
                )}
            </div>
        );
    }

    if (type === 'COMMENT') {
        return (
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
        );
    }

    if (type === 'FUNCTION') {
        return (
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
        );
    }

    return null;
};

MiscNodeBody.handlesType = (type) => ['LOOKUP', 'FINAL', 'REPORT', 'COMMENT', 'FUNCTION'].includes(type);
