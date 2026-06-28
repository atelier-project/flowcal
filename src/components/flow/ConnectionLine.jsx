import React from 'react';
import { getBezierPath } from '../../utils/geometry';

export const ConnectionLine = ({
    id,
    start,
    end,
    label,
    isEditing,
    canEdit = true,
    onDelete,
    onStartEditLabel,
    onCommitLabel,
    onMouseEnter,
    onMouseLeave,
    disableTitle
}) => {
    const d = getBezierPath(start, end);
    const [mx, my] = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2];

    // The input is uncontrolled (defaultValue + autoFocus) so no effect is
    // needed to sync a draft. Enter/Escape change parent state synchronously,
    // which unmounts the input before any blur fires — so commit runs once.
    const commit = (value) => onCommitLabel && onCommitLabel(id, (value || '').trim());
    const cancel = () => onCommitLabel && onCommitLabel(id, label || '', true);

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
                onMouseEnter={(e) => onMouseEnter && onMouseEnter(e)}
                onMouseLeave={onMouseLeave}
                onMouseMove={(e) => onMouseEnter && onMouseEnter(e)}
            >
                {!disableTitle && <title>Double-click to delete</title>}
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
