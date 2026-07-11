/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ValueNodeBody } from './ValueNodeBody';
import { resolveNodeBody } from './index';

afterEach(cleanup);

const helpers = {
    handleChange: vi.fn(),
    formatInputDisplay: (v) => `disp:${v}`,
    formatResult: (v) => `res:${v}`,
    onOpenEditor: vi.fn(),
};

describe('resolveNodeBody — value types', () => {
    test('resolves INPUT/CUSTOM/TEMPLATE to ValueNodeBody', () => {
        for (const type of ['INPUT', 'CUSTOM', 'TEMPLATE']) {
            expect(resolveNodeBody(type)).toBe(ValueNodeBody);
        }
    });
});

describe('ValueNodeBody', () => {
    test('INPUT shows the formatted value and edits the raw number', () => {
        const handleChange = vi.fn();
        render(<ValueNodeBody type="INPUT" data={{ value: 10 }} inputs={[]} canEdit {...helpers} handleChange={handleChange} />);
        // formatInputDisplay drives the read-out.
        expect(screen.getByText('disp:10')).toBeTruthy();
        // First spinbutton is the value input (a second one is the precision control).
        fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '25' } });
        expect(handleChange).toHaveBeenCalledWith('value', 25);
    });

    test('INPUT hides the format controls when not editable', () => {
        render(<ValueNodeBody type="INPUT" data={{ value: 1 }} inputs={[]} canEdit={false} {...helpers} />);
        // The display-format select only renders for editors.
        expect(screen.queryByRole('combobox')).toBeNull();
    });

    test('CUSTOM opens the code editor', () => {
        const onOpenEditor = vi.fn();
        render(<ValueNodeBody type="CUSTOM" id="n9" data={{ func: 'return 1;' }} inputs={[2, 3]} canEdit {...helpers} onOpenEditor={onOpenEditor} />);
        fireEvent.click(screen.getByText(/open editor/i));
        expect(onOpenEditor).toHaveBeenCalledWith('n9', 'return 1;', [2, 3]);
    });

    test('TEMPLATE renders the formatted output', () => {
        render(<ValueNodeBody type="TEMPLATE" data={{ template: 'x' }} inputs={[]} result={42} canEdit {...helpers} />);
        expect(screen.getByText('res:42')).toBeTruthy();
    });

    test('TEMPLATE shows a placeholder when there is no result', () => {
        render(<ValueNodeBody type="TEMPLATE" data={{ template: 'x' }} inputs={[]} result={undefined} canEdit {...helpers} />);
        expect(screen.getByText(/connect inputs/i)).toBeTruthy();
    });
});
