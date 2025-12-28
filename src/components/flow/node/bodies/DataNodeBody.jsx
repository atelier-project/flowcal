import React from 'react';

/**
 * DataNodeBody - Body content for data input nodes
 * 
 * Handles: INPUT (number), TEXT_INPUT, DATE_INPUT
 */
export const DataNodeBody = ({ type, data, handleChange, canEdit }) => {
    if (type === 'INPUT') {
        return (
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
        );
    }

    if (type === 'TEXT_INPUT') {
        return (
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
        );
    }

    if (type === 'DATE_INPUT') {
        return (
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
        );
    }

    return null;
};

// Helper to check if this component handles the given type
DataNodeBody.handlesType = (type) => ['INPUT', 'TEXT_INPUT', 'DATE_INPUT'].includes(type);
