import React from 'react';

/**
 * ControlNodeBody — small "control" bodies: operator/order selectors, index/key
 * inputs, and one-line descriptions. All depend only on `data` (+ `handleChange`
 * / `canEdit`), no computed inputs.
 *
 * Handles: COMPARE, SORT, FILTER, GET, GET_KEY, IF
 */
export const ControlNodeBody = ({ type, data, handleChange, canEdit }) => {
    switch (type) {
        case 'COMPARE':
            return (
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
            );
        case 'SORT':
            return (
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
            );
        case 'FILTER':
            return (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Enter inside to define the condition: Item, Index, and Include nodes
                </p>
            );
        case 'GET':
            return (
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
            );
        case 'GET_KEY':
            return (
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
            );
        case 'IF':
            return (
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center italic">
                    If Condition is truthy (&gt;0), output TrueVal, else FalseVal.
                </div>
            );
        default:
            return null;
    }
};

ControlNodeBody.handlesType = (type) =>
    ['COMPARE', 'SORT', 'FILTER', 'GET', 'GET_KEY', 'IF'].includes(type);
