import React from 'react';
import { AlertTriangle, Trash2, RotateCw } from 'lucide-react';
import { ErrorBoundary } from '../../ui/ErrorBoundary';

/**
 * Per-node error boundary. If a single node's render throws, we show an inline
 * error card *at that node's position* instead of blanking the whole canvas —
 * every other node stays interactive. Offers retry (re-render the node) and
 * delete (remove the offending node).
 *
 * The boundary auto-resets when the node's data changes (resetKeys), so editing
 * the value that caused the throw recovers the node without a manual retry.
 */
export function NodeErrorBoundary({ id, type, position, data, onDelete, children }) {
    return (
        <ErrorBoundary
            resetKeys={[data]}
            fallback={(error, reset) => (
                <div
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                    className="absolute z-20 w-64 rounded-lg border-2 border-red-400 bg-red-50 dark:bg-red-950/40 shadow-lg p-3"
                >
                    <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={14} className="text-red-500 shrink-0" />
                        <span className="text-xs font-semibold text-red-700 dark:text-red-300 truncate">
                            {type || 'Node'} failed to render
                        </span>
                    </div>
                    <p className="text-[10px] font-mono text-red-600 dark:text-red-400 break-words max-h-16 overflow-auto mb-2">
                        {String(error?.message || error)}
                    </p>
                    <div className="flex gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); reset(); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        >
                            <RotateCw size={11} /> Retry
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-medium py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                            <Trash2 size={11} /> Delete
                        </button>
                    </div>
                </div>
            )}
        >
            {children}
        </ErrorBoundary>
    );
}
