/**
 * AddTagDialog - Dialog for adding folders to workspace
 * Can add existing folders OR create new folders
 * Migrated from MUI to shadcn/ui
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderPlus, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';
import { useTags, useWorkspaceTagTree } from '../../hooks/Tags/useTags';
import { useAddExistingTagToWorkspace, useCreateAndAddTagToWorkspace } from '../../hooks/Tags/useWorkspace';
import type { Tag } from '../../types/tag.types';
import { useSnackbar } from 'notistack';
import { useKeyboardShortcut } from '@/shared/hooks';
import { useTagUIStore } from '@/store/tagUI/TagUIStore';

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
    parentTagId?: number | null; // Optional parent folder for nested creation
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
    
    // Existing folder fields
    const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
    const [comboboxOpen, setComboboxOpen] = useState(false);
    
    // New folder fields
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
    const { setSelectedTagIds, setLastSelectedTagId } = useTagUIStore();

    // Find parent folder info for display (VS Code-like)
    const parentTag = React.useMemo(() => {
        if (!parentTagId || !workspaceTree?.tags) return null;
        
        // Search for parent folder in the tree
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
            newErrors.tag = 'Please select a folder';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateNewTag = (): boolean => {
        const newErrors: { name?: string } = {};

        if (!newTagName.trim()) {
            newErrors.name = 'Folder name is required';
        } else if (newTagName.length > 200) {
            newErrors.name = 'Folder name must be less than 200 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitExisting = useCallback(async () => {
        if (!validateExistingTag() || !selectedTag) {
            return;
        }

        try {
            const result = await addExistingTag.mutateAsync({
                workspaceId,
                tagId: selectedTag.tagId,
                parentTagId: parentTagId || null,
                options: {
                    label: label.trim() || undefined,
                },
            });

            // VS Code behavior: Select the newly added tag
            setSelectedTagIds([result.childId]);
            setLastSelectedTagId(result.childId);

            enqueueSnackbar(`Folder "${selectedTag.name}" added to workspace!`, { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('Failed to add existing folder:', error);
            enqueueSnackbar(error?.message || 'Failed to add folder to workspace', { variant: 'error' });
        }
    }, [selectedTag, workspaceId, parentTagId, label, addExistingTag, enqueueSnackbar, onClose, setSelectedTagIds, setLastSelectedTagId]);

    const handleSubmitNew = useCallback(async () => {
        if (!validateNewTag()) {
            return;
        }

        try {
            const result = await createAndAddTag.mutateAsync({
                workspaceId,
                tagName: newTagName.trim(),
                parentTagId: parentTagId || null,
                options: {
                    color,
                    label: label.trim() || undefined,
                    description: description.trim() || undefined,
                },
            });

            // VS Code behavior: Select the newly created folder
            setSelectedTagIds([result.childId]);
            setLastSelectedTagId(result.childId);

            enqueueSnackbar(`New folder "${newTagName}" created and added!`, { variant: 'success' });
            onClose();
        } catch (error: any) {
            console.error('Failed to create and add folder:', error);
            enqueueSnackbar(error?.message || 'Failed to create folder', { variant: 'error' });
        }
    }, [newTagName, workspaceId, parentTagId, color, label, description, createAndAddTag, enqueueSnackbar, onClose, setSelectedTagIds, setLastSelectedTagId]);

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

    // Keyboard Shortcuts
    useKeyboardShortcut({
        key: 'Enter',
        enabled: open && !isSubmitting && (
            (activeTab === 'existing' && !!selectedTag) ||
            (activeTab === 'new' && !!newTagName.trim())
        ),
        callback: handleSubmit,
    });

    useKeyboardShortcut({
        key: 'Escape',
        enabled: open && !isSubmitting,
        callback: handleCancel,
    });

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
        <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onClose()}>
            <DialogContent className="sm:max-w-[550px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {parentTag 
                            ? `Add Folder to "${parentTag.name}"`
                            : 'Add Folder to Workspace'
                        }
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="existing" className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Existing
                        </TabsTrigger>
                        <TabsTrigger value="new" className="flex items-center gap-2">
                            <FolderPlus className="h-4 w-4" />
                            Create New
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="existing" className="space-y-6">
                        {/* Combobox for folder selection */}
                        <div className="space-y-2">
                            <Label htmlFor="tag-select">Select Folder</Label>
                            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={comboboxOpen}
                                        className="w-full justify-between"
                                        disabled={tagsLoading || workspaceLoading}
                                    >
                                        {selectedTag ? (
                                            <div className="flex items-center gap-2">
                                                <Badge 
                                                    style={{ backgroundColor: selectedTag.color }}
                                                    className="text-white"
                                                >
                                                    {selectedTag.name}
                                                </Badge>
                                                {selectedTag.description && (
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {selectedTag.description}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            (tagsLoading || workspaceLoading) ? "Loading..." : "Select folder..."
                                        )}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Search folders..." />
                                        <CommandEmpty>No folder found.</CommandEmpty>
                                        <CommandList>
                                            <CommandGroup>
                                                {availableTags.map((tag) => (
                                                    <CommandItem
                                                        key={tag.tagId}
                                                        value={tag.name}
                                                        onSelect={() => {
                                                            setSelectedTag(tag);
                                                            setComboboxOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedTag?.tagId === tag.tagId ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <Badge 
                                                                style={{ backgroundColor: tag.color }}
                                                                className="text-white text-xs"
                                                            >
                                                                {tag.name}
                                                            </Badge>
                                                            {tag.description && (
                                                                <span className="text-xs text-muted-foreground truncate">
                                                                    {tag.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            {errors.tag && <p className="text-sm text-destructive">{errors.tag}</p>}
                            {availableTags.length === 0 && !tagsLoading && !workspaceLoading && (
                                <p className="text-sm text-muted-foreground">All tags are already in this workspace</p>
                            )}
                        </div>

                        {!tagsLoading && !workspaceLoading && availableTags.length === 0 && (
                            <Alert>
                                <AlertDescription>
                                    All available folders are already in this workspace. You can create a new folder instead.
                                </AlertDescription>
                            </Alert>
                        )}
                    </TabsContent>

                    <TabsContent value="new" className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="new-tag-name">Folder Name *</Label>
                            <Input
                                id="new-tag-name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                placeholder="Enter folder name"
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                            {!errors.name && <p className="text-sm text-muted-foreground">Enter a name for the new folder</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                                rows={3}
                            />
                            <p className="text-sm text-muted-foreground">Optional description for the folder</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="color">Color</Label>
                            <div className="grid grid-cols-4 gap-2">
                                {colorOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setColor(option.value)}
                                        className={cn(
                                            "flex items-center justify-center gap-2 p-3 rounded-md border-2 transition-all",
                                            color === option.value 
                                                ? "border-primary ring-2 ring-primary ring-offset-2" 
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div
                                            className="w-5 h-5 rounded border"
                                            style={{ backgroundColor: option.value }}
                                        />
                                        <span className="text-xs">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Common Fields */}
                    <div className="space-y-6 mt-6">
                        <div className="space-y-2">
                            <Label htmlFor="label">Custom Label (Optional)</Label>
                            <Input
                                id="label"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                placeholder="Optional custom label"
                            />
                            <p className="text-sm text-muted-foreground">Optional custom label for this relationship</p>
                        </div>

                        {/* Parent Folder Info */}
                        {parentTag ? (
                            <Alert>
                                <FolderPlus className="h-4 w-4" />
                                <AlertDescription>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm">Will be added under:</span>
                                        <Badge 
                                            style={{ backgroundColor: parentTag.color || '#1976D2' }}
                                            className="text-white font-medium"
                                        >
                                            {parentTag.name}
                                        </Badge>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert>
                                <FolderPlus className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                    Will be added at the root level (no parent)
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </Tabs>

                <DialogFooter className="gap-2">
                    <Button 
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        Cancel (Esc)
                    </Button>
                    <Button 
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting 
                            ? 'Adding...' 
                            : activeTab === 'existing' 
                                ? 'Add Folder' 
                                : 'Create & Add'
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
