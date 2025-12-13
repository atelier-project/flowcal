import React from 'react';
import { getBezierPath } from '../../utils/geometry';

export const ConnectionLine = ({ id, start, end, onDelete }) => {
    const d = getBezierPath(start, end);
    return (
        <g className="group">
            <path d={d} stroke="rgba(59, 130, 246, 0.5)" strokeWidth="4" fill="none" className="transition-colors duration-200 group-hover:stroke-red-200" />
            <path d={d} stroke="#3b82f6" strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-dash transition-colors duration-200 group-hover:stroke-red-500" />
            <circle cx={end[0]} cy={end[1]} r="3" fill="#3b82f6" className="transition-colors duration-200 group-hover:fill-red-500" />
            <path d={d} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer pointer-events-auto" onDoubleClick={(e) => { e.stopPropagation(); onDelete(id); }} >
                <title>Double-click to delete</title>
            </path>
        </g>
    );
};
