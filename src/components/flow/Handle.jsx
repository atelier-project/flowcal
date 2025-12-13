import React from 'react';

export const Handle = ({ type, position, onMouseDown, isValid, id }) => {
    return (
        <div
            className={`absolute w-4 h-4 rounded-full border-2 cursor-crosshair transition-all duration-200 z-10 flex items-center justify-center
        ${type === 'input' ? '-left-2' : '-right-2'}
        ${isValid ? 'bg-green-400 border-green-600 hover:scale-125' : 'bg-slate-200 border-slate-400 hover:border-blue-500'}
        -translate-y-1/2
      `}
            style={{ top: position.y }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown && onMouseDown(e, type, id);
            }}
            title={id ? `Port: ${id}` : 'Connection Port'}
        >
            <div className="w-1 h-1 bg-slate-400 rounded-full pointer-events-none" />
        </div>
    );
};
