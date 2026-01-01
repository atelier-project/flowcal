import React from 'react';
import { Bug, BugOff } from 'lucide-react';

export const DebugToolbar = ({ isEnabled, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border transition-all duration-200
                ${isEnabled
                    ? 'bg-purple-600 text-white border-purple-500 shadow-purple-500/20'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                }
            `}
            title={isEnabled ? "Disable Debug Mode" : "Enable Debug Mode"}
        >
            {isEnabled ? <Bug size={16} /> : <Bug size={16} />}
            <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                {isEnabled ? "Debug On" : "Debug Off"}
            </span>
        </button>
    );
};
