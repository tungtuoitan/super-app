import { useFolderDialogStore } from "../store/FolderDialog.store";
import type { ItemType } from "../store/FolderDialog.store";
import { useWorkspaceStore } from "../store/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { workspaceService } from "../service/workspace.service"; 
import type { FolderDialogFormErrors } from "../store/FolderDialog.store";
import type { Folder } from "@/types/folder.types";
import { constants } from "@/utils/constants";
import { WorkspaceItemAction } from "../types/workspace.types";
import { useStandardRegistryHelper } from "@/shared/hooks/useStandardRegistry.helper";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { treeMiniHelper } from "./tree.miniHelper";
import { isFolder } from "@/types/workspace-v2.types";
import { useWorkspaceLoader } from "./useWorkspace.loader";

export const useFolderDialogHelper = () => {
    const _console = useConsoleHelper();
    const { loadTree } = useWorkspaceLoader();
    const { loadKeywords } = useStandardRegistryHelper();

    // Form state from FolderDialogStore
    const {
        mode,
        itemType,
        setItemType,
        editingFolder,
        parentFolder,
        setParentFolder,
        newFolderName,
        description,
        color,
        icon,
        setErrors,
        setIsSubmitting,
        setIsLoadingTree,
        setIsFolderDialogOpen,
        setMode,
        setEditingFolder,
        setNewFolderName,
        setDescription,
        setColor,
        setIcon,
    } = useFolderDialogStore();

    // Workspace state
    const { currentWorkspace, treeData, _treeRef, setSelectedItemIds, setLastSelectedItemId, setScrollToItem } = useWorkspaceStore();

    // Auth
    const { $user } = useAuthStore();
    const token = $user.userToken;

    // Computed value
    const selectedWorkspaceId = currentWorkspace?.id;

    /**
     * Reset form to initial state
     */
    const resetForm = () => {
        setNewFolderName("");
        setDescription("");
        setColor(constants.color[0].value); // Reset to default color
        setIcon(null);
        setErrors({});
        setIsSubmitting(false);
    };

    const validateNewFolder = (): boolean => {
        const newErrors: FolderDialogFormErrors = {};

        if (!newFolderName.trim()) {
            newErrors.name = "Folder name is required";
        } else if (newFolderName.length > 200) {
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
     * Uses mode from FolderDialogStore to determine create vs edit
     */
    const submitFolder = async () => {
        // Validate form
        if (!validateNewFolder()) {
            return;
        }

        // Check workspace ID
        if (!selectedWorkspaceId) {
            _console.error("No workspace selected");
            return;
        }

        // Edit mode validation: check if we have editing folder
        if (mode === "edit" && (!editingFolder || !editingFolder.id)) {
            _console.error("No folder selected for editing");
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare batch request with action-based API
            if (mode === "edit") {
                // UPDATE action: update existing folder
                await workspaceService._upsertWorkspaceItems(token, selectedWorkspaceId, [{
                    action: WorkspaceItemAction.UpdateFolder,
                    id: editingFolder!.id,
                    folderData: {
                        name: newFolderName.trim(),
                        description: description.trim() || undefined,
                        color,
                        icon: icon || undefined,
                    }
                }]);
            } else {
                // CREATE action: create new folder + workspace_item
                // IMPORTANT: parentId = parent's workspace_items.id (NOT entityId!)
                // workspace_items.parent_id is a SELF-REFERENCING FK to workspace_items.id
                const parentWorkspaceItemId = parentFolder && "id" in parentFolder && (parentFolder as any).id > 0
                    ? (parentFolder as any).id
                    : null;

                await workspaceService._upsertWorkspaceItems(token, selectedWorkspaceId, [{
                    action: WorkspaceItemAction.Create,
                    entityType: 2, // Folder
                    parentId: parentWorkspaceItemId, // ✅ Use parent's workspace_items.id (NOT entityId!)
                    folderData: {
                        name: newFolderName.trim(),
                        description: description.trim() || undefined,
                        color,
                        icon: icon || undefined,
                    }
                }]);
            }

            // Success message based on mode
            const successMessage = mode === "edit" ? `Folder "${newFolderName}" updated successfully!` : `Folder "${newFolderName}" created successfully!`;

            _console.success(successMessage);

            // Store the folder name and parent ID for finding the new folder after reload
            const createdFolderName = newFolderName.trim();
            const parentId = parentFolder && "id" in parentFolder && (parentFolder as any).id > 0
                ? (parentFolder as any).id
                : null;

            // Reload workspace tree
            const loadedWorkspace = await loadTree();
            loadKeywords();

            // After tree reloads, find and select the new folder (only for create mode)
            if (mode === "create" && loadedWorkspace?.flatData) {
                // Find the newly created folder by name and parentId
                const newFolder = loadedWorkspace.flatData.find((item:any) =>
                    isFolder(item) &&
                    item.data.name === createdFolderName &&
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
                        const updatedTreeData = treeMiniHelper.transformToTreeData(loadedWorkspace, "");
                        if (updatedTreeData.length > 0) {
                            await treeMiniHelper.expandPathToItem(_treeRef, updatedTreeData, newFolderId);
                        }
                    }, 100);
                }
            }

            // Close dialog
            closeFolderDialog();

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
     * @param parentFolder - For create mode: parent folder (optional). For edit mode: unused
     */
    const openFolderDialog = (dialogMode: "create" | "edit", type: ItemType = constants.workspace.itemTypes.folder, folder?: Folder | null, parentFolder?: Folder | null) => {
        setMode(dialogMode);
        setItemType(type);

        if (dialogMode === "create") {
            // Create mode: use parentFolder parameter
            setParentFolder(parentFolder || null);
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

            setEditingFolder(editData);

            // Pre-fill form with existing data (with safe fallbacks)
            // Handle WorkspaceItemV2 structure (data property) and legacy Folder structure
            const folderData = (folder as any).data || folder;
            setNewFolderName(folderData.name || "");
            setDescription(folderData.description || "");
            setColor(folderData.color || constants.color[0].value);
            setIcon(folderData.icon || null);
        }

        // Clear any previous errors
        setErrors({});

        // Open dialog
        setIsFolderDialogOpen(true);
    };

    /**
     * Close folder dialog
     */
    const closeFolderDialog = () => {
        setIsFolderDialogOpen(false);
        setTimeout(() => {
            if (mode === "create") {
                setParentFolder(null);
            }
            resetForm();
        }, 200); // Clear after animation
    };

    return {
        // Dialog actions
        openFolderDialog,
        closeFolderDialog,

        // Validation & Submit (unified)
        validateNewFolder,
        submitFolder,
    };
};
