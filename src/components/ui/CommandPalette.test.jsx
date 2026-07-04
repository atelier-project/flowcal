/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { CommandPalette } from './CommandPalette';

afterEach(cleanup);

describe('CommandPalette', () => {
    test('renders nothing when closed', () => {
        const { container } = render(
            <CommandPalette isOpen={false} onClose={() => {}} onSelect={() => {}} />
        );
        expect(container.firstChild).toBeNull();
    });

    test('lists nodes and filters by the search query', () => {
        render(<CommandPalette isOpen onClose={() => {}} onSelect={() => {}} />);
        // Something is listed by default.
        expect(screen.getByPlaceholderText(/search nodes/i)).toBeTruthy();

        fireEvent.change(screen.getByPlaceholderText(/search nodes/i), { target: { value: 'multiply' } });
        expect(screen.getByText('Multiply')).toBeTruthy();
        // An unrelated node is filtered out.
        expect(screen.queryByText('Subtract')).toBeNull();
    });

    test('clicking a result inserts that node and closes', () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();
        render(<CommandPalette isOpen onClose={onClose} onSelect={onSelect} />);

        fireEvent.change(screen.getByPlaceholderText(/search nodes/i), { target: { value: 'multiply' } });
        fireEvent.click(screen.getByText('Multiply'));

        expect(onSelect).toHaveBeenCalledWith('MUL');
        expect(onClose).toHaveBeenCalled();
    });

    test('Enter inserts the highlighted result; Escape closes', () => {
        const onSelect = vi.fn();
        const onClose = vi.fn();
        render(<CommandPalette isOpen onClose={onClose} onSelect={onSelect} />);
        const input = screen.getByPlaceholderText(/search nodes/i);

        fireEvent.change(input, { target: { value: 'multiply' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith('MUL');

        fireEvent.keyDown(input, { key: 'Escape' });
        expect(onClose).toHaveBeenCalled();
    });
});
