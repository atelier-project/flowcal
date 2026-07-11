/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MiscNodeBody } from './MiscNodeBody';
import { GetGlobalNodeBody } from './GetGlobalNodeBody';
import { resolveNodeBody } from './index';

afterEach(cleanup);

const helpers = {
    handleChange: vi.fn(),
    formatResult: (v) => `res:${v}`,
    formatFinalValue: (v) => `final:${v}`,
    addReportRow: vi.fn(),
    removeReportRow: vi.fn(),
    updateReportLabel: vi.fn(),
};

describe('resolveNodeBody — misc + global types', () => {
    test('resolves the misc types to MiscNodeBody', () => {
        for (const type of ['LOOKUP', 'FINAL', 'REPORT', 'COMMENT', 'FUNCTION']) {
            expect(resolveNodeBody(type)).toBe(MiscNodeBody);
        }
    });

    test('resolves GET_GLOBAL to GetGlobalNodeBody', () => {
        expect(resolveNodeBody('GET_GLOBAL')).toBe(GetGlobalNodeBody);
    });
});

describe('MiscNodeBody', () => {
    test('LOOKUP adds a case', () => {
        const handleChange = vi.fn();
        render(<MiscNodeBody type="LOOKUP" data={{ cases: [{ key: 'a', value: '1' }] }} inputs={[]} canEdit {...helpers} handleChange={handleChange} />);
        fireEvent.click(screen.getByText('+ Add Case'));
        expect(handleChange).toHaveBeenCalledWith('cases', [{ key: 'a', value: '1' }, { key: '', value: '' }]);
    });

    test('FINAL shows the formatted headline value', () => {
        render(<MiscNodeBody type="FINAL" data={{}} inputs={[30]} canEdit={false} {...helpers} />);
        expect(screen.getByText('final:30')).toBeTruthy();
    });

    test('FINAL prompts to connect when there is no input', () => {
        render(<MiscNodeBody type="FINAL" data={{}} inputs={[]} canEdit={false} {...helpers} />);
        expect(screen.getByText(/connect input/i)).toBeTruthy();
    });

    test('REPORT renders a row per input with formatted values and adds rows', () => {
        const addReportRow = vi.fn();
        render(
            <MiscNodeBody
                type="REPORT"
                data={{ inputCount: 2, rowLabels: [] }}
                inputs={[]}
                result={[10, 20]}
                inputSources={{ 0: 'Base Price' }}
                canEdit
                {...helpers}
                addReportRow={addReportRow}
            />
        );
        expect(screen.getByText('res:10')).toBeTruthy();
        expect(screen.getByText('res:20')).toBeTruthy();
        expect(screen.getByPlaceholderText('Base Price')).toBeTruthy();
        fireEvent.click(screen.getByText('+ Add row'));
        expect(addReportRow).toHaveBeenCalled();
    });

    test('COMMENT edits the note text', () => {
        const handleChange = vi.fn();
        render(<MiscNodeBody type="COMMENT" data={{ text: 'hi' }} inputs={[]} canEdit {...helpers} handleChange={handleChange} />);
        fireEvent.change(screen.getByPlaceholderText(/add your notes/i), { target: { value: 'note' } });
        expect(handleChange).toHaveBeenCalledWith('text', 'note');
    });

    test('FUNCTION edits the formula and shows the result', () => {
        const handleChange = vi.fn();
        render(<MiscNodeBody type="FUNCTION" data={{ code: 'return 1' }} inputs={[]} result={7} canEdit {...helpers} handleChange={handleChange} />);
        expect(screen.getByText('res:7')).toBeTruthy();
        fireEvent.change(screen.getByDisplayValue('return 1'), { target: { value: 'return 2' } });
        expect(handleChange).toHaveBeenCalledWith('code', 'return 2');
    });
});
