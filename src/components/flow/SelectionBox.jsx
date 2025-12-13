import React from 'react';

export const SelectionBox = ({ rect }) => {
    if (!rect) return null;
    const width = Math.abs(rect.current.x - rect.start.x);
    const height = Math.abs(rect.current.y - rect.start.y);
    const x = Math.min(rect.current.x, rect.start.x);
    const y = Math.min(rect.current.y, rect.start.y);

    return (
        <div
            className="absolute border border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none z-50"
            style={{ left: x, top: y, width, height }}
        />
    );
};
