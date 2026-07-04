import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Generic React error boundary.
 *
 * React error boundaries must be class components — there is no hook equivalent
 * for `componentDidCatch`. Everything else in the app can stay functional.
 *
 * Props:
 * - children:  the subtree to protect.
 * - fallback:  (error, reset) => ReactNode. Rendered when a child throws.
 *              Defaults to a full-page recover screen.
 * - onError:   optional (error, info) => void side-effect (logging, telemetry).
 * - resetKeys: array; when any value changes, the boundary clears its error and
 *              re-renders children. Use to auto-recover when the offending input
 *              (e.g. the selected flow) changes.
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        // Surface it for debugging; a real deployment could forward this on.
        console.error('ErrorBoundary caught an error:', error, info);
        this.props.onError?.(error, info);
    }

    componentDidUpdate(prevProps) {
        // Auto-reset when the caller signals the inputs have changed.
        if (this.state.error && prevProps.resetKeys !== this.props.resetKeys) {
            const prev = prevProps.resetKeys || [];
            const next = this.props.resetKeys || [];
            const changed = prev.length !== next.length || next.some((k, i) => k !== prev[i]);
            if (changed) this.reset();
        }
    }

    reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (error) {
            const { fallback } = this.props;
            if (fallback) return fallback(error, this.reset);
            return <AppErrorFallback error={error} onReset={this.reset} />;
        }
        return this.props.children;
    }
}

/**
 * Friendly full-page recover screen for top-level render failures.
 * Self-contained (no app context) so it works even if providers fail.
 */
export function AppErrorFallback({ error, onReset }) {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{ backgroundColor: 'var(--bg-primary, #0f172a)', color: 'var(--text-primary, #e2e8f0)' }}
        >
            <div
                className="max-w-md w-full rounded-xl border p-6 text-center shadow-lg"
                style={{ backgroundColor: 'var(--bg-secondary, #1e293b)', borderColor: 'var(--border-primary, #334155)' }}
            >
                <div className="flex justify-center mb-3">
                    <AlertTriangle size={40} className="text-amber-500" />
                </div>
                <h1 className="text-lg font-semibold mb-1">Something went wrong</h1>
                <p className="text-sm opacity-70 mb-4">
                    The app hit an unexpected error and couldn&apos;t continue. Your saved
                    flows are safe — try recovering, or reload the page.
                </p>
                {error?.message && (
                    <pre className="text-left text-[11px] font-mono whitespace-pre-wrap break-words rounded-md p-2 mb-4 max-h-32 overflow-auto opacity-80"
                        style={{ backgroundColor: 'var(--bg-primary, #0f172a)', borderColor: 'var(--border-primary, #334155)' }}>
                        {String(error.message)}
                    </pre>
                )}
                <div className="flex gap-2 justify-center">
                    <button
                        onClick={onReset}
                        className="px-4 py-2 rounded-md text-sm font-medium border transition-colors hover:opacity-80"
                        style={{ borderColor: 'var(--border-primary, #334155)' }}
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-md text-sm font-medium text-white transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--accent-primary, #3b82f6)' }}
                    >
                        Reload page
                    </button>
                </div>
            </div>
        </div>
    );
}
