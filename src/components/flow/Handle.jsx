import React from 'react';

export const Handle = ({ type, position, onMouseDown, isValid, id, description, typeWarning, typeDef }) => {
    // Build tooltip text
    let tooltipText = description || (id ? `Port: ${id}` : 'Connection Port');
    if (typeDef && typeDef !== 'any') {
        tooltipText += `\nType: ${typeDef}`;
    }
    if (typeWarning) {
        tooltipText += '\n⚠️ Type mismatch warning';
    }

    // Determine styling based on type warning
    const getHandleClasses = () => {
        if (typeWarning) {
            return 'bg-red-400 border-red-600 hover:bg-red-500';
        }
        if (isValid) {
            return 'bg-green-400 border-green-600 hover:scale-125';
        }
        return 'bg-slate-200 border-slate-400 hover:border-blue-500';
    };

    return (
        <div
            className={`absolute w-4 h-4 rounded-full border-2 cursor-crosshair transition-all duration-200 z-10 flex items-center justify-center
        ${type === 'input' ? '-left-2' : '-right-2'}
        ${getHandleClasses()}
        -translate-y-1/2
      `}
            style={{ top: position.y }}
            onMouseDown={(e) => {
                e.stopPropagation();
                onMouseDown && onMouseDown(e, type, id);
            }}
            title={tooltipText}
        >
            {typeWarning ? (
                <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
            ) : (
                <div className="w-1 h-1 bg-slate-400 rounded-full pointer-events-none" />
            )}
        </div>
    );
};
