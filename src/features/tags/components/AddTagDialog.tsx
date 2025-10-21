/**
 * AddTagDialog - Dialog for adding tags to workspace
 * Can add existing tags OR create new tags
 * Replaces CreateFolderDialog with full API integration
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
    Tabs,
    Tab,
    Autocomplete,
    Chip,
    Typography,
} from '@mui/material';
import { Add as AddIcon, CreateNewFolder as CreateIcon } from '@mui/icons-material';
import { useTags, useWorkspaceTagTree } from '../hooks/useTags';
import { useAddExistingTagToWorkspace, useCreateAndAddTagToWorkspace } from '../hooks/useWorkspace';
import type { Tag } from '../types/tag.types';
import { useSnackbar } from 'notistack';

/**
 * Helper function to extract all tag IDs from workspace tree (including nested children)
 */
function extractTagIdsFromTree(tags: Tag[]): number[] {
    const tagIds: number[] = [];
    
    function traverse(nodes: Tag[]) {
        for (const node of nodes) {
            tagIds.push(node.tagId);
            if (node.children && node.children.length > 0) {
                traverse(node.children);
            }
        }
    }
    
    traverse(tags);
    return tagIds;
}

interface AddTagDialogProps {
    open: boolean;
    onClose: () => void;
    workspaceId: number;
    parentTagId?: number | null; // Optional parent tag for nested creation
}

type TabValue = 'existing' | 'new';

