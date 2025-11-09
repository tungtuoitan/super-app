import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { GenericTagAutoComplete } from './TagAutoComplete';
import { IAutoCompleteOptions } from './GenericAutoComplete';

const mockOptions: IAutoCompleteOptions[] = [
    { id: '1', label: 'Tag 1', isActive: true },
    { id: '2', label: 'Tag 2', isActive: true },
    { id: '3', label: 'Tag 3', isActive: false }, 
    { id: '4', label: 'Tag 4', isActive: true },
];

describe('GenericTagAutoComplete', () => {
    const mockOnChange = vi.fn();

    beforeEach(() => {
        mockOnChange.mockClear();
    });

    it('renders with default props', () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                onChange={mockOnChange}
            />
        );

        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('renders with custom label and placeholder', () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                onChange={mockOnChange}
                label="Custom Tags"
                placeholder="Add custom tag"
            />
        );

        expect(screen.getByLabelText('Custom Tags')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Add custom tag')).toBeInTheDocument();
    });

    it('shows selected tags based on value prop', () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                value="1,2"
                onChange={mockOnChange}
            />
        );

        // Selected tags should be displayed
        expect(screen.getByText('Tag 1')).toBeInTheDocument();
        expect(screen.getByText('Tag 2')).toBeInTheDocument();
    });

    it('excludes selected options from available options', async () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                value="1"
                onChange={mockOnChange}
            />
        );

        // Click to open dropdown
        const input = screen.getByLabelText('Tags');
        await userEvent.click(input);

        // Tag 1 should not be in options (already selected)
        expect(screen.queryByText('Tag 1')).not.toBeInTheDocument();
        
        // Other tags should be available
        expect(screen.getByText('Tag 2')).toBeInTheDocument();
        expect(screen.getByText('Tag 4')).toBeInTheDocument();
    });

    it('calls onChange with comma-separated string when tags are selected', async () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                onChange={mockOnChange}
            />
        );

        const input = screen.getByLabelText('Tags');
        await userEvent.click(input);

        // Select Tag 1
        await userEvent.click(screen.getByText('Tag 1'));

        expect(mockOnChange).toHaveBeenCalledWith('1');
    });

    it('calls onChange with empty string when all tags are removed', async () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                value="1"
                onChange={mockOnChange}
            />
        );

        // Remove the selected tag
        const removeButton = screen.getByRole('button', { name: /remove/i });
        await userEvent.click(removeButton);

        expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('is disabled when disabled prop is true', () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                onChange={mockOnChange}
                disabled={true}
            />
        );

        const input = screen.getByLabelText('Tags');
        expect(input).toBeDisabled();
    });

    it('handles empty options array', () => {
        render(
            <GenericTagAutoComplete
                options={[]}
                onChange={mockOnChange}
            />
        );

        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('handles null value prop', () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                value={null}
                onChange={mockOnChange}
            />
        );

        expect(screen.getByLabelText('Tags')).toBeInTheDocument();
    });

    it('supports test id prop', () => {
        render(
            <GenericTagAutoComplete
                options={mockOptions}
                onChange={mockOnChange}
                data-testid="tag-autocomplete"
            />
        );

        expect(screen.getByTestId('tag-autocomplete')).toBeInTheDocument();
        expect(screen.getByTestId('tag-autocomplete-autocomplete')).toBeInTheDocument();
    });
});