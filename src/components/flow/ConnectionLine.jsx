import React from 'react';
import { getEdgePath } from '../../utils/geometry';

// Wire colour swatches shown when an edge is selected. Choosing the active one
// again (or the reset) clears back to the theme default.
export const WIRE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899'];

// Selectable per-flow wire animations. 'pulse' is the original flowing dots.
export const WIRE_ANIMATIONS = ['pulse', 'fire', 'sparks', 'none'];

const FIRE_COLORS = ['#fbbf24', '#f97316', '#ef4444', '#fb923c', '#f59e0b'];
const SPARK_COLORS = ['#ffffff', '#fde047', '#fef08a'];

/**
 * The particles that flow along a wire, per the chosen animation style. Kept as
 * a small component so each style is self-contained. `d` is the path; `stroke`
 * is the wire's colour (used by the default pulse).
 */
function WireFlow({ animation, d, stroke }) {
    if (animation === 'none') return null;

    if (animation === 'fire') {
        // Warm embers that flow along the wire while flickering in size + opacity.
        return FIRE_COLORS.map((c, i) => (
            <circle key={i} r={3.5} fill={c}>
                <animateMotion dur={`${1.1 + i * 0.12}s`} repeatCount="indefinite" path={d} begin={`${i * 0.22}s`} />
                <animate attributeName="r" values="2;5;3;4;2" dur={`${0.5 + i * 0.05}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.25;1;0.5;0.9;0.25" dur={`${0.4 + i * 0.05}s`} repeatCount="indefinite" />
            </circle>
        ));
    }

    if (animation === 'sparks') {
        // Fast, tiny, twinkling sparks.
        return [0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} r={2.4 - (i % 3) * 0.5} fill={SPARK_COLORS[i % SPARK_COLORS.length]}>
                <animateMotion dur={`${0.7 + (i % 3) * 0.15}s`} repeatCount="indefinite" path={d} begin={`${i * 0.13}s`} />
                <animate attributeName="opacity" values="0;1;0.2;1;0" dur={`${0.35 + (i % 2) * 0.1}s`} repeatCount="indefinite" begin={`${i * 0.07}s`} />
            </circle>
        ));
    }

    // 'pulse' — the original three trailing dots.
    return (
        <>
            <circle r="4" fill={stroke} className="opacity-80">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} />
            </circle>
            <circle r="3" fill={stroke} className="opacity-60">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} begin="0.5s" />
            </circle>
            <circle r="2" fill={stroke} className="opacity-40">
                <animateMotion dur="1.5s" repeatCount="indefinite" path={d} begin="1s" />
            </circle>
        </>
    );
}

export const ConnectionLine = ({
    id,
    start,
    end,
    label,
    routing,
    animation = 'pulse',
    selected,
    dimmed,
    color,
    onSetColor,
    midX,
    onBendDown,
    onBendReset,
    onSelect,
    isEditing,
    canEdit = true,
    onDelete,
    onStartEditLabel,
    onCommitLabel,
    onMouseEnter,
    onMouseLeave,
    disableTitle
}) => {
    const d = getEdgePath(start, end, routing, midX);
    const [mx, my] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];
    const strokeW = selected ? 3.5 : 2;
    const glowW = selected ? 14 : 6;
    // A per-wire colour overrides the theme's connection colour everywhere the
    // wire is drawn (stroke, glow, flowing dots, endpoints).
    const stroke = color || 'var(--connection-stroke, #3b82f6)';
    const glow = color || 'var(--connection-glow, rgba(59, 130, 246, 0.5))';
    // The draggable orthogonal bend sits on the vertical run: at the user's x if
    // set, else the midpoint. Only meaningful when there's a vertical run.
    const bendX = typeof midX === 'number' ? midX : (start[0] + end[0]) / 2;
    const hasVerticalRun = Math.abs(start[1] - end[1]) >= 1;
    // Offset the bend grabber down the vertical run so it clears the centred
    // label (and colour palette above it), which otherwise cover it.
    const bendY = Math.min(Math.max(start[1], end[1]) - 8, my + 24);

    // The input is uncontrolled (defaultValue + autoFocus) so no effect is
    // needed to sync a draft. Enter/Escape change parent state synchronously,
    // which unmounts the input before any blur fires — so commit runs once.
    const commit = (value) => onCommitLabel && onCommitLabel(id, (value || '').trim());
    const cancel = () => onCommitLabel && onCommitLabel(id, label || '', true);

    return (
        <g className="group" style={{ opacity: dimmed ? 0.18 : 1, transition: 'opacity 0.15s ease' }}>
            {/* Glow layer (widens + brightens when the wire is highlighted) */}
            <path
                d={d}
                stroke={glow}
                strokeOpacity={color ? 0.4 : 1}
                strokeWidth={glowW}
                fill="none"
                className="transition-all duration-150"
            />
            {/* Main stroke */}
            <path
                d={d}
                stroke={stroke}
                strokeWidth={strokeW}
                fill="none"
                className="transition-all duration-150"
            />
            {/* Animated particles flowing along the wire (style is per-flow;
                pulse uses the wire's own colour). */}
            <WireFlow animation={animation} d={d} stroke={stroke} />
            {/* Endpoint markers — show exactly which ports a highlighted wire joins */}
            {selected && (
                <>
                    <circle cx={start[0]} cy={start[1]} r="5" fill={stroke} stroke="#fff" strokeWidth="1.5" />
                    <circle cx={end[0]} cy={end[1]} r="5" fill={stroke} stroke="#fff" strokeWidth="1.5" />
                </>
            )}

            {/* Draggable orthogonal bend — drag left/right to tidy the wire's
                vertical run; double-click to reset to the midpoint. */}
            {routing === 'orthogonal' && selected && canEdit && onBendDown && hasVerticalRun && (
                <g>
                    <circle
                        cx={bendX} cy={bendY} r="10"
                        fill="transparent"
                        className="cursor-ew-resize pointer-events-auto"
                        onMouseDown={(e) => { e.stopPropagation(); onBendDown(id, e); }}
                        onDoubleClick={(e) => { e.stopPropagation(); onBendReset && onBendReset(id); }}
                    >
                        <title>Drag to move the bend · double-click to reset</title>
                    </circle>
                    <circle cx={bendX} cy={bendY} r="4.5" fill="#fff" stroke={stroke} strokeWidth="2" className="pointer-events-none" />
                </g>
            )}

            {/* Colour swatches — pick a per-wire colour while it's selected */}
            {selected && canEdit && onSetColor && (
                <foreignObject x={mx - 76} y={my - 44} width="152" height="26" className="overflow-visible">
                    <div className="w-full h-full flex items-center justify-center gap-1 pointer-events-none">
                        <div className="flex items-center gap-1 px-1.5 py-1 rounded-full bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-slate-600 shadow-sm pointer-events-auto"
                            onMouseDown={(e) => e.stopPropagation()}>
                            {WIRE_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onSetColor(id, color === c ? null : c); }}
                                    className={`w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-800' : 'border-black/10'}`}
                                    style={{ backgroundColor: c }}
                                    title={color === c ? 'Clear colour' : `Colour this wire`}
                                />
                            ))}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onSetColor(id, null); }}
                                className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-500 text-[9px] leading-none text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center"
                                title="Reset to default colour"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </foreignObject>
            )}

            {/* Hover/click interaction layer */}
            <path
                d={d}
                fill="none"
                strokeWidth="12"
                stroke="transparent"
                className="cursor-pointer pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); onSelect && onSelect(id); }}
                onDoubleClick={(e) => { e.stopPropagation(); onDelete(id); }}
                onMouseEnter={(e) => onMouseEnter && onMouseEnter(e)}
                onMouseLeave={onMouseLeave}
                onMouseMove={(e) => onMouseEnter && onMouseEnter(e)}
            >
                {!disableTitle && <title>{selected ? 'Click to unhighlight · double-click to delete' : 'Click to highlight · double-click to delete'}</title>}
            </path>

            {/* Midpoint label / editor */}
            <foreignObject x={mx - 70} y={my - 13} width="140" height="26" className="overflow-visible">
                <div className="w-full h-full flex items-center justify-center" style={{ pointerEvents: 'none' }}>
                    {isEditing ? (
                        <input
                            key={`${id}-edit`}
                            autoFocus
                            defaultValue={label || ''}
                            onBlur={(e) => commit(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') commit(e.currentTarget.value);
                                else if (e.key === 'Escape') cancel();
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            maxLength={80}
                            placeholder="label…"
                            className="pointer-events-auto w-full px-1.5 py-0.5 text-[11px] text-center rounded border border-blue-400 bg-white dark:bg-slate-800 dark:text-slate-100 shadow focus:outline-none"
                        />
                    ) : label ? (
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => { e.stopPropagation(); canEdit && onStartEditLabel && onStartEditLabel(id); }}
                            title={canEdit ? 'Double-click to edit label' : undefined}
                            className="pointer-events-auto max-w-full truncate px-1.5 py-0.5 text-[11px] font-medium rounded bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-sm cursor-text"
                        >
                            {label}
                        </button>
                    ) : canEdit ? (
                        <button
                            type="button"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); onStartEditLabel && onStartEditLabel(id); }}
                            title="Add label"
                            className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity w-4 h-4 flex items-center justify-center text-[11px] leading-none rounded-full bg-white dark:bg-slate-800 text-slate-400 hover:text-blue-500 border border-slate-200 dark:border-slate-600 shadow-sm"
                        >
                            +
                        </button>
                    ) : null}
                </div>
            </foreignObject>
        </g>
    );
};