export function AddTagDialog({ 
    open, 
    onClose, 
    workspaceId,
    parentTagId 
}: AddTagDialogProps) {
    // Tab state
    const [activeTab, setActiveTab] = useState<TabValue>('existing');
    
    // Existing tag fields
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    
    // New tag fields
    const [newTagName, setNewTagName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#1976D2'); // Default blue
    
    // Common fields
    const [label, setLabel] = useState('');
    const [errors, setErrors] = useState<{ tag?: string; name?: string }>({});

    // Hooks
    const { data: allTags, isLoading: tagsLoading } = useTags();
    const { data: workspaceTree, isLoading: workspaceLoading } = useWorkspaceTagTree(workspaceId);
    const addExistingTag = useAddExistingTagToWorkspace();
    const createAndAddTag = useCreateAndAddTagToWorkspace();
    const { enqueueSnackbar } = useSnackbar();

    // Find parent tag info for display (VS Code-like)
    const parentTag = React.useMemo(() => {
        if (!parentTagId || !workspaceTree?.tags) return null;
        
        // Search for parent tag in the tree
        function findTag(tags: Tag[], targetId: number): Tag | null {
            for (const tag of tags) {
                if (tag.tagId === targetId) return tag;
                if (tag.children && tag.children.length > 0) {
                    const found = findTag(tag.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        }
        
        return findTag(workspaceTree.tags, parentTagId);
    }, [parentTagId, workspaceTree]);

    // Reset form when dialog opens/closes
    useEffect(() => {
        if (open) {
            setActiveTab('existing');
            setSelectedTag(null);
            setNewTagName('');
            setDescription('');
            setColor('#1976D2');
            setLabel('');
            setErrors({});
        }
    }, [open]);

    // Filter out tags already in workspace
    const workspaceTagIds = workspaceTree?.tags ? extractTagIdsFromTree(workspaceTree.tags) : [];
    const availableTags = (allTags || []).filter(tag => !workspaceTagIds.includes(tag.tagId));

    const validateExistingTag = (): boolean => {
        const newErrors: { tag?: string } = {};

        if (!selectedTag) {
            newErrors.tag = 'Please select a tag';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateNewTag = (): boolean => {
        const newErrors: { name?: string } = {};

        if (!newTagName.trim()) {
            newErrors.name = 'Tag name is required';
        } else if (newTagName.length > 200) {
            newErrors.name = 'Tag name must be less than 200 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitExisting = async () => {
        if (!validateExistingTag() || !selectedTag) {
            return;
        }

        console.log('🔍 Selected tag object:', selectedTag);
        console.log('🔍 Selected tag.tagId:', selectedTag.tagId);
        console.log('🔍 Selected tag.id:', selectedTag.id);

        try {
            await addExistingTag.mutateAsync({
                workspaceId,
                tagId: selectedTag.tagId,
                parentTagId: parentTagId || null,
                options: {
                    label: label.trim() || undefined,
                },
            });
            
            enqueueSnackbar(`Tag "${selectedTag.name}" added to workspace!`, { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('Failed to add existing tag:', error);
            enqueueSnackbar(error?.message || 'Failed to add tag to workspace', { variant: 'error' });
        }
    };

    const handleSubmitNew = async () => {
        if (!validateNewTag()) {
            return;
        }

        try {
            await createAndAddTag.mutateAsync({
                workspaceId,
                tagName: newTagName.trim(),
                parentTagId: parentTagId || null,
                options: {
                    color,
                    label: label.trim() || undefined,
                    description: description.trim() || undefined,
                },
            });
            
            enqueueSnackbar(`New tag "${newTagName}" created and added!`, { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('Failed to create and add tag:', error);
            enqueueSnackbar(error?.message || 'Failed to create tag', { variant: 'error' });
        }
    };

    const handleSubmit = () => {
        if (activeTab === 'existing') {
            handleSubmitExisting();
        } else {
            handleSubmitNew();
        }
    };

    const handleCancel = () => {
        onClose();
    };

    const isSubmitting = addExistingTag.isPending || createAndAddTag.isPending;

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
                {parentTag 
                    ? `Add Tag to "${parentTag.name}"`
                    : 'Add Tag to Workspace'
                }
            </DialogTitle>

            <DialogContent>
                {/* Tabs for Add Existing vs Create New */}
                <Tabs 
                    value={activeTab} 
                    onChange={(_, value) => setActiveTab(value)}
                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
                >
                    <Tab 
                        icon={<AddIcon />} 
                        iconPosition="start" 
                        label="Add Existing" 
                        value="existing" 
                    />
                    <Tab 
                        icon={<CreateIcon />} 
                        iconPosition="start" 
                        label="Create New" 
                        value="new" 
                    />
                </Tabs>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Add Existing Tag Tab */}
                    {activeTab === 'existing' && (
                        <>
                            <Autocomplete
                                options={availableTags}
                                getOptionLabel={(option) => option.name}
                                getOptionKey={(option) => option.tagId}
                                isOptionEqualToValue={(option, value) => option.tagId === value.tagId}
                                value={selectedTag}
                                onChange={(_, newValue) => {
                                    console.log('🎯 Autocomplete onChange - newValue:', newValue);
                                    if (newValue) {
                                        console.log('🎯 newValue.tagId:', newValue.tagId);
                                        console.log('🎯 newValue.id:', newValue.id);
                                        console.log('🎯 typeof newValue.tagId:', typeof newValue.tagId);
                                    }
                                    setSelectedTag(newValue);
                                }}
                                loading={tagsLoading || workspaceLoading}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Select Tag"
                                        error={!!errors.tag}
                                        helperText={errors.tag || (availableTags.length === 0 && !tagsLoading && !workspaceLoading ? 'All tags are already in this workspace' : undefined)}
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <>
                                                    {(tagsLoading || workspaceLoading) ? <CircularProgress size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </>
                                            ),
                                        }}
                                    />
                                )}
                                renderOption={(props, option) => (
                                    <li {...props}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip 
                                                size="small" 
                                                label={option.name}
                                                sx={{ 
                                                    backgroundColor: option.color,
                                                    color: 'white',
                                                }}
                                            />
                                            {option.description && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.description}
                                                </Typography>
                                            )}
                                        </Box>
                                    </li>
                                )}
                                fullWidth
                            />

                            {!tagsLoading && !workspaceLoading && availableTags.length === 0 && (
                                <Alert severity="info">
                                    All available tags are already in this workspace. You can create a new tag instead.
                                </Alert>
                            )}
                        </>
                    )}

                    {/* Create New Tag Tab */}
                    {activeTab === 'new' && (
                        <>
                            <TextField
                                label="Tag Name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                error={!!errors.name}
                                helperText={errors.name || 'Enter a name for the new tag'}
                                fullWidth
                                required
                            />

                            <TextField
                                label="Description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                multiline
                                rows={3}
                                helperText="Optional description for the tag"
                                fullWidth
                            />

                            <FormControl fullWidth>
                                <InputLabel>Color</InputLabel>
                                <Select
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    label="Color"
                                >
                                    {colorOptions.map((option) => (
                                        <MenuItem key={option.value} value={option.value}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box
                                                    sx={{
                                                        width: 20,
                                                        height: 20,
                                                        backgroundColor: option.value,
                                                        borderRadius: '4px',
                                                        border: '1px solid #ccc',
                                                    }}
                                                />
                                                {option.label}
                                            </Box>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </>
                    )}

                    {/* Common Fields */}
                    <TextField
                        label="Custom Label (Optional)"
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        helperText="Optional custom label for this relationship"
                        fullWidth
                    />

                    {/* Parent Tag Info (VS Code-like) */}
                    {parentTag ? (
                        <Alert 
                            severity="info"
                            icon={<CreateIcon />}
                            sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">
                                    Will be added under:
                                </Typography>
                                <Chip 
                                    size="small"
                                    label={parentTag.name}
                                    sx={{ 
                                        backgroundColor: parentTag.color || '#1976D2',
                                        color: 'white',
                                        fontWeight: 500,
                                    }}
                                />
                            </Box>
                        </Alert>
                    ) : (
                        <Alert severity="info" icon={<CreateIcon />}>
                            <Typography variant="body2">
                                Will be added at the root level (no parent)
                            </Typography>
                        </Alert>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button 
                    onClick={handleCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                >
                    {isSubmitting 
                        ? 'Adding...' 
                        : activeTab === 'existing' 
                            ? 'Add Tag' 
                            : 'Create & Add'
                    }
                </Button>
            </DialogActions>
        </Dialog>
    );
}
