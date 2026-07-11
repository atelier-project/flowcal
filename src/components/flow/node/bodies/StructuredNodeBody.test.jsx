/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { StructuredNodeBody } from './StructuredNodeBody';
import { resolveNodeBody } from './index';

afterEach(cleanup);

const noopHelpers = {
    handleChange: vi.fn(),
    moveKey: vi.fn(),
    addFormField: vi.fn(),
    updateFormField: vi.fn(),
    removeFormField: vi.fn(),
};

describe('resolveNodeBody — structured types', () => {
    test('resolves FORM/UNPACK/PACK/REDUCE to StructuredNodeBody', () => {
        for (const type of ['FORM', 'UNPACK', 'PACK', 'REDUCE']) {
            expect(resolveNodeBody(type)).toBe(StructuredNodeBody);
        }
    });
});

describe('StructuredNodeBody', () => {
    test('FORM edits a field key via updateFormField', () => {
        const updateFormField = vi.fn();
        render(
            <StructuredNodeBody
                type="FORM"
                data={{ fields: [{ key: 'a', value: 1 }] }}
                inputs={{}}
                canEdit
                {...noopHelpers}
                updateFormField={updateFormField}
            />
        );
        fireEvent.change(screen.getByDisplayValue('a'), { target: { value: 'b' } });
        expect(updateFormField).toHaveBeenCalledWith(0, 'key', 'b');
    });

    test('UNPACK adds a key and shows the available-keys preview', () => {
        const handleChange = vi.fn();
        render(
            <StructuredNodeBody
                type="UNPACK"
                data={{ keys: ['x'] }}
                inputs={{ object: { foo: 1, bar: 2 } }}
                canEdit
                {...noopHelpers}
                handleChange={handleChange}
            />
        );
        fireEvent.click(screen.getByText('+ Add Key'));
        expect(handleChange).toHaveBeenCalledWith('keys', ['x', '']);
        expect(screen.getByText(/foo, bar/)).toBeTruthy();
    });

    test('PACK reorders a key via moveKey', () => {
        const moveKey = vi.fn();
        render(
            <StructuredNodeBody
                type="PACK"
                data={{ keys: ['a', 'b'] }}
                inputs={{}}
                canEdit
                {...noopHelpers}
                moveKey={moveKey}
            />
        );
        // Second row's "up" button moves index 1 up.
        const rows = screen.getAllByPlaceholderText('key name');
        const secondRow = rows[1].closest('div.flex.items-center');
        fireEvent.click(within(secondRow).getAllByRole('button')[0]);
        expect(moveKey).toHaveBeenCalledWith(1, 'up');
    });

    test('REDUCE parses a numeric initial value', () => {
        const handleChange = vi.fn();
        render(
            <StructuredNodeBody
                type="REDUCE"
                data={{ initialValue: 0 }}
                inputs={{}}
                canEdit
                {...noopHelpers}
                handleChange={handleChange}
            />
        );
        fireEvent.change(screen.getByDisplayValue('0'), { target: { value: '42' } });
        expect(handleChange).toHaveBeenCalledWith('initialValue', 42);
    });

    test('returns null for an unhandled type', () => {
        const { container } = render(
            <StructuredNodeBody type="INPUT" data={{}} inputs={{}} canEdit {...noopHelpers} />
        );
        expect(container.firstChild).toBeNull();
    });
});
