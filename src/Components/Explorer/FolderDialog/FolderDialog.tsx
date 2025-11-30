/**
 * FolderDialog - Dialog for creating new folders in workspace
 * Migrated from MUI to shadcn/ui
 * 
 * @pattern Uses FolderDialogStore for form state & useFolderDialogHelper for business logic
 */

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { cn } from '@/lib/utils';
import type { WorkspaceTreeItemResponse } from '@/types/workspace.types';
import { useKeyboardShortcut } from '@/shared/hooks';
import { useExplorerStore } from '@/store/index';
import { useDialogAction } from '@/hooks/explorer/useDialogAction.helper';
import { useFolderDialogStore } from '@/store/explorer/FolderDialogStore';
import { useFolderDialogHelper } from '@/hooks/explorer/useFolderDialogHelper';

export function FolderDialog() {
    // Get state from ExplorerStore
    const {
        isCreateDialogOpen,
        parentFolderForCreate,
    } = useExplorerStore();

    // Get actions from dialog helper
    const { closeCreateDialog } = useDialogAction();

    // Get form state from FolderDialogStore
    const {
        newFolderName,
        setNewFolderName,
        description,
        setDescription,
        color,
        setColor,
        errors,
        isSubmitting,
        workspaceTree,
    } = useFolderDialogStore();

    // Get business logic from helper
    const { submitNewFolder, initializeDialog } = useFolderDialogHelper();

    // Derived values
    const parentFolderId = parentFolderForCreate?.folderId;

    // Find parent folder info for display (VS Code-like)
    const parentFolder = React.useMemo(() => {
        if (!parentFolderId || !workspaceTree || workspaceTree.length === 0) return null;
        
        // Search for parent folder in the tree
        function findFolder(items: WorkspaceTreeItemResponse[], targetId: number): WorkspaceTreeItemResponse | null {
            for (const item of items) {
                if (item.itemType === 'tag' && item.childId === targetId) return item;
                if (item.children && item.children.length > 0) {
                    const found = findFolder(item.children, targetId);
                    if (found) return found;
                }
            }
            return null;
        }
        
        return findFolder(workspaceTree, parentFolderId);
    }, [parentFolderId, workspaceTree]);

    // Initialize dialog when it opens
    useEffect(() => {
        if (isCreateDialogOpen) {
            initializeDialog();
        }
    }, [isCreateDialogOpen]);


    // Keyboard Shortcuts
    useKeyboardShortcut({
        key: 'Enter',
        enabled: isCreateDialogOpen && !isSubmitting && !!newFolderName.trim(),
        callback: submitNewFolder,
    });

    useKeyboardShortcut({
        key: 'Escape',
        enabled: isCreateDialogOpen && !isSubmitting,
        callback: closeCreateDialog,
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
        <Dialog open={isCreateDialogOpen} onOpenChange={(newOpen) => !newOpen && closeCreateDialog()}>
            <DialogContent className="sm:max-w-[550px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {parentFolder 
                            ? `Create Folder in "${parentFolder.name}"`
                            : 'Create New Folder'
                        }
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="new-folder-name">Folder Name *</Label>
                        <Input
                            id="new-folder-name"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name"
                        />
                        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
                </div>

                <DialogFooter className="gap-2">
                    <Button 
                        variant="outline"
                        onClick={closeCreateDialog}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button  
                        onClick={() => submitNewFolder()}
                        disabled={isSubmitting}
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? 'Creating...' : 'Create Folder'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
