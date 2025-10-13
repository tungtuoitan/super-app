/**
 * Mini Tag Creation Dialog
 * A compact dialog for quickly creating new tags from the context menu
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
} from '@mui/material';
import { useTagUI } from '../store/TagUIContext';
import { useCreateTag } from '../hooks/useTags';
import { useSnackbar } from 'notistack';
import { GenericAutoComplete, type IAutoCompleteOptions } from '@/shared/components/ui/GenericAutoComplete';
import type { CreateTagDTO } from '../types/tag.types';

// Dummy data for icon options
const ICON_OPTIONS: IAutoCompleteOptions[] = [
    { id: 'folder', label: 'Folder', code: 'folder' },
    { id: 'label', label: 'Label', code: 'label' },
    { id: 'star', label: 'Star', code: 'star' },
    { id: 'bookmark', label: 'Bookmark', code: 'bookmark' },
    { id: 'category', label: 'Category', code: 'category' },
    { id: 'tag', label: 'Tag', code: 'tag' },
    { id: 'collection', label: 'Collection', code: 'collection' },
    { id: 'group', label: 'Group', code: 'group' },
    { id: 'project', label: 'Project', code: 'project' },
    { id: 'work', label: 'Work', code: 'work' },
    { id: 'personal', label: 'Personal', code: 'personal' },
    { id: 'important', label: 'Important', code: 'important' },
];

// Dummy data for color options
const COLOR_OPTIONS: IAutoCompleteOptions[] = [
    { id: '#1976d2', label: 'Blue', code: 'blue' },
    { id: '#2e7d32', label: 'Green', code: 'green' },
    { id: '#d32f2f', label: 'Red', code: 'red' },
    { id: '#f57c00', label: 'Orange', code: 'orange' },
    { id: '#7b1fa2', label: 'Purple', code: 'purple' },
    { id: '#388e3c', label: 'Light Green', code: 'light-green' },
    { id: '#1565c0', label: 'Light Blue', code: 'light-blue' },
    { id: '#c62828', label: 'Dark Red', code: 'dark-red' },
    { id: '#ef6c00', label: 'Deep Orange', code: 'deep-orange' },
    { id: '#5e35b1', label: 'Deep Purple', code: 'deep-purple' },
    { id: '#00695c', label: 'Teal', code: 'teal' },
    { id: '#424242', label: 'Gray', code: 'gray' },
];

interface TagCreateDialogProps {
    open: boolean;
    onClose: () => void;
}

export function TagCreateDialog({ open, onClose }: TagCreateDialogProps) {
    const [tagName, setTagName] = useState('');
    const [tagDescription, setTagDescription] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<IAutoCompleteOptions | null>(ICON_OPTIONS[0]); // Default to folder
    const [selectedColor, setSelectedColor] = useState<IAutoCompleteOptions | null>(COLOR_OPTIONS[0]); // Default to blue
    const { enqueueSnackbar } = useSnackbar();
    const { parentTagForCreate } = useTagUI();
    const createTag = useCreateTag();

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setTagName('');
            setTagDescription('');
            setSelectedIcon(ICON_OPTIONS[0]);
            setSelectedColor(COLOR_OPTIONS[0]);
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!tagName.trim()) {
            enqueueSnackbar('Tag name is required', { variant: 'error' });
            return;
        }

        try {
            const createData: CreateTagDTO = {
                name: tagName.trim(),
                description: tagDescription.trim() || undefined,
                color: selectedColor?.id as string || '#1976d2',
                icon: selectedIcon?.code || undefined,
                parentId: parentTagForCreate?.tagId,
            };

            await createTag.mutateAsync(createData);
            
            enqueueSnackbar('Tag created successfully!', { variant: 'success' });
            onClose();
        } catch (error) {
            console.error('Failed to create tag:', error);
            enqueueSnackbar('Failed to create tag', { variant: 'error' });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e as any);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { minHeight: '450px' }
            }}
        >
            <DialogTitle>Create New Tag</DialogTitle>
            
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Parent Tag Display */}
                    {parentTagForCreate && (
                        <TextField
                            label="Parent Tag"
                            value={parentTagForCreate.name}
                            disabled
                            fullWidth
                            size="small"
                            helperText="This tag will be created as a child of the selected parent"
                        />
                    )}
                    
                    <TextField
                        autoFocus
                        label="Tag Name"
                        value={tagName}
                        onChange={(e) => setTagName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        fullWidth
                        required
                        disabled={createTag.isPending}
                        placeholder="Enter tag name..."
                    />
                    
                    <TextField
                        label="Description (Optional)"
                        value={tagDescription}
                        onChange={(e) => setTagDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        fullWidth
                        multiline
                        rows={2}
                        disabled={createTag.isPending}
                        placeholder="Enter tag description..."
                    />
                    
                    {/* Icon Selection */}
                    <GenericAutoComplete
                        value={selectedIcon}
                        allOptions={ICON_OPTIONS}
                        onChange={(event, newValue) => setSelectedIcon(newValue)}
                        inputProps={{
                            name: 'icon',
                            label: 'Icon',
                            required: false,
                        }}
                        sx={{ width: '100%' }}
                    />
                    
                    {/* Color Selection */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {selectedColor && (
                            <Box
                                sx={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    backgroundColor: selectedColor.id,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    flexShrink: 0,
                                }}
                            />
                        )}
                        <GenericAutoComplete
                            value={selectedColor}
                            allOptions={COLOR_OPTIONS}
                            onChange={(event, newValue) => setSelectedColor(newValue)}
                            inputProps={{
                                name: 'color',
                                label: 'Color',
                                required: false,
                            }}
                            sx={{ flex: 1 }}
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button
                        onClick={onClose}
                        disabled={createTag.isPending}
                        color="inherit"
                    >
                        Cancel
                    </Button>
                    
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={createTag.isPending || !tagName.trim()}
                        startIcon={createTag.isPending ? <CircularProgress size={16} /> : null}
                    >
                        {createTag.isPending ? 'Creating...' : 'Create Tag'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}