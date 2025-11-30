/**
 * CreateFolderDialog - Dialog for creating new tag/folder in workspace
 * Migrated from MUI to shadcn/ui
 */

import React, { useState, useEffect } from 'react';
import { Loader2, FolderPlus } from 'lucide-react';
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
import { Textarea } from '@/Components/ui/textarea';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { cn } from '@/lib/utils';
import { useCreateTag } from '../../hooks/Tags/useTags';
import { useWorkspaceTagTree } from '../../hooks/Tags/useTags';
import type { CreateTagDTO } from '../../types/folder.types';
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
        <Dialog open={open} onOpenChange={(newOpen) => !newOpen && onClose()}>
            <DialogContent className="sm:max-w-[500px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        Create New Folder
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 pt-2">
                    {/* Folder Name */}
                    <div className="space-y-2">
                        <Label htmlFor="folder-name">Folder Name *</Label>
                        <Input
                            id="folder-name"
                            value={folderName}
                            onChange={(e) => setFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            autoFocus
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            rows={3}
                        />
                    </div>

                    {/* Parent Folder Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="parent-folder">Parent Folder</Label>
                        <Select 
                            value={selectedParentId?.toString() || ''} 
                            onValueChange={(value) => setSelectedParentId(value ? Number(value) : null)}
                        >
                            <SelectTrigger id="parent-folder">
                                <SelectValue placeholder="Root Level (No Parent)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">
                                    <em>Root Level (No Parent)</em>
                                </SelectItem>
                                {availableParents.map((tag) => (
                                    <SelectItem key={tag.tagId} value={tag.tagId.toString()}>
                                        {'—'.repeat(tag.depth || 0)} {tag.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Color Selection */}
                    <div className="space-y-2">
                        <Label>Color</Label>
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
                                        className="w-5 h-5 rounded border border-border/20"
                                        style={{ backgroundColor: option.value }}
                                    />
                                    <span className="text-xs">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Error Alert */}
                    {createTag.isError && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                Failed to create folder. Please try again.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button 
                        variant="outline"
                        onClick={handleCancel}
                        disabled={createTag.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={createTag.isPending || !folderName.trim()}
                    >
                        {createTag.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {createTag.isPending ? 'Creating...' : 'Create Folder'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
