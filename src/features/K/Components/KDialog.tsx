/**
 * FolderDialog - Dialog for creating new folders in workspace
 * Migrated from MUI to shadcn/ui
 *
 * @pattern Uses NodeDialogStore for form state & useKFolderDialogHelper for business logic
 */

import React, { useEffect, useState, useCallback } from "react";
import { workspaceConstants } from "@/features/workspace/workspace.constants";
import { Loader2, Code2, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, getAllIconLabel, IconKey } from "@/shared";
import { Button } from "@/shared";
import { GenericTextField, IconPicker } from "@/shared";
import { useKNodeDialogHelper as useKFolderDialogHelper } from "../hooks/useKNodeDialog.helper";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared";
import {useKStore} from "../store/useK.store";
import {useNodeDialogStore} from "../store/useKNodeDialog.store";
import { getIconDefaultColor } from "@/shared";
import { useGlobalShortcut } from "@/shared";
import {isFolder, KItemV2} from "../types/kV2.type";
import { KAttachmentService } from "../service/kAttachment.service";
import type { KAttachment } from "../types/kAttachment.type";
import { KAttachmentViewerDialog } from "./small/KAttachmentViewerDialog";

export function KDialog() {
    // Get state from ExplorerStore
    const { currentK } = useKStore();

    // Get form state from NodeDialogStore (unified approach)
    const { isNodeDialogOpen, mode, itemType, editingNode, parentNode, newNodeName, setNewNodeName, description, setDescription, color, setColor, icon, setIcon, nodeType, setNodeType, errors, setErrors, isSubmitting } =
        useNodeDialogStore();

    // Get business logic and dialog actions from helper
    const { submitNode, closeNodeDialog } = useKFolderDialogHelper();

    // Track if user has manually selected an icon (to avoid overriding their choice)
    const hasManuallySelectedIcon = React.useRef(false);

    // Attachment state (edit mode only)
    const [nodeAttachments, setNodeAttachments] = useState<KAttachment[]>([]);
    const [attPool, setAttPool] = useState<KAttachment[]>([]);
    const [attSectionOpen, setAttSectionOpen] = useState(false);
    const [linkingAttId, setLinkingAttId] = useState<number | null>(null);
    const [attPickerOpen, setAttPickerOpen] = useState(false);
    const [viewingAtt, setViewingAtt] = useState<KAttachment | null>(null);

    const loadNodeAttachments = useCallback(async (nodeId: number) => {
        try {
            const res = await KAttachmentService._listForNode(nodeId);
            if (res.success && res.object) setNodeAttachments(res.object);
        } catch { /* silent */ }
    }, []);

    const loadAttPool = useCallback(async () => {
        if (attPool.length > 0) return;
        try {
            const res = await KAttachmentService._listAll();
            if (res.success && res.object) setAttPool(res.object);
        } catch { /* silent */ }
    }, [attPool.length]);

    const handleLinkToNode = async (att: KAttachment) => {
        if (!editingNode || linkingAttId !== null) return;
        setLinkingAttId(att.id);
        try {
            await KAttachmentService._linkToNode(editingNode.id, att.id);
            setNodeAttachments(prev => [...prev, att]);
            setAttPickerOpen(false);
        } catch { /* silent */ }
        finally { setLinkingAttId(null); }
    };

    const handleUnlinkFromNode = async (att: KAttachment) => {
        if (!editingNode) return;
        try {
            await KAttachmentService._unlinkFromNode(editingNode.id, att.id);
            setNodeAttachments(prev => prev.filter(a => a.id !== att.id));
        } catch { /* silent */ }
    };

    // Reset manual selection flag when dialog opens for create mode
    useEffect(() => {
        if (isNodeDialogOpen && mode === "create") {
            hasManuallySelectedIcon.current = false;
            setIcon(IconKey.LIBRARIES);
            setColor(getIconDefaultColor(IconKey.LIBRARIES));
            setNodeType("entity");
        }
        if (isNodeDialogOpen && mode === "edit" && editingNode) {
            setNodeAttachments([]);
            setAttSectionOpen(false);
            loadNodeAttachments(editingNode.id);
        }
    }, [isNodeDialogOpen, mode]);

    // Auto-select icon based on folder name (only in create mode and only for folders)
    // useEffect(() => {
    //     if (mode === "create" && itemType === workspaceConstants.itemTypes.folder && !hasManuallySelectedIcon.current) {
    //         const matchedIcon = findBestIconMatch(newNodeName);
    //         setIcon(matchedIcon);
    //         // Also set the color based on the matched icon's default color
    //         setColor(getIconDefaultColor(matchedIcon));
    //     }
    // }, [newNodeName, mode, itemType, setIcon, setColor]);

    // Derived values
    const parentFolderId = parentNode?.id;

    // Find parent folder info for display (VS Code-like)
    // const parentFolderInfo = React.useMemo(() => {
    //     if (!parentFolderId || !currentK?.flatData || currentK.flatData.length === 0) return null;

    //     // Search for parent folder in the flat list
    //     const found = currentK.flatData.find(item => isFolder(item) && item.id === parentFolderId);
    //     return found || null;
    // }, [parentFolderId, currentK]);

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
    }

    // Check if name is duplicate
    const isDuplicateName = (() => {
        if (!newNodeName.trim()) return false;

        return siblingFolders().some((folder: KItemV2) => {
            if (isFolder(folder)) {
                return folder.name.toLowerCase() === newNodeName.trim().toLowerCase();
            }
            return false;
        });
    })()

    // Handle dialog close
    const handleClose = () => {
        closeNodeDialog();
    };

    // Keyboard Shortcuts
    useGlobalShortcut("enter",  { id: "k-dialog-submit", priority: 100, enabled: isNodeDialogOpen && !isSubmitting && !!newNodeName.trim() }, submitNode);
    useGlobalShortcut("escape", { id: "k-dialog-close",  priority: 100, enabled: isNodeDialogOpen && !isSubmitting }, handleClose);


    // Handle icon selection from IconPicker
    const handleIconChange = (iconType: IconKey | null, defaultColor: string) => {
        hasManuallySelectedIcon.current = true;
        setIcon(iconType);
        setColor(defaultColor);
    };

    // Keyword suggestions for autocomplete (only for folders)
    const keywordSuggestions: IAutoCompleteOptions[] = getAllIconLabel().map((l) => ({
            id: l.id,
            label: l.label,
            type: l.iconType,
        }))
    

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
            case workspaceConstants.itemTypes.folder:
                return "Node";
            default:
                return "Item";
        }
    };

    const itemLabel = getItemLabel();

    return (
        <>
        <Dialog open={isNodeDialogOpen} onOpenChange={(newOpen) => !newOpen && handleClose()}>
            <DialogContent className="sm:max-w-[550px] rounded-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">{mode === "edit" ? `Edit ${itemLabel}` : `Create ${itemLabel}`}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Folder name with suggestions dropdown for folders */}
                    {itemType === workspaceConstants.itemTypes.folder && mode === "create" ? (
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
                                        maxLength={200}
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

                    {/* Icon picker */}
                    {itemType === workspaceConstants.itemTypes.folder && (
                        <div>
                            <IconPicker
                                value={icon}
                                onChange={handleIconChange}
                                label="Icon"
                                columns={4}
                                maxHeight="300px"
                                showGroupLabels={true}
                            />
                        </div>
                    )}

                    {/* Attachments — edit mode only */}
                    {mode === "edit" && editingNode && (
                        <div className="border border-zinc-700 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setAttSectionOpen(o => !o)}
                                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
                            >
                                <span>Attachments {nodeAttachments.length > 0 && `(${nodeAttachments.length})`}</span>
                                {attSectionOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {attSectionOpen && (
                                <div className="px-3 pb-3 space-y-2 border-t border-zinc-700">
                                    {nodeAttachments.length === 0 && (
                                        <p className="text-xs text-zinc-500 pt-2">No attachments linked to this node.</p>
                                    )}
                                    {nodeAttachments.map(att => (
                                        <div key={att.id} className="flex items-center gap-2 pt-2">
                                            <Code2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                            <button
                                                type="button"
                                                onClick={() => setViewingAtt(att)}
                                                className="flex-1 text-left text-xs font-mono text-zinc-300 hover:text-zinc-100 truncate transition-colors"
                                                title="Click to view"
                                            >
                                                {att.title}
                                            </button>
                                            {att.language && (
                                                <span className="text-xs px-1 py-0.5 rounded bg-zinc-700 text-zinc-400 font-mono">{att.language}</span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleUnlinkFromNode(att)}
                                                className="text-zinc-500 hover:text-red-400 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Link picker */}
                                    <div className="relative pt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setAttPickerOpen(o => !o); loadAttPool(); }}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors"
                                        >
                                            <Link2 className="w-3 h-3" />
                                            Link attachment
                                        </button>
                                        {attPickerOpen && (
                                            <div className="absolute left-0 top-full mt-1 z-20 w-64 rounded border border-zinc-700 bg-zinc-900 shadow-lg">
                                                {attPool.length === 0 ? (
                                                    <div className="p-3 text-xs text-zinc-500">No attachments available</div>
                                                ) : (
                                                    <ul className="max-h-48 overflow-y-auto py-1">
                                                        {attPool
                                                            .filter(a => !nodeAttachments.some(n => n.id === a.id))
                                                            .map(att => (
                                                                <li key={att.id}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleLinkToNode(att)}
                                                                        disabled={linkingAttId === att.id}
                                                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                                                                    >
                                                                        {linkingAttId === att.id
                                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                            : <Code2 className="w-3 h-3 text-zinc-500" />
                                                                        }
                                                                        <span className="truncate font-mono">{att.title}</span>
                                                                    </button>
                                                                </li>
                                                            ))
                                                        }
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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
        <KAttachmentViewerDialog atts={viewingAtt ? [viewingAtt] : []} att={viewingAtt} onClose={() => setViewingAtt(null)} />
        </>
    );
}









