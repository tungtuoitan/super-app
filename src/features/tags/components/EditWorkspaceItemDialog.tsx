/**
 * EditWorkspaceItemDialog - Dialog for editing workspace item metadata
 * Allows updating label, notes, color, icon, and sort order
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Box,
    CircularProgress,
    Alert,
    Typography,
    InputAdornment,
} from '@mui/material';
import { 
    Edit as EditIcon,
    ColorLens as ColorIcon,
    Notes as NotesIcon,
    Label as LabelIcon,
    DriveFileRenameOutline as NameIcon,
} from '@mui/icons-material';
import { useUpdateWorkspaceItem } from '../hooks/useWorkspace';
import { useSnackbar } from 'notistack';
import { GenericAutoComplete, IAutoCompleteOptions } from '@/shared/components/ui/GenericAutoComplete';
import type { UpdateWorkspaceItemRequest } from '../types/workspace.types';

// Predefined color options
const COLOR_OPTIONS: IAutoCompleteOptions[] = [
    { id: 1, code: '#F44336', label: 'Red', desc: 'Red' },
    { id: 2, code: '#E91E63', label: 'Pink', desc: 'Pink' },
    { id: 3, code: '#9C27B0', label: 'Purple', desc: 'Purple' },
    { id: 4, code: '#673AB7', label: 'Deep Purple', desc: 'Deep Purple' },
    { id: 5, code: '#3F51B5', label: 'Indigo', desc: 'Indigo' },
    { id: 6, code: '#2196F3', label: 'Blue', desc: 'Blue' },
    { id: 7, code: '#03A9F4', label: 'Light Blue', desc: 'Light Blue' },
    { id: 8, code: '#00BCD4', label: 'Cyan', desc: 'Cyan' },
    { id: 9, code: '#009688', label: 'Teal', desc: 'Teal' },
    { id: 10, code: '#4CAF50', label: 'Green', desc: 'Green' },
    { id: 11, code: '#8BC34A', label: 'Light Green', desc: 'Light Green' },
    { id: 12, code: '#CDDC39', label: 'Lime', desc: 'Lime' },
    { id: 13, code: '#FFEB3B', label: 'Yellow', desc: 'Yellow' },
    { id: 14, code: '#FFC107', label: 'Amber', desc: 'Amber' },
    { id: 15, code: '#FF9800', label: 'Orange', desc: 'Orange' },
    { id: 16, code: '#FF5722', label: 'Deep Orange', desc: 'Deep Orange' },
    { id: 17, code: '#795548', label: 'Brown', desc: 'Brown' },
    { id: 18, code: '#9E9E9E', label: 'Grey', desc: 'Grey' },
    { id: 19, code: '#607D8B', label: 'Blue Grey', desc: 'Blue Grey' },
    { id: 20, code: '#000000', label: 'Black', desc: 'Black' },
];

interface EditWorkspaceItemDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    itemId: number;
    currentName?: string;
    currentLabel?: string;
    currentNotes?: string;
    currentColor?: string;
    currentIcon?: string;
    currentSortOrder?: number;
    itemName?: string; // For display purposes (e.g., "Edit: Projects")
}

export function EditWorkspaceItemDialog({
    open,
    onClose,
    workspaceId,
    itemId,
    currentName = '',
    currentLabel = '',
    currentNotes = '',
    currentColor = '',
    currentIcon = '',
    currentSortOrder = 0,
    itemName = 'Item',
}: EditWorkspaceItemDialogProps) {
    // Form state
    const [name, setName] = useState(currentName);
    const [label, setLabel] = useState(currentLabel);
    const [notes, setNotes] = useState(currentNotes);
    const [color, setColor] = useState(currentColor);
    const [selectedColorOption, setSelectedColorOption] = useState<IAutoCompleteOptions | null>(null);
    const [icon, setIcon] = useState(currentIcon);
    const [sortOrder, setSortOrder] = useState(currentSortOrder);
    const [errors, setErrors] = useState<{ 
        name?: string;
        label?: string; 
        notes?: string; 
        color?: string;
        icon?: string;
        sortOrder?: string;
    }>({});

    // Hooks
    const updateItem = useUpdateWorkspaceItem();
    const { enqueueSnackbar } = useSnackbar();

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setName(currentName);
            setLabel(currentLabel);
            setNotes(currentNotes);
            setColor(currentColor);
            setIcon(currentIcon);
            setSortOrder(currentSortOrder);
            setErrors({});
            
            // Find and set selected color option
            const colorOpt = COLOR_OPTIONS.find(opt => opt.code === currentColor);
            setSelectedColorOption(colorOpt || null);
        }
    }, [open, currentName, currentLabel, currentNotes, currentColor, currentIcon, currentSortOrder]);

    const validate = (): boolean => {
        const newErrors: typeof errors = {};

        if (name && name.length > 200) {
            newErrors.name = 'Name cannot exceed 200 characters';
        }

        if (label && label.length > 200) {
            newErrors.label = 'Label cannot exceed 200 characters';
        }

        if (notes && notes.length > 2000) {
            newErrors.notes = 'Notes cannot exceed 2000 characters';
        }

        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            newErrors.color = 'Color must be in hex format (#RRGGBB)';
        }

        if (icon && icon.length > 50) {
            newErrors.icon = 'Icon cannot exceed 50 characters';
        }

        if (sortOrder < 0) {
            newErrors.sortOrder = 'Sort order must be non-negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) {
            return;
        }

        try {
            // Build request with only changed fields
            const request: UpdateWorkspaceItemRequest = {};
            
            // ⚠️ NOTE: Backend UpdateWorkspaceItemRequest currently only supports 'label' field, not 'name'.
            // We're using 'label' to update the item name for now.
            // Priority: if name changed, use it; otherwise check if label changed.
            if (name !== currentName) {
                request.label = name || undefined;
            } else if (label !== currentLabel) {
                request.label = label || undefined;
            }
            
            if (notes !== currentNotes) {
                request.notes = notes || undefined;
            }
            
            if (color !== currentColor) {
                request.color = color || undefined;
            }
            
            if (icon !== currentIcon) {
                request.icon = icon || undefined;
            }
            
            if (sortOrder !== currentSortOrder) {
                request.sortOrder = sortOrder;
            }

            // Check if any field changed
            if (Object.keys(request).length === 0) {
                enqueueSnackbar('No changes to save', { variant: 'info' });
                onClose();
                return;
            }

            console.log('📝 Updating workspace item:', { workspaceId, itemId, request });

            await updateItem.mutateAsync({
                workspaceId,
                itemId,
                request,
            });

            enqueueSnackbar('Item updated successfully', { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('❌ Failed to update item:', error);
            
            const errorMessage = error?.response?.data?.message 
                || error?.message 
                || 'Failed to update item';
                
            enqueueSnackbar(errorMessage, { variant: 'error' });
        }
    };

    const handleClose = () => {
        if (!updateItem.isPending) {
            onClose();
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon />
                    <span>Edit: {itemName}</span>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {/* Name */}
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name || 'The name of this item'}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <NameIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Label */}
                    <TextField
                        label="Custom Label"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        error={!!errors.label}
                        helperText={errors.label || 'Optional custom label for this item'}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <LabelIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Notes */}
                    <TextField
                        label="Notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        error={!!errors.notes}
                        helperText={errors.notes || 'Additional notes about this item'}
                        multiline
                        rows={3}
                        fullWidth
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <NotesIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Color - Using GenericAutoComplete */}
                    <GenericAutoComplete
                        value={selectedColorOption}
                        allOptions={COLOR_OPTIONS}
                        inputProps={{
                            name: 'color',
                            label: 'Color',
                            error: !!errors.color,
                        }}
                        onChange={(event, newValue) => {
                            setSelectedColorOption(newValue);
                            setColor(newValue?.code || '');
                        }}
                        renderOptionProps={{
                            sx: {
                                '& .MuiAutocomplete-option': {
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                },
                            },
                        }}
                        sx={{ width: '100%' }}
                    />
                    {errors.color && (
                        <Typography variant="caption" color="error" sx={{ mt: -1, ml: 2 }}>
                            {errors.color}
                        </Typography>
                    )}

                    {/* Color Preview */}
                    {color && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 1,
                                    backgroundColor: color,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                {color}
                            </Typography>
                        </Box>
                    )}

                    {/* Icon */}
                    <TextField
                        label="Icon"
                        value={icon}
                        onChange={(e) => setIcon(e.target.value)}
                        error={!!errors.icon}
                        helperText={errors.icon || 'Icon identifier (optional)'}
                        fullWidth
                    />

                    {/* Sort Order */}
                    <TextField
                        label="Sort Order"
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value))}
                        error={!!errors.sortOrder}
                        helperText={errors.sortOrder || 'Display order (lower numbers appear first)'}
                        fullWidth
                        inputProps={{ min: 0 }}
                    />

                    {/* Error Alert */}
                    {updateItem.isError && (
                        <Alert severity="error">
                            Failed to update item. Please try again.
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button 
                    onClick={handleClose}
                    disabled={updateItem.isPending}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    disabled={updateItem.isPending}
                    startIcon={updateItem.isPending ? <CircularProgress size={20} /> : <EditIcon />}
                >
                    {updateItem.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
