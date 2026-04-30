import { useKStore } from "../store/K.store";
import { KService } from "../service/K.service";
import { KItemAction } from "../types/K.types";
import { isFolder } from "../types/K-v2.types";
import {kconstants} from "../utils/K.Constants";
import {NodeDialogFormErrors, NodeItemType, useNodeDialogStore} from "../store/KNodeDialog.store";
import type { KItemV2 } from "../types/K-v2.types";
import {KtreeMiniHelper} from "./kTree/Ktree.miniHelper";
import {useKLoader} from "./kTree/useK.loader";
import {useAuthStore, useConsoleHelper} from "@/shared";
import {useKeywordHelper} from "@/shared";
import {Folder} from "../types/folder.types";

export const useKNodeDialogHelper = () => {
    const _console = useConsoleHelper();
    const { loadTree } = useKLoader();
    const { loadKeywords } = useKeywordHelper();

    // Form state from NodeDialogStore
    const {
        mode,
        itemType,
        setItemType,
        editingNode,
        parentNode,
        setParentNode,
        newNodeName,
        description,
        color,
        icon,
        nodeType,
        setErrors,
        setIsSubmitting,
        setIsLoadingTree,
        setIsNodeDialogOpen,
        setMode,
        setEditingNode,
        setNewNodeName,
        setDescription,
        setColor,
        setIcon,
        setNodeType,
    } = useNodeDialogStore();

    // Workspace state
    const { currentK, treeData, _treeRef, setSelectedItemIds, setLastSelectedItemId, setScrollToItem } = useKStore();

    // Auth
    const { $user } = useAuthStore();
    const token = $user.userToken;

    // Computed value
    const selectedKId = currentK?.id;

    /**
     * Reset form to initial state
     */
    const resetForm = () => {
        setNewNodeName("");
        setDescription("");
        setColor(kconstants.color[0].value); // Reset to default color
        setIcon(null);
        setNodeType("entity");
        setErrors({});
        setIsSubmitting(false);
    };

    const validateNewNode = (): boolean => {
        const newErrors: NodeDialogFormErrors = {};

        if (!newNodeName.trim()) {
            newErrors.name = "Folder name is required";
        } else if (newNodeName.length > 200) {
            newErrors.name = "Folder name must be less than 200 characters";
        }

        // Optional: Add description validation
        if (description && description.length > 1000) {
            newErrors.description = "Description must be less than 1000 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Submit folder (unified for create and edit)
     * Uses mode from NodeDialogStore to determine create vs edit
     */
    const submitNode = async () => {
        // Validate form
        if (!validateNewNode()) {
            return;
        }

        // Check workspace ID
        if (!selectedKId) {
            _console.error("No workspace selected");
            return;
        }

        // Edit mode validation: check if we have editing folder
        if (mode === "edit" && (!editingNode || !editingNode.id)) {
            _console.error("No folder selected for editing");
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare batch request with action-based API
            if (mode === "edit") {
                // UPDATE action: update existing folder
                await KService._upsertWorkspaceItems(token, selectedKId, [{
                    action: KItemAction.Update,
                    id: editingNode!.id,
                    nodeData: {
                        name: newNodeName.trim(),
                        description: description.trim() || undefined,
                        color,
                        icon: nodeType === "entity" ? (icon || undefined) : null,
                        nodeType: nodeType ?? undefined,
                    }
                }]);
            } else {
                // CREATE action: create new folder + workspace_item
                // IMPORTANT: parentId = parent's workspace_items.id (NOT entityId!)
                // workspace_items.parent_id is a SELF-REFERENCING FK to workspace_items.id
                const parentWorkspaceItemId = parentNode && "id" in parentNode && (parentNode as any).id > 0
                    ? (parentNode as any).id
                    : null;

                await KService._upsertWorkspaceItems(token, selectedKId, [{
                    action: KItemAction.Create,
                    parentId: parentWorkspaceItemId, // ✅ Use parent's workspace_items.id (NOT entityId!)
                    nodeData: {
                        name: newNodeName.trim(),
                        description: description.trim() || undefined,
                        color,
                        icon: nodeType === "entity" ? (icon || undefined) : null,
                        nodeType: nodeType ?? undefined,
                    }
                }]);
            }

            // Success message based on mode
            const successMessage = mode === "edit" ? `Folder "${newNodeName}" updated successfully!` : `Folder "${newNodeName}" created successfully!`;

            _console.success(successMessage);

            // Store the folder name and parent ID for finding the new folder after reload
            const createdFolderName = newNodeName.trim();
            const parentId = parentNode && "id" in parentNode && (parentNode as any).id > 0
                ? (parentNode as any).id
                : null;

            // Reload workspace tree
            const loadedWorkspace = await loadTree();
            loadKeywords();

            // After tree reloads, find and select the new folder (only for create mode)
            if (mode === "create" && loadedWorkspace?.flatData) {
                // Find the newly created folder by name and parentId
                const newFolder = loadedWorkspace.flatData.find((item: any) =>
                    isFolder(item) &&
                    item.name === createdFolderName &&
                    item.parentId === parentId
                );

                if (newFolder) {
                    const newFolderId = newFolder.id; // workspace_items.id

                    // Set as selected and lastSelectedItem
                    setSelectedItemIds([newFolderId]);
                    setLastSelectedItemId(newFolderId);
                    setScrollToItem(true);

                    // Get updated tree data and expand path to the new folder
                    setTimeout(async () => {
                        const updatedTreeData = KtreeMiniHelper.transformToTreeData(loadedWorkspace, "");
                        if (updatedTreeData.length > 0) {
                            await KtreeMiniHelper.expandPathToItem(_treeRef, updatedTreeData, newFolderId);
                        }
                    }, 100);
                }
            }

            // Close dialog
            closeNodeDialog();

            resetForm();
        } catch (error: any) {
            console.error(`Failed to ${mode} folder:`, error);
            _console.error(error?.message || `Failed to ${mode} folder`);
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Open folder dialog (unified for create and edit)
     * @param dialogMode - 'create' or 'edit'
     * @param type - Item type: 'folder', 'note', or 'file'
     * @param folder - For edit mode: folder to edit (required). For create mode: unused
     * @param parentNode - For create mode: parent folder (optional). For edit mode: unused
     */
    const openNodeDialog = (dialogMode: "create" | "edit", type: NodeItemType = kconstants.workspace.itemTypes.folder, folder?: Folder | null, parentNode?: Folder | null) => {
        setMode(dialogMode);
        setItemType(type);

        if (dialogMode === "create") {
            // Create mode: use parentNode parameter
            setParentNode(parentNode || null);
            resetForm();
        } else {
            // Edit mode: use folder parameter
            if (!folder) {
                return;
            }

            // Handle both folderId and tagId (for backward compatibility)
            const editData = {
                ...folder,
                id: folder.id || (folder as any).tagId,
            };

            setEditingNode(editData);

            // Pre-fill form with existing data (with safe fallbacks)
            // Handle WorkspaceItemV2 structure (data property) and legacy Folder structure
            const folderData = (folder as any).data || folder;
            setNewNodeName(folderData.name || "");
            setDescription(folderData.description || "");
            setColor(folderData.color || kconstants.color[0].value);
            setIcon(folderData.icon || null);
            setNodeType(folderData.nodeType || "entity");
        }

        // Clear any previous errors
        setErrors({});

        // Open dialog
        setIsNodeDialogOpen(true);
    };

    /**
     * Close folder dialog
     */
    const closeNodeDialog = () => {
        setIsNodeDialogOpen(false);
        setTimeout(() => {
            if (mode === "create") {
                setParentNode(null);
            }
            resetForm();
        }, 200); // Clear after animation
    };

    /**
     * Activate a draft node — sets statusCode to null (active)
     */
    const activateDraftNode = async (nodeItem: KItemV2) => {
        if (!selectedKId) return;
        try {
            await KService._upsertWorkspaceItems(token, selectedKId, [{
                action: KItemAction.Update,
                id: nodeItem.id,
                nodeData: {
                    name:        nodeItem.name,
                    description: nodeItem.description,
                    color:       nodeItem.color,
                    icon:        nodeItem.icon,
                    statusCode:  'active'
                },
            }]);
            await loadTree();
        } catch (error: any) {
            _console.error(error?.message || "Failed to activate node");
        }
    };

    return {
        // Dialog actions
        openNodeDialog,
        closeNodeDialog,

        // Validation & Submit (unified)
        validateNewNode,
        submitNode,

        // Inline status toggle
        activateDraftNode,
    };
};


