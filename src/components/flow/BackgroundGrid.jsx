import React from 'react';

/**
 * Infinite background grid, locked to the flow's world space: it pans AND zooms
 * with the nodes. The SVG stays full-viewport (screen space) while each pattern
 * is driven by `patternTransform` = translate(pan) · scale(zoom), so a world grid
 * cell always lines up with the nodes. Grid line thickness stays crisp at any
 * zoom via `vector-effect: non-scaling-stroke`.
 */
export const BackgroundGrid = ({ offset, scale = 1, style = 'technical', opacity = 0.3 }) => {
    const stroke = 'var(--border-primary, #94a3b8)';
    const accent = 'var(--accent-primary, #3b82f6)';
    // translate first (screen px), then scale the world cell — world point (0,0)
    // maps to screen (pan.x, pan.y), matching the node layer's transform.
    const t = `translate(${offset.x} ${offset.y}) scale(${scale})`;

    if (style === 'dots') {
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity }}>
                <defs>
                    <pattern id="dotsPattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={t}>
                        <circle cx="10" cy="10" r="1.2" fill={stroke} />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dotsPattern)" />
            </svg>
        );
    }

    if (style === 'lines') {
        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity }}>
                <defs>
                    <pattern id="linesPattern" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={t}>
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#linesPattern)" />
            </svg>
        );
    }

    // Technical pattern (default). The fine grid is inlined into the 80px tile
    // (rather than a nested pattern) so a single patternTransform applies cleanly.
    return (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, opacity }}>
            <defs>
                <pattern id="techGrid" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform={t}>
                    {/* fine 20px lines */}
                    <path d="M20 0V80 M40 0V80 M60 0V80 M0 20H80 M0 40H80 M0 60H80"
                        fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.6" vectorEffect="non-scaling-stroke" />
                    {/* bold 80px lines */}
                    <path d="M80 0 L0 0 0 80" fill="none" stroke={stroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                </pattern>
                <pattern id="techDots" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={t}>
                    <circle cx="20" cy="20" r="1.5" fill={stroke} opacity="0.8" />
                </pattern>
                <pattern id="techCorners" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform={t}>
                    <path d="M 0 6 L 0 0 L 6 0" fill="none" stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <path d="M 74 0 L 80 0 L 80 6" fill="none" stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <path d="M 80 74 L 80 80 L 74 80" fill="none" stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                    <path d="M 6 80 L 0 80 L 0 74" fill="none" stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#techGrid)" />
            <rect width="100%" height="100%" fill="url(#techDots)" />
            <rect width="100%" height="100%" fill="url(#techCorners)" />
        </svg>
    );
};
