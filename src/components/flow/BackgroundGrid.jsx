import React from 'react';

export const BackgroundGrid = ({ offset, style = 'technical', opacity = 0.3 }) => {
    const baseOpacity = opacity;

    // Dots pattern only
    if (style === 'dots') {
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity: baseOpacity }}>
                <defs>
                    <pattern id="dotsPattern" x={offset.x % 20} y={offset.y % 20} width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="1.5" fill="var(--border-primary, #94a3b8)" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotsPattern)" />
            </svg>
        );
    }

    // Simple lines pattern
    if (style === 'lines') {
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity: baseOpacity }}>
                <defs>
                    <pattern id="linesPattern" x={offset.x % 40} y={offset.y % 40} width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--border-primary, #94a3b8)" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#linesPattern)" />
            </svg>
        );
    }

    // Technical pattern (default)
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity: baseOpacity }}>
            <defs>
                <pattern id="smallGrid" x={offset.x % 20} y={offset.y % 20} width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--border-primary, #94a3b8)" strokeWidth="0.5" opacity="0.6" />
                </pattern>
                <pattern id="largeGrid" x={offset.x % 80} y={offset.y % 80} width="80" height="80" patternUnits="userSpaceOnUse">
                    <rect width="80" height="80" fill="url(#smallGrid)" />
                    <path d="M 80 0 L 0 0 0 80" fill="none" stroke="var(--border-primary, #94a3b8)" strokeWidth="1" />
                </pattern>
                <pattern id="dots" x={offset.x % 40} y={offset.y % 40} width="40" height="40" patternUnits="userSpaceOnUse">
                    <circle cx="20" cy="20" r="1.5" fill="var(--border-primary, #94a3b8)" opacity="0.8" />
                </pattern>
                <pattern id="corners" x={offset.x % 80} y={offset.y % 80} width="80" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 0 6 L 0 0 L 6 0" fill="none" stroke="var(--accent-primary, #3b82f6)" strokeWidth="1.5" />
                    <path d="M 74 0 L 80 0 L 80 6" fill="none" stroke="var(--accent-primary, #3b82f6)" strokeWidth="1.5" />
                    <path d="M 80 74 L 80 80 L 74 80" fill="none" stroke="var(--accent-primary, #3b82f6)" strokeWidth="1.5" />
                    <path d="M 6 80 L 0 80 L 0 74" fill="none" stroke="var(--accent-primary, #3b82f6)" strokeWidth="1.5" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#largeGrid)" />
            <rect width="100%" height="100%" fill="url(#dots)" />
            <rect width="100%" height="100%" fill="url(#corners)" />
        </svg>
    );
};

