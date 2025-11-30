/**
 * Mini Folder Creation Dialog
 * A compact dialog for quickly creating new folders from the context menu
 * Migrated to ClickUp theme with shadcn/ui components
 */

import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useTagUIStore } from '@/store/tagUI/TagUIStore';
import { useCreateTag } from '../../hooks/Tags/useTags';
import { useSnackbar } from 'notistack';
import { GenericAutoComplete, type IAutoCompleteOptions } from '@/shared/components/ui/GenericAutoComplete';
import type { CreateFolderDTO as CreateTagDTO } from '../../types/folder.types';

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
    const { parentTagForCreate } = useTagUIStore();
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
            enqueueSnackbar('Folder name is required', { variant: 'error' });
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
            
            enqueueSnackbar('Folder created successfully!', { variant: 'success' });
            onClose();
        } catch (error) {
            console.error('Failed to create folder:', error);
            enqueueSnackbar('Failed to create folder', { variant: 'error' });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e as any);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="sm:max-w-md min-h-[450px]">
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Parent Folder Display */}
                    {parentTagForCreate && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground">Parent Folder</label>
                            <Input
                                value={parentTagForCreate.name}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                This folder will be created as a child of the selected parent
                            </p>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Folder Name <span className="text-destructive">*</span>
                        </label>
                        <Input
                            autoFocus
                            value={tagName}
                            onChange={(e) => setTagName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            required
                            disabled={createTag.isPending}
                            placeholder="Enter folder name..."
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                        <Textarea
                            value={tagDescription}
                            onChange={(e) => setTagDescription(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={createTag.isPending}
                            placeholder="Enter folder description..."
                            rows={2}
                            className="resize-none"
                        />
                    </div>


                    {/* Icon Selection */}
                    <div className="space-y-1.5">
                        <GenericAutoComplete
                            value={selectedIcon}
                            allOptions={ICON_OPTIONS}
                            onChange={(event, newValue) => setSelectedIcon(newValue)}
                            inputProps={{
                                name: 'icon',
                                label: 'Icon',
                                required: false,
                            }}
                        />
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            {selectedColor && (
                                <div
                                    className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                                    style={{ backgroundColor: selectedColor.id as string }}
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
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={createTag.isPending}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="submit"
                            disabled={createTag.isPending || !tagName.trim()}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {createTag.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {createTag.isPending ? 'Creating...' : 'Create Folder'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}