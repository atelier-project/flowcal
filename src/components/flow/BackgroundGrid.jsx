import React from 'react';

export const BackgroundGrid = ({ offset }) => (
    <svg className="absolute inset-0 w-full h-full -z-10 opacity-10 pointer-events-none">
        <pattern id="grid" x={offset.x % 40} y={offset.y % 40} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
);
