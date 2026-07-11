/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DisplayNodeBody } from './DisplayNodeBody';
import { resolveNodeBody } from './index';

// The chart components pull in a charting lib; stub them so this stays a pure
// body-routing test.
vi.mock('../../../ui/Charts', () => ({
    GaugeChart: (props) => <div data-testid="gauge" data-value={props.value} />,
    LineChart: () => <div data-testid="line-chart" />,
    BarChart: () => <div data-testid="bar-chart" />,
}));
vi.mock('../../../ui/DataTable', () => ({
    DataTable: () => <div data-testid="data-table" />,
}));

afterEach(cleanup);

describe('resolveNodeBody registry', () => {
    test('resolves display/description types to DisplayNodeBody', () => {
        for (const type of ['RANGE', 'COLLECTOR', 'GAUGE', 'PROGRESS', 'LINE_CHART', 'BAR_CHART', 'TABLE']) {
            expect(resolveNodeBody(type)).toBe(DisplayNodeBody);
        }
    });

    test('returns null for types still handled by the inline switch', () => {
        for (const type of ['LOOKUP', 'SUM', 'GROUP', 'FINAL', 'GET_GLOBAL']) {
            expect(resolveNodeBody(type)).toBeNull();
        }
    });
});

describe('DisplayNodeBody', () => {
    test('renders the RANGE description', () => {
        render(<DisplayNodeBody type="RANGE" inputs={[]} />);
        expect(screen.getByText(/generates array/i)).toBeTruthy();
    });

    test('passes gauge inputs through to the chart', () => {
        render(<DisplayNodeBody type="GAUGE" inputs={[42, 0, 100]} />);
        expect(screen.getByTestId('gauge').getAttribute('data-value')).toBe('42');
    });

    test('renders a table for TABLE', () => {
        render(<DisplayNodeBody type="TABLE" inputs={[[{ a: 1 }]]} />);
        expect(screen.getByTestId('data-table')).toBeTruthy();
    });

    test('returns nothing for an unhandled type', () => {
        const { container } = render(<DisplayNodeBody type="INPUT" inputs={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
