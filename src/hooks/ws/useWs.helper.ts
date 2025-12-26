/**
 * Workspace List Helper
 * Business logic for workspace list operations
 */

import { wsService, WsDTO } from "@/services/ws.service";
import { storageService } from "@/services/storage.service";
import { useSnackbar } from "notistack";
import { useWsStore, Ws } from "@/store/ws/useWs.store";
import { constants } from "@/utils/constants";
import { generateTempId, generateUnsavedName, collectIdsFromTabs } from "@/utils/temp-id.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useWsTabHelper } from "./useWsTab.helper";
import { useEditorTabsStore } from "@/store/index";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
/**
 * Transform workspace DTOs (dates as strings) to domain models (dates as Date objects)
 */
const transformWsData = (dtos: WsDTO[]): Ws[] => {
    return dtos.map((dto) => ({
        id: dto.id,
        name: dto.name,
        description: dto.description,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
        userId: dto.userId,
    }));
};

export const useWsHelper = () => {
    const { auth } = useAuthStore();
    const { workspaces, setWorkspaces, setIsLoading, setError, rowSelection, setRowSelection, setShouldFocusWsName } = useWsStore();

    const { enqueueSnackbar } = useSnackbar();
    const { setIsContextMenuOpen, setAnchorPoint, setContextType, setContextData } = useOrchestratorContextMenuStore();
    const { openWorkspaceTab } = useWsTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();

    /**
     * Load workspaces from API
     */
    const loadWorkspaces = async () => {
        try {
            setIsLoading(true);
            const token = auth.userToken;
            const result = await wsService._getWs(token);

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || "Failed to load workspaces");
            }

            // Transform dates from API strings to Date objects
            const transformedData = transformWsData(result.data || []);
            setWorkspaces(transformedData);
            setError(null);
        } catch (err) {
            console.error("Failed to load workspaces:", err);
            const errorMessage = await parseApiError(err);
            setError(new Error(errorMessage));

            // Show specific message for unauthorized
            if (isUnauthorizedError(err)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to load workspaces: ${errorMessage}`, { variant: "error" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Sync workspace grid changes to open tabs
     * @param action - The action performed on workspaces ('delete', 'restore', 'hardDelete')
     * @param workspaceIds - Array of workspace IDs affected
     */
    const syncWsGridToTab = (action: "delete" | "restore" | "hardDelete", workspaceIds: number[]) => {
        if (workspaceIds.length === 0) return;

        //* LOGIC: data trong Tab luôn là data cũ (tức là data mà user đang thao tác), k sync với db, nó chỉ sync những gì user thao tác
        const updatedTabs = openTabs.map((tab: BaseTab) => {
            if (tab.type === constants.vscode.tab.tabTypes.workspace && workspaceIds.includes((tab as any).data.id)) {
                const wsData = tab.data as Ws;
                switch (action) {
                    case "delete":
                        // Mark tab data as soft deleted
                        return { ...tab, data: { ...wsData, deletedAt: new Date() } };
                    case "restore":
                        // Remove deleted flag when restoring
                        return { ...tab, data: { ...wsData, deletedAt: null, isHardDeleted: false } };
                    case "hardDelete":
                        // Mark tab data as hard deleted
                        return { ...tab, data: { ...wsData, deletedAt: null, isHardDeleted: true } };
                    default:
                        return tab;
                }
            }
            return tab;
        });

        setOpenTabs(updatedTabs);
    };

    /**
     * Create new workspace (temporary with negative ID)
     */
    const createNewWorkspace = () => {
        // Generate sequential temporary negative ID from open tabs
        const existingIds = collectIdsFromTabs(openTabs);
        const tempId = generateTempId(existingIds);
        const name = generateUnsavedName(tempId);

        // Create temporary workspace
        const newWorkspace: Ws = {
            id: tempId,
            name: name,
            description: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            userId: 0, // Temporary user ID
        };

        // Insert at the beginning of workspaces array
        setWorkspaces([newWorkspace, ...workspaces]);

        // Open workspace in editor tab
        openWorkspaceTab(newWorkspace);

        // Focus vào Workspace Name field sau khi tab mở
        setShouldFocusWsName(true);
    };

    /**
     * Delete selected workspaces (called from context menu after confirmation)
     * - Hard delete: Permanently remove from DB via DELETE API
     * - Soft delete: Set deletedAt via Upsert API
     */
    const deleteSelectedWs = async (selectedIds: number[], isHardDelete: boolean = false) => {
        if (selectedIds.length === 0) return;

        try {
            const token = auth.userToken;

            if (isHardDelete) {
                // HARD DELETE: Use DELETE API (permanently remove)
                const result = await wsService._deleteWs(token, selectedIds.join(","));

                if (!result.success) {
                    throw new Error(result.message || "Failed to hard delete workspace(s)");
                }

                enqueueSnackbar(`Successfully permanently deleted ${selectedIds.length} workspace(s)`, {
                    variant: "success",
                });

                // Sync tabs
                syncWsGridToTab("hardDelete", selectedIds);
            } else {
                // SOFT DELETE: Use batch upsert API with deletedAt timestamp
                const deletedAt = new Date().toISOString();

                // Build batch soft delete requests
                const batchRequests = selectedIds.map((id) => {
                    const workspace = workspaces.find((w) => w.id === id);
                    if (!workspace) {
                        throw new Error(`Workspace ${id} not found`);
                    }

                    return {
                        id: workspace.id,
                        name: workspace.name,
                        description: workspace.description,
                        userId: workspace.userId,
                        deletedAt: deletedAt, // Set soft delete timestamp
                    };
                });

                // Call batch upsert API (single call instead of loop)
                const result = await wsService._upsertWsBatch(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || "Failed to soft delete workspaces");
                }

                enqueueSnackbar(`Successfully soft deleted ${selectedIds.length} workspace(s)`, {
                    variant: "success",
                });

                // Sync tabs
                syncWsGridToTab("delete", selectedIds);
            }

            // Clear selection and reload workspaces
            setRowSelection({});
            await loadWorkspaces();
        } catch (error) {
            console.error("Failed to delete workspaces:", error);
            const errorMessage = await parseApiError(error);

            // Show specific message for unauthorized
            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to delete workspaces: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    /**
     * Handle context menu
     */
    const openContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds: number[];
        let selectedWorkspaces: Ws[] = [];

        // If row provided (clicked on a row)
        if (row) {
            const rowId = parseInt(row.id);
            // If row is not selected, add it to current selection
            if (!row.getIsSelected()) {
                // Add this row to existing selection
                setRowSelection({ ...rowSelection, [row.id]: true });
                // Include this row in selectedIds along with existing selection
                selectedIds = [...Object.keys(rowSelection).map((id) => parseInt(id)), rowId];
            } else {
                // Row already selected, use current selection
                selectedIds = Object.keys(rowSelection).map((id) => parseInt(id));
            }

            selectedWorkspaces = [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).filter((ws) => selectedIds.includes(ws.id));
        } else {
            // Clicked on empty area
            selectedIds = [];
        }

        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType("workspace-grid");
        setContextData({
            selectedWorkspaces,
            selectedIds,
            onDelete: (isHardDelete: boolean = false) => deleteSelectedWs(selectedIds, isHardDelete),
            addWorkspace: createNewWorkspace,
        });
        setIsContextMenuOpen(true);
    };

    return {
        loadWorkspaces,
        createNewWorkspace,
        syncWsGridToTab,
        openContextMenu,
    };
};
