/**
 * FolderDialog - Dialog for creating new folders in workspace
 * Migrated from MUI to shadcn/ui
 *
 * @pattern Uses NodeDialogStore for form state & useKFolderDialogHelper for business logic
 */

import React, { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { GenericTextField, IconPicker } from "@/shared/components";
import { useKeyboardShortcut } from "@/shared/hooks";
import { useKNodeDialogHelper as useKFolderDialogHelper } from "../../../hooks/useKNodeDialog.helper";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components/ui/GenericAutoComplete";
import {useKStore} from "../../../store/K.store";
import {isFolder, KItemV2} from "../../../types/K-v2.types";
import {kconstants} from "../../../utils/K.Constants";
import {getAllIconLabel} from "../../../shared/icons/icon.utils";
import {IconType} from "../../../shared/icons/icon.types";
import {useNodeDialogStore} from "../../../store/KFolderDialog.store";
import { getIconDefaultColor } from "@/shared/icons";

export function KDialog() {
    // Get state from ExplorerStore
    const { currentK } = useKStore();

    // Get form state from NodeDialogStore (unified approach)
    const { isNodeDialogOpen, mode, itemType, editingNode, parentNode, newNodeName, setNewNodeName, description, setDescription, color, setColor, icon, setIcon, errors, setErrors, isSubmitting } =
        useNodeDialogStore();

    // Get business logic and dialog actions from helper
    const { submitNode, closeNodeDialog } = useKFolderDialogHelper();

    // Track if user has manually selected an icon (to avoid overriding their choice)
    const hasManuallySelectedIcon = React.useRef(false);

    // Reset manual selection flag when dialog opens for create mode
    useEffect(() => {
        if (isNodeDialogOpen && mode === "create") {
            hasManuallySelectedIcon.current = false;
            setIcon(IconType.LIBRARIES);
            setColor(getIconDefaultColor(IconType.LIBRARIES));
        }
    }, [isNodeDialogOpen, mode]);

    // Auto-select icon based on folder name (only in create mode and only for folders)
    // useEffect(() => {
    //     if (mode === "create" && itemType === kconstants.workspace.itemTypes.folder && !hasManuallySelectedIcon.current) {
    //         const matchedIcon = findBestIconMatch(newNodeName);
    //         setIcon(matchedIcon);
    //         // Also set the color based on the matched icon's default color
    //         setColor(getIconDefaultColor(matchedIcon));
    //     }
    // }, [newNodeName, mode, itemType, setIcon, setColor]);

    // Derived values
    const parentFolderId = parentNode?.id;

    // Find parent folder info for display (VS Code-like)
    const parentFolderInfo = React.useMemo(() => {
        if (!parentFolderId || !currentK?.flatData || currentK.flatData.length === 0) return null;

        // Search for parent folder in the flat list
        const found = currentK.flatData.find(item => isFolder(item) && item.id === parentFolderId);
        return found || null;
    }, [parentFolderId, currentK]);

    // Get sibling folders to check for duplicate names
    const siblingFolders = () => {
        if (!currentK?.flatData || currentK.flatData.length === 0) return [];

        // Find all items with the same parentId (siblings)
        // For folders at root level, parentId should match the parent folder's id
        // For creating at root, parentId would be null or the workspace root id
        return currentK.flatData.filter(
            (item: KItemV2) =>
                // ✅ Use type guard and entityId field
                isFolder(item) &&
                // Same parent (siblings)
                item.parentId === parentFolderId &&
                // When editing, exclude the current folder being edited
                (mode === "create" || item.id !== editingNode?.id)
        );
    };

    // Check if name is duplicate
    const isDuplicateName = React.useMemo(() => {
        if (!newNodeName.trim()) return false;

        return siblingFolders().some((folder: KItemV2) => {
            if (isFolder(folder)) {
                return folder.name.toLowerCase() === newNodeName.trim().toLowerCase();
            }
            return false;
        });
    }, [newNodeName]);

    // Handle dialog close
    const handleClose = () => {
        closeNodeDialog();
    };

    // Keyboard Shortcuts
    useKeyboardShortcut({
        key: "Enter",
        enabled: isNodeDialogOpen && !isSubmitting && !!newNodeName.trim(),
        callback: submitNode,
    });

    useKeyboardShortcut({
        key: "Escape",
        enabled: isNodeDialogOpen && !isSubmitting,
        callback: handleClose,
    });


    // Handle icon selection from IconPicker
    const handleIconChange = (iconType: IconType | null, defaultColor: string) => {
        hasManuallySelectedIcon.current = true;
        setIcon(iconType);
        setColor(defaultColor);
    };

    // Keyword suggestions for autocomplete (only for folders)
    const keywordSuggestions: IAutoCompleteOptions[] = React.useMemo(() => {
        return getAllIconLabel().map((l) => ({
            id: l.id,
            label: l.label,
            type: l.iconType,
        }));
    }, []);

    

    // Handle keyword suggestion selection
    const handleKeywordSelect = (_: React.SyntheticEvent, option: IAutoCompleteOptions | null) => {
        if (option) {
            setNewNodeName(option.label??'');
            // The icon will be auto-selected via useEffect
        }
    };

    // Dynamic labels based on itemType
    const getItemLabel = () => {
        switch (itemType) {
            case kconstants.workspace.itemTypes.folder:
                return kconstants.vscode.displayNames.folder;
            default:
                return "Item";
        }
    };

    const itemLabel = getItemLabel();

    return (
        <Dialog open={isNodeDialogOpen} onOpenChange={(newOpen) => !newOpen && handleClose()}>
            <DialogContent className="sm:max-w-[550px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">{mode === "edit" ? `Edit ${itemLabel}` : `Create ${itemLabel}`}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Folder name with suggestions dropdown for folders */}
                    {itemType === kconstants.workspace.itemTypes.folder && mode === "create" ? (
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <GenericTextField
                                        id="new-folder-name"
                                        name="new-folder-name"
                                        label={`${itemLabel} Name *`}
                                        value={newNodeName}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            // Auto capitalize first letter for folder name
                                            const capitalizedValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
                                            setNewNodeName(capitalizedValue);
                                            // Clear error when user types
                                            if (capitalizedValue && capitalizedValue.trim() !== "") {
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
                                        maxLength={50}
                                    />
                                </div>
                                <div className="folder-name-suggestion">
                                    <GenericAutoComplete
                                        // id="folder-name-suggestion"
                                        size="small"
                                        value={null}
                                        allOptions={keywordSuggestions}
                                        onChange={handleKeywordSelect}
                                        inputProps={{
                                            name: "keyword-suggestion",
                                            label: "Quick pick",
                                            required: false,
                                        }}
                                        style={{
                                            marginBottom: "0px",

                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <GenericTextField
                                id="new-folder-name"
                                name="new-folder-name"
                                label={`${itemLabel} Name *`}
                                value={newNodeName}
                                onChange={(e) => {
                                    const newValue = e.target.value;
                                    // Auto capitalize first letter for folder name
                                    const capitalizedValue = newValue.charAt(0).toUpperCase() + newValue.slice(1);
                                    setNewNodeName(capitalizedValue);
                                    // Clear error when user types
                                    if (capitalizedValue && capitalizedValue.trim() !== "") {
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
                    )}

                    {/* <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={3} maxLength={50} />
                    </div> */}

                    <div className="space-y-1">
                        <GenericTextField
                            id="node-description"
                            name="node-description"
                            label="Description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Optional description"
                            size="small"
                            multiline
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    {/* Only show color and icon pickers for folders */}
                    {itemType === kconstants.workspace.itemTypes.folder && (
                        <>
                            {/* Compact Color Picker - Disabled, using default gray color from icon config */}
                            {/* <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <div className="grid grid-cols-8 gap-2">
                                    {kconstants.color.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setColor(option.value)}
                                            title={option.label}
                                            className={cn(
                                                "flex items-center justify-center p-2 rounded-md border-2 transition-all",
                                                color === option.value ? "border-primary " : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <div className="w-5 h-5 rounded border" style={{ backgroundColor: option.value }} />
                                        </button>
                                    ))}
                                </div>
                            </div> */}

                            {/* Icon Picker - Reusable component with groups */}
                            <IconPicker
                                value={icon}
                                onChange={handleIconChange}
                                label="Icon"
                                columns={4}
                                maxHeight="300px"
                                showGroupLabels={true}
                            />
                        </>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={submitNode} disabled={isSubmitting || isDuplicateName || !newNodeName.trim()}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isSubmitting ? (mode === "edit" ? "Updating..." : "Creating...") : mode === "edit" ? `Update ${itemLabel}` : `Create ${itemLabel}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


