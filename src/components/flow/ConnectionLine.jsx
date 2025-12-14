import React from 'react';
import { getBezierPath } from '../../utils/geometry';

export const ConnectionLine = ({ id, start, end, onDelete }) => {
    const d = getBezierPath(start, end);

    return (
        <g className="group">
            {/* Glow layer */}
            <path
                d={d}
                stroke="var(--connection-glow, rgba(59, 130, 246, 0.5))"
                strokeWidth="6"
                fill="none"
                className="transition-colors duration-200"
            />
            {/* Main stroke */}
            <path
                d={d}
                stroke="var(--connection-stroke, #3b82f6)"
                strokeWidth="2"
                fill="none"
                className="transition-colors duration-200"
            />
            {/* Animated flowing dots */}
            <circle r="4" fill="var(--connection-stroke, #3b82f6)" className="opacity-80">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
            </circle>
            <circle r="3" fill="var(--connection-stroke, #3b82f6)" className="opacity-60">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} begin="0.5s" />
            </circle>
            <circle r="2" fill="var(--connection-stroke, #3b82f6)" className="opacity-40">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} begin="1s" />
            </circle>
            {/* Hover interaction layer */}
            <path
                d={d}
                fill="none"
                strokeWidth="12"
                stroke="transparent"
                className="cursor-pointer pointer-events-auto"
                onDoubleClick={(e) => { e.stopPropagation(); onDelete(id); }}
            >
                <title>Double-click to delete</title>
            </path>
        </g>
    );
};
