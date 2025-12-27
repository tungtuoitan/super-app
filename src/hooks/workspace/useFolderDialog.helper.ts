import { useSnackbar } from "notistack";
import { useFolderDialogStore } from "@/store/workspace/FolderDialog.store";
import type { ItemType } from "@/store/workspace/FolderDialog.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { workspaceService } from "@/services/workspace.service";
import type { FolderDialogFormErrors } from "@/store/workspace/FolderDialog.store";
import type { Folder } from "@/types/folder.types";
import { useWorkspaceOperation } from "./useWorkspaceOperation.helper";
import { constants } from "@/utils/constants";

export const useFolderDialogHelper = () => {
    const { enqueueSnackbar } = useSnackbar();
    const { loadTree } = useWorkspaceOperation();

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
        setErrors,
        setIsSubmitting,
        setIsLoadingTree,
        setIsFolderDialogOpen,
        setMode,
        setEditingFolder,
        setNewFolderName,
        setDescription,
        setColor,
    } = useFolderDialogStore();

    // Workspace state
    const { currentTree } = useWorkspaceStore();

    // Auth
    const { $user } = useAuthStore();
    const token = $user.userToken;

    // Computed value
    const selectedWorkspaceId = currentTree?.workspaceId;

    /**
     * Reset form to initial state
     */
    const resetForm = () => {
        setNewFolderName("");
        setDescription("");
        setColor("#1976D2");
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
            enqueueSnackbar("No workspace selected", { variant: "error" });
            return;
        }

        // Edit mode validation: check if we have editing folder
        if (mode === "edit" && (!editingFolder || !editingFolder.id)) {
            enqueueSnackbar("No folder selected for editing", { variant: "error" });
            return;
        }

        setIsSubmitting(true);
        try {
            // Prepare folder data based on mode
            const folderData =
                mode === "edit"
                    ? {
                          id: editingFolder!.id, // Include folderId for update
                          name: newFolderName.trim(),
                          description: description.trim() || undefined,
                          color,
                          parentId: editingFolder!.parentId ?? null, // Preserve existing parentId (use ?? to handle 0)
                      }
                    : {
                          name: newFolderName.trim(),
                          description: description.trim() || undefined,
                          color,
                          parentId: parentFolder?.id > 0 ? parentFolder.id : null, //* khi parent là root thì để null
                      };

            // Call upsertFolder endpoint
            await workspaceService._upsertFolder(token, selectedWorkspaceId, folderData);

            // Success message based on mode
            const successMessage = mode === "edit" ? `Folder "${newFolderName}" updated successfully!` : `Folder "${newFolderName}" created successfully!`;

            enqueueSnackbar(successMessage, { variant: "success" });

            // Reload workspace tree
            loadTree(selectedWorkspaceId);

            // Close dialog
            closeFolderDialog();

            resetForm();
        } catch (error: any) {
            console.error(`Failed to ${mode} folder:`, error);
            enqueueSnackbar(error?.message || `Failed to ${mode} folder`, { variant: "error" });
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
            setNewFolderName(folder.name || "");
            setDescription(folder.description || "");
            setColor(folder.color || "#1976D2");
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
