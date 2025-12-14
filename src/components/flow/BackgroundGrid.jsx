import React from 'react';

export const BackgroundGrid = ({ offset }) => (
    <svg className="absolute inset-0 w-full h-full -z-10 opacity-20 pointer-events-none">
        <defs>
            <pattern id="grid" x={offset.x % 40} y={offset.y % 40} width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-primary, #e2e8f0)" strokeWidth="1" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
);
