import React from 'react';
import { 
    Autocomplete, 
    TextField, 
    Stack,
    AutocompleteRenderOptionState
} from '@mui/material';
import { HTMLAttributes } from 'react';
import { IAutoCompleteOptions } from './GenericAutoComplete';
import { AutoCompleteOption } from './AutoCompleteOption';

export interface GenericTagAutoCompleteProps {
    /** Array of available tag options */
    options: IAutoCompleteOptions[];
    /** Currently selected tags as comma-separated string */
    value?: string | null;
    /** Callback when tags change - receives comma-separated string of IDs */
    onChange: (tagsString: string) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Label for the input field */
    label?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Additional styling */
    sx?: any;
    /** Size of the component */
    size?: 'small' | 'medium';
    /** Test ID for testing purposes */
    'data-testid'?: string;
}

/**
 * Reusable multi-select autocomplete component for tags
 * 
 * @example
 * ```tsx
 * <GenericTagAutoComplete
 *   options={tagsOptions}
 *   value={currentTags}
 *   onChange={(newTags) => setTags(newTags)}
 *   label="Tags"
 *   placeholder="+ Add Tag"
 *   disabled={!isEdit}
 * />
 * ```
 */
export function GenericTagAutoComplete({
    options,
    value,
    onChange,
    disabled = false,
    label = 'Tags',
    placeholder = '+ Add Tag',
    sx = { marginTop: '15px' },
    size = 'small',
    'data-testid': testId,
}: GenericTagAutoCompleteProps) {
    
    // Convert comma-separated string to array of selected options
    const selectedIds = value ? value.split(',').filter(Boolean) : [];
    const selectedOptions = selectedIds.length > 0 
        ? options.filter(option => selectedIds.includes(String(option.id)))
        : [];

    // Filter out already selected options from available options
    const availableOptions = selectedIds.length > 0 
        ? options.filter(option => !selectedIds.includes(String(option.id)))
        : options;

    // Render custom option with disabled state support
    const renderOption = (
        props: HTMLAttributes<HTMLLIElement>, 
        option: IAutoCompleteOptions, 
        state: AutocompleteRenderOptionState
    ) => {
        if (option.isActive === false) {
            props['aria-disabled'] = true;
        }
        // Extract key from props to avoid React warning
        const { key, ...restProps } = props as any;
        return <AutoCompleteOption key={key} {...restProps}>{option.label || option.desc}</AutoCompleteOption>;
    };

    // Handle selection change
    const handleChange = (
        event: React.SyntheticEvent,
        newValue: IAutoCompleteOptions[] | null
    ) => {
        if (newValue === null) {
            onChange('');
        } else {
            const idsString = newValue.map((option) => option.id).join(',');
            onChange(idsString);
        }
    };

    return (
        <Stack>
            <Autocomplete
                multiple
                disabled={disabled}
                size={size}
                sx={{
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '4px !important',
                    },
                    '& .MuiSvgIcon-root': {
                        color: '#9e9e9e', // Default gray color for dropdown arrow
                    },
                    '& .MuiChip-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.08)', // Gray background for tag chips
                        color: '#000000DE', // White text for contrast
                        '& .MuiChip-deleteIcon': {
                            color: 'rgba(0, 0, 0, 0.15)', // White delete icon
                            '&:hover': {
                                color: '#fff', // Slightly lighter on hover
                            }
                        }
                    },
                    ...sx
                }}
                options={availableOptions}
                value={selectedOptions}
                onChange={handleChange}
                renderOption={renderOption}
                getOptionLabel={(option) => option.label || option.desc || ''}
                renderInput={(params) => (
                    <TextField 
                        {...params} 
                        label={label} 
                        placeholder={placeholder}
                        data-testid={testId}
                    />
                )}
                data-testid={testId ? `${testId}-autocomplete` : undefined}
            />
        </Stack>
    );
}

export default GenericTagAutoComplete;