/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NodeHeader } from './NodeHeader';

// Mock Lucide icons to avoid rendering complexities
vi.mock('lucide-react', () => ({
    Settings: () => <div data-testid="icon-settings" />,
    Maximize2: () => <div data-testid="icon-maximize" />,
    Trash2: () => <div data-testid="icon-trash" />,
    Copy: () => <div data-testid="icon-copy" />,
    Lock: () => <div data-testid="icon-lock" />,
    Unlock: () => <div data-testid="icon-unlock" />,
    Eye: () => <div data-testid="icon-eye" />,
    EyeOff: () => <div data-testid="icon-eye-off" />,
    Plus: () => <div data-testid="icon-plus" />,
    ChevronDown: () => <div data-testid="icon-chevron-down" />,
    ChevronUp: () => <div data-testid="icon-chevron-up" />,
    Package: () => <div data-testid="icon-package" />,
    Shield: () => <div data-testid="icon-shield" />,
    ShieldAlert: () => <div data-testid="icon-shield-alert" />,
    MoreVertical: () => <div data-testid="icon-more" />,
    Type: () => <div data-testid="icon-type" />,
    Plug: () => <div data-testid="icon-plug" />,
}));

// Ensure cleanup after each test
afterEach(() => {
    cleanup();
});

describe('NodeHeader Component', () => {
    const mockHandleChange = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnDuplicate = vi.fn();
    const mockHandleLockToggle = vi.fn();
    const mockSetShowTypeModal = vi.fn();

    const defaultProps = {
        id: 'node-1',
        type: 'INPUT',
        data: { label: 'Test Node', locked: false },
        canEdit: true,
        canUnlock: true,
        isEffectivelyLocked: false,
        handleChange: mockHandleChange,
        onDelete: mockOnDelete,
        onDuplicate: mockOnDuplicate,
        handleLockToggle: mockHandleLockToggle,
        setShowTypeModal: mockSetShowTypeModal,
        // Required UI props
        ui: { colorClass: 'bg-white text-blue-600' },
        def: { label: 'Number Input' },
        Icon: ({ size }) => <div data-testid="node-icon" style={{ width: size, height: size }} />,
    };

    test('renders node label correctly', () => {
        render(<NodeHeader {...defaultProps} />);
        const input = screen.getByDisplayValue('Test Node');
        expect(input).toBeDefined();
    });

    test('renders node type label as placeholder', () => {
        render(<NodeHeader {...defaultProps} />);
        // "Number Input" is passed as def.label, rendered as placeholder
        expect(screen.getByPlaceholderText('Number Input')).toBeDefined();
    });

    test('calls handleChange when label is edited', () => {
        render(<NodeHeader {...defaultProps} />);
        const input = screen.getByDisplayValue('Test Node');
        fireEvent.change(input, { target: { value: 'New Name' } });
        expect(mockHandleChange).toHaveBeenCalledWith('label', 'New Name');
    });

    test('shows default label if data.label is missing', () => {
        render(<NodeHeader {...defaultProps} data={{}} def={{}} />);
        expect(screen.getByPlaceholderText('Node')).toBeDefined();
    });

    test('icon-lock shown when locked', () => {
        render(<NodeHeader {...defaultProps} data={{ locked: true }} canUnlock={true} />);
        expect(screen.getByTestId('icon-lock')).toBeDefined();
    });

    test('icon-unlock shown when not locked', () => {
        render(<NodeHeader {...defaultProps} data={{ locked: false }} />);
        expect(screen.getByTestId('icon-unlock')).toBeDefined();
    });

    test('calls handleLockToggle when lock icon clicked', () => {
        render(<NodeHeader {...defaultProps} data={{ locked: false }} />);
        const lockBtn = screen.getByTestId('icon-unlock').parentElement;
        fireEvent.click(lockBtn);
        expect(mockHandleLockToggle).toHaveBeenCalled();
    });

    test('duplicate button calls onDuplicate', () => {
        render(<NodeHeader {...defaultProps} />);
        const copyBtn = screen.getByTestId('icon-copy').parentElement;
        fireEvent.click(copyBtn);
        expect(mockOnDuplicate).toHaveBeenCalledWith('node-1');
    });

    test('delete button calls onDelete', () => {
        render(<NodeHeader {...defaultProps} />);
        const trashBtn = screen.getByTestId('icon-trash').parentElement;
        fireEvent.click(trashBtn);
        expect(mockOnDelete).toHaveBeenCalledWith('node-1');
    });
});
