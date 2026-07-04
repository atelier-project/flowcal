/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Silence the expected React error-boundary console noise for these tests.
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
});

// A child that throws on demand.
function Boom({ explode }) {
    if (explode) throw new Error('kaboom');
    return <div>alive</div>;
}

describe('ErrorBoundary', () => {
    test('renders children when nothing throws', () => {
        render(
            <ErrorBoundary>
                <div>hello</div>
            </ErrorBoundary>
        );
        expect(screen.getByText('hello')).toBeTruthy();
    });

    test('renders the default recover screen when a child throws', () => {
        render(
            <ErrorBoundary>
                <Boom explode />
            </ErrorBoundary>
        );
        expect(screen.getByText('Something went wrong')).toBeTruthy();
        expect(screen.getByText('kaboom')).toBeTruthy();
    });

    test('calls onError with the thrown error', () => {
        const onError = vi.fn();
        render(
            <ErrorBoundary onError={onError}>
                <Boom explode />
            </ErrorBoundary>
        );
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    });

    test('custom fallback receives error and a working reset', () => {
        render(
            <ErrorBoundary fallback={(err, reset) => (
                <button onClick={reset}>recover: {err.message}</button>
            )}>
                <Boom explode />
            </ErrorBoundary>
        );
        expect(screen.getByText('recover: kaboom')).toBeTruthy();
    });

    test('reset restores children once they stop throwing', () => {
        let explode = true;
        const { rerender } = render(
            <ErrorBoundary fallback={(err, reset) => <button onClick={reset}>retry</button>}>
                <Boom explode={explode} />
            </ErrorBoundary>
        );
        // Fallback is showing.
        expect(screen.getByText('retry')).toBeTruthy();

        // The offending input is fixed, then the user retries.
        explode = false;
        rerender(
            <ErrorBoundary fallback={(err, reset) => <button onClick={reset}>retry</button>}>
                <Boom explode={explode} />
            </ErrorBoundary>
        );
        fireEvent.click(screen.getByText('retry'));
        expect(screen.getByText('alive')).toBeTruthy();
    });

    test('auto-resets when resetKeys change', () => {
        const { rerender } = render(
            <ErrorBoundary resetKeys={[1]} fallback={() => <div>broken</div>}>
                <Boom explode />
            </ErrorBoundary>
        );
        expect(screen.getByText('broken')).toBeTruthy();

        // New resetKey + child no longer throws → boundary clears and re-renders.
        rerender(
            <ErrorBoundary resetKeys={[2]} fallback={() => <div>broken</div>}>
                <Boom explode={false} />
            </ErrorBoundary>
        );
        expect(screen.getByText('alive')).toBeTruthy();
    });
});
