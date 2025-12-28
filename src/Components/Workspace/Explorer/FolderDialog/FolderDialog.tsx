/**
 * FolderDialog - Dialog for creating new folders in workspace
 * Migrated from MUI to shadcn/ui
 *
 * @pattern Uses FolderDialogStore for form state & useFolderDialogHelper for business logic
 */

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import { GenericTextField } from "@/shared/components";
import { cn } from "@/lib/utils";
import type { WorkspaceItemV2 } from "@/types/workspace-v2.types";
import { isFolder } from "@/types/workspace-v2.types";
import { useKeyboardShortcut } from "@/shared/hooks";
import { useWorkspaceStore } from "@/store/index";
import { useFolderDialogStore } from "@/store/workspace/FolderDialog.store";
import { useFolderDialogHelper } from "@/hooks/workspace/useFolderDialog.helper";
import { constants } from "@/utils/constants";

export function FolderDialog() {
    // Get state from ExplorerStore
    const { currentWorkspace } = useWorkspaceStore();

    // Get form state from FolderDialogStore (unified approach)
    const { isFolderDialogOpen, mode, itemType, editingFolder, parentFolder, newFolderName, setNewFolderName, description, setDescription, color, setColor, errors, setErrors, isSubmitting } =
        useFolderDialogStore();

    // Get business logic and dialog actions from helper
    const { submitFolder, closeFolderDialog } = useFolderDialogHelper();

    // Derived values
    const parentFolderId = parentFolder?.id;

    // Find parent folder info for display (VS Code-like)
    const parentFolderInfo = React.useMemo(() => {
        if (!parentFolderId || !currentWorkspace?.flatData || currentWorkspace.flatData.length === 0) return null;

        // Search for parent folder in the flat list
        const found = currentWorkspace.flatData.find(item => isFolder(item) && item.entityId === parentFolderId);
        return found || null;
    }, [parentFolderId, currentWorkspace]);

    // Get sibling folders to check for duplicate names
    const siblingFolders = () => {
        if (!currentWorkspace?.flatData || currentWorkspace.flatData.length === 0) return [];

        // Find all items with the same parentId (siblings)
        // For folders at root level, parentId should match the parent folder's id
        // For creating at root, parentId would be null or the workspace root id
        return currentWorkspace.flatData.filter(
            (item: WorkspaceItemV2) =>
                // ✅ Use type guard and entityId field
                isFolder(item) &&
                // Same parent (siblings)
                item.parentId === parentFolderId &&
                // When editing, exclude the current folder being edited
                (mode === "create" || item.entityId !== editingFolder?.id)
        );
    };

    // Check if name is duplicate
    const isDuplicateName = React.useMemo(() => {
        if (!newFolderName.trim()) return false;

        return siblingFolders().some((folder: WorkspaceItemV2) => {
            if (isFolder(folder)) {
                return folder.data.name.toLowerCase() === newFolderName.trim().toLowerCase();
            }
            return false;
        });
    }, [newFolderName]);

    // Handle dialog close
    const handleClose = () => {
        closeFolderDialog();
    };

    // Keyboard Shortcuts
    useKeyboardShortcut({
        key: "Enter",
        enabled: isFolderDialogOpen && !isSubmitting && !!newFolderName.trim(),
        callback: submitFolder,
    });

    useKeyboardShortcut({
        key: "Escape",
        enabled: isFolderDialogOpen && !isSubmitting,
        callback: handleClose,
    });

    const colorOptions = [
        { value: "#1976D2", label: "Blue" },
        { value: "#388E3C", label: "Green" },
        { value: "#F57C00", label: "Orange" },
        { value: "#D32F2F", label: "Red" },
        { value: "#7B1FA2", label: "Purple" },
        { value: "#0288D1", label: "Light Blue" },
        { value: "#00796B", label: "Teal" },
        { value: "#616161", label: "Gray" },
    ];

    // Dynamic labels based on itemType
    const getItemLabel = () => {
        switch (itemType) {
            case constants.workspace.itemTypes.folder:
                return constants.vscode.displayNames.folder;
            case constants.workspace.itemTypes.note:
                return constants.vscode.displayNames.note;
            case constants.workspace.itemTypes.file:
                return constants.vscode.displayNames.file;
            default:
                return "Item";
        }
    };

    const itemLabel = getItemLabel();

    return (
        <Dialog open={isFolderDialogOpen} onOpenChange={(newOpen) => !newOpen && handleClose()}>
            <DialogContent className="sm:max-w-[550px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">{mode === "edit" ? `Edit ${itemLabel}` : `Create ${itemLabel}`}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <GenericTextField
                            id="new-folder-name"
                            name="new-folder-name"
                            label={`${itemLabel} Name *`}
                            value={newFolderName}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setNewFolderName(newValue);
                                // Clear error when user types
                                if (newValue && newValue.trim() !== "") {
                                    setErrors({ ...errors, name: "" });
                                } else {
                                    setErrors({ ...errors, name: `${itemLabel} Name is required` });
                                }
                            }}
                            placeholder={`Enter ${itemLabel.toLowerCase()} name`}
                            autoFocus
                            size="small"
                            error={!!errors.name || isDuplicateName}
                            helperText={errors.name || (isDuplicateName ? `A ${itemLabel.toLowerCase()} with this name already exists in this location` : "")}
                            maxLength={30}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} maxLength={50} />
                    </div>

                    {/* Only show color picker for folders */}
                    {itemType === constants.workspace.itemTypes.folder && (
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
                                            color === option.value ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="w-5 h-5 rounded border" style={{ backgroundColor: option.value }} />
                                        <span className="text-xs">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={submitFolder} disabled={isSubmitting || isDuplicateName || !newFolderName.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? (mode === "edit" ? "Updating..." : "Creating...") : mode === "edit" ? `Update ${itemLabel}` : `Create ${itemLabel}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
