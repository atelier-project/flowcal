/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ControlNodeBody } from './ControlNodeBody';
import { resolveNodeBody } from './index';

afterEach(cleanup);

describe('resolveNodeBody — control types', () => {
    test('resolves the control types to ControlNodeBody', () => {
        for (const type of ['COMPARE', 'SORT', 'FILTER', 'GET', 'GET_KEY', 'IF']) {
            expect(resolveNodeBody(type)).toBe(ControlNodeBody);
        }
    });
});

describe('ControlNodeBody', () => {
    test('COMPARE shows the operator and reports changes', () => {
        const handleChange = vi.fn();
        render(<ControlNodeBody type="COMPARE" data={{ operator: '>=' }} handleChange={handleChange} canEdit />);
        const select = screen.getByRole('combobox');
        expect(select.value).toBe('>=');
        fireEvent.change(select, { target: { value: '==' } });
        expect(handleChange).toHaveBeenCalledWith('operator', '==');
    });

    test('SORT is disabled when canEdit is false', () => {
        render(<ControlNodeBody type="SORT" data={{ order: 'desc' }} handleChange={() => {}} canEdit={false} />);
        expect(screen.getByRole('combobox').disabled).toBe(true);
    });

    test('GET edits the index', () => {
        const handleChange = vi.fn();
        render(<ControlNodeBody type="GET" data={{ index: 2 }} handleChange={handleChange} canEdit />);
        fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
        expect(handleChange).toHaveBeenCalledWith('index', 5);
    });

    test('IF renders a static description', () => {
        render(<ControlNodeBody type="IF" data={{}} handleChange={() => {}} canEdit />);
        expect(screen.getByText(/if condition is truthy/i)).toBeTruthy();
    });

    test('returns null for an unhandled type', () => {
        const { container } = render(<ControlNodeBody type="INPUT" data={{}} handleChange={() => {}} canEdit />);
        expect(container.firstChild).toBeNull();
    });
});
