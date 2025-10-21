/**
 * CreateFolderDialog - Dialog for creating new tag/folder in workspace
 * Follows the design system and patterns from the project
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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
} from '@mui/material';
import { useCreateTag } from '../hooks/useTags';
import { useWorkspaceTagTree } from '../hooks/useTags';
import type { CreateTagDTO } from '../types/tag.types';
import { useSnackbar } from 'notistack';

interface CreateFolderDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    parentTagId?: number; // Optional parent tag for nested creation
}

export function CreateFolderDialog({ 
    open, 
    onClose, 
    workspaceId,
    parentTagId 
}: CreateFolderDialogProps) {
    const [folderName, setFolderName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#1976D2'); // Default blue
    const [selectedParentId, setSelectedParentId] = useState<number | null>(parentTagId || null);
    const [errors, setErrors] = useState<{ name?: string }>({});

    const createTag = useCreateTag();
    const { data: workspaceTree } = useWorkspaceTagTree(workspaceId);
    const { enqueueSnackbar } = useSnackbar();

    // Reset form when dialog opens/closes or parentTagId changes
    useEffect(() => {
        if (open) {
            setFolderName('');
            setDescription('');
            setColor('#1976D2');
            setSelectedParentId(parentTagId || null);
            setErrors({});
        }
    }, [open, parentTagId]);

    // Flatten workspace tree to get all available parent options
    const flattenTags = (tags: any[]): any[] => {
        const result: any[] = [];
        tags.forEach(tag => {
            result.push(tag);
            if (tag.children && tag.children.length > 0) {
                result.push(...flattenTags(tag.children));
            }
        });
        return result;
    };

    const availableParents = workspaceTree?.tags 
        ? flattenTags(workspaceTree.tags)
        : [];

    const validateForm = (): boolean => {
        const newErrors: { name?: string } = {};

        if (!folderName.trim()) {
            newErrors.name = 'Folder name is required';
        } else if (folderName.length > 200) {
            newErrors.name = 'Folder name must be less than 200 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            const createData: CreateTagDTO = {
                name: folderName.trim(),
                description: description.trim() || undefined,
                color,
                userId: 14, // TODO: Get from auth context
                parentId: selectedParentId || undefined,
            };

            await createTag.mutateAsync(createData);
            
            enqueueSnackbar(`Folder "${folderName}" created successfully!`, { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('Failed to create folder:', error);
            enqueueSnackbar(error?.message || 'Failed to create folder', { variant: 'error' });
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const colorOptions = [
        { value: '#1976D2', label: 'Blue' },
        { value: '#388E3C', label: 'Green' },
        { value: '#F57C00', label: 'Orange' },
        { value: '#D32F2F', label: 'Red' },
        { value: '#7B1FA2', label: 'Purple' },
        { value: '#0288D1', label: 'Light Blue' },
        { value: '#00796B', label: 'Teal' },
        { value: '#616161', label: 'Gray' },
    ];

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '12px',
                }
            }}
        >
            <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
                Create New Folder
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px' }}>
                    {/* Folder Name */}
                    <TextField
                        label="Folder Name"
                        value={folderName}
                        onChange={(e) => setFolderName(e.target.value)}
                        error={!!errors.name}
                        helperText={errors.name}
                        fullWidth
                        autoFocus
                        required
                        placeholder="Enter folder name"
                    />

                    {/* Description */}
                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        fullWidth
                        multiline
                        rows={3}
                        placeholder="Optional description"
                    />

                    {/* Parent Folder Selection */}
                    <FormControl fullWidth>
                        <InputLabel>Parent Folder</InputLabel>
                        <Select
                            value={selectedParentId || ''}
                            onChange={(e) => setSelectedParentId(e.target.value ? Number(e.target.value) : null)}
                            label="Parent Folder"
                        >
                            <MenuItem value="">
                                <em>Root Level (No Parent)</em>
                            </MenuItem>
                            {availableParents.map((tag) => (
                                <MenuItem key={tag.tagId} value={tag.tagId}>
                                    {'—'.repeat(tag.depth || 0)} {tag.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Color Selection */}
                    <FormControl fullWidth>
                        <InputLabel>Color</InputLabel>
                        <Select
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            label="Color"
                        >
                            {colorOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Box
                                            sx={{
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: option.value,
                                                borderRadius: '4px',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                            }}
                                        />
                                        {option.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Error Alert */}
                    {createTag.isError && (
                        <Alert severity="error">
                            Failed to create folder. Please try again.
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button 
                    onClick={handleCancel}
                    disabled={createTag.isPending}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={createTag.isPending || !folderName.trim()}
                    startIcon={createTag.isPending && <CircularProgress size={20} />}
                >
                    {createTag.isPending ? 'Creating...' : 'Create Folder'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
