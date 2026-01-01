import React from 'react';

/**
 * GetGlobalNodeBody
 * Dropdown selector for choosing a global variable.
 */
export const GetGlobalNodeBody = ({ data, handleChange, canEdit, globals }) => {
    const availableGlobals = globals || [];

    return (
        <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Variable Key</label>
            <select
                value={data.key || ''}
                onChange={(e) => handleChange('key', e.target.value)}
                className="w-full px-2 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm focus:outline-none focus:border-purple-500 dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!canEdit}
            >
                <option value="" disabled>Select Variable...</option>
                {availableGlobals.map((g, i) => (
                    <option key={i} value={g.key}>
                        {g.key} ({g.type})
                    </option>
                ))}
            </select>
            {data.key && (
                <div className="mt-1 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    <span className="text-[10px] text-slate-400 truncate">
                        Bound to {data.key}
                    </span>
                </div>
            )}
            {!data.key && (
                <div className="mt-1 text-[10px] text-purple-400 italic">
                    Select a variable from settings
                </div>
            )}
        </div>
    );
};

GetGlobalNodeBody.handlesType = (type) => type === 'GET_GLOBAL';
