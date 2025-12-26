import { wsService, WsDTO } from "@/services/ws.service";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { Ws } from "@/store/ws/useWs.store";
import { collectIdsFromTabs, generateTempId, generateUnsavedName } from "../../utils";
import { useSnackbar } from "notistack";
import { useEditorTabHelper } from "../vsCode/useEditorTab.helper";
import { useWsStore } from "@/store/ws/useWs.store";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/types/editor/tab.types";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useEditorTabsStore } from "@/store/index";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import {filterUtils} from "@/utils/filter.utils";

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

export const useWsGridHelper = () => {
    const { $user } = useAuthStore();

    const { workspaces, setWorkspaces, setIsLoading, setError, rowSelection, setRowSelection } = useWsStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const { openTab } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabsStore();
    const { enqueueSnackbar } = useSnackbar();
    const { setShouldFocusWsName } = useWsDetailStore();

    // Create new workspace (temporary with negative ID)
    const __createNewWorkspace = () => {
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

        // Open workspace tab for editing
        openTab(newWorkspace);

        // Focus vào Workspace Name field sau khi tab mở
        setShouldFocusWsName(true);
    };

    /**
     * Toggle delete/restore for selected workspaces (soft delete)
     * - type = 'soft-delete': Set deletedAt timestamp (soft delete)
     * - type = 'restore': Clear deletedAt (restore)
     */
    const __toggleSelectedWorkspaces = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(rowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        // Separate temporary workspaces (negative IDs) from persisted workspaces (positive IDs)
        const tempWsIds = selectedIds.filter((id) => id < 0);
        const persistedWsIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            // Handle temporary workspaces - only for delete (remove from grid locally)
            if (type === "soft-delete" && tempWsIds.length > 0) {
                setWorkspaces((prevWs) => prevWs.filter((ws) => !tempWsIds.includes(ws.id)));

                enqueueSnackbar(`Removed ${tempWsIds.length} unsaved workspace(s)`, {
                    variant: "success",
                });
            }

            // Handle persisted workspaces - call API
            if (persistedWsIds.length > 0) {
                // Determine deletedAt value based on action
                const deletedAt = type === "soft-delete" ? new Date().toISOString() : null;

                // Build batch requests
                const batchRequests = persistedWsIds.map((id) => {
                    const workspace = workspaces.find((w) => w.id === id);
                    if (!workspace) {
                        throw new Error(`Workspace ${id} not found`);
                    }

                    return {
                        id: workspace.id,
                        name: workspace.name,
                        description: workspace.description,
                        userId: workspace.userId,
                        deletedAt: deletedAt, // Set or clear soft delete timestamp
                    };
                });

                // Call batch upsert API
                const result = await wsService._upsertWsBatch(token, batchRequests);

                if (!result.success) {
                    throw new Error(result.message || `Failed to ${type === "soft-delete" ? "delete" : "restore"} workspaces`);
                }

                enqueueSnackbar(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedWsIds.length} workspace(s)`, { variant: "success" });

                // Update opened tabs
                const updatedTabs = openTabs.map((tab: BaseTab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.workspace && persistedWsIds.includes((tab.data as Ws).id)) {
                        const wsData = tab.data as Ws;
                        return {
                            ...tab,
                            data: {
                                ...wsData,
                                deletedAt: type === "soft-delete" ? new Date() : null,
                            },
                        };
                    }
                    return tab;
                });
                setOpenTabs(updatedTabs);

                // Reload workspaces from API
                await loadWorkspaces();
            }

            // Clear selection
            setRowSelection({});
        } catch (error) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} workspaces:`, error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to ${type === "soft-delete" ? "delete" : "restore"} workspaces: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    /**
     * Permanently delete selected workspaces (hard delete)
     * Uses DELETE API to remove from database completely
     */
    const __hardDeleteSelectedWorkspaces = async (ids?: number[]) => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(rowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        // Only hard delete persisted workspaces (positive IDs)
        const persistedWsIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            if (persistedWsIds.length > 0) {
                // Use DELETE API (permanently remove)
                const result = await wsService._deleteWs(token, persistedWsIds.join(","));

                if (!result.success) {
                    throw new Error(result.message || "Failed to hard delete workspaces");
                }

                enqueueSnackbar(`Successfully permanently deleted ${persistedWsIds.length} workspace(s)`, {
                    variant: "success",
                });

                // Mark opened tabs as hard deleted
                const updatedTabs = openTabs.map((tab: BaseTab) => {
                    if (tab.type === constants.vscode.tab.tabTypes.workspace && persistedWsIds.includes((tab.data as Ws).id)) {
                        const wsData = tab.data as Ws;
                        return { ...tab, data: { ...wsData, deletedAt: new Date(), isHardDeleted: true } };
                    }
                    return tab;
                });
                setOpenTabs(updatedTabs);

                // Reload workspaces from API
                await loadWorkspaces();
            }

            // Clear selection
            setRowSelection({});
        } catch (error) {
            console.error("Failed to hard delete workspaces:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to permanently delete workspaces: ${errorMessage}`, { variant: "error" });
            }
        }
    };

    // Handle context menu
    const openWsContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        let selectedIds: number[];
        let selectedWorkspaces: Ws[] = [];

        // If row provided (clicked on a row)
        if (row) {
            // If row is not selected, add it to current selection
            if (!row.getIsSelected()) {
                // Add this row to existing selection
                setRowSelection({ ...rowSelection, [row.id]: true });
                // Include this row in selectedIds along with existing selection
                selectedIds = [...Object.keys(rowSelection).map((id) => parseInt(id)), parseInt(row.id)];
            } else {
                // Row already selected, use current selection
                selectedIds = Object.keys(rowSelection).map((id) => parseInt(id));
            }

            selectedWorkspaces = [...workspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).filter((ws) => selectedIds.includes(ws.id));
        } else {
            // Clicked on empty area
            selectedIds = [];
        }
        showContextMenu(event, "workspace-grid", {
            selectedWorkspaces,
            selectedIds,
            onSoftDelete: () => __toggleSelectedWorkspaces(selectedIds, "soft-delete"),
            onHardDelete: () => __hardDeleteSelectedWorkspaces(selectedIds),
            onRestore: () => __toggleSelectedWorkspaces(selectedIds, "restore"),
            onAddWorkspace: __createNewWorkspace,
        });
    };
    // =============================================================================
    // =============================================================================

    // Load workspaces with filters from user state
    const loadWorkspaces = async () => {
        try {
            setIsLoading(true);
            const token = $user.userToken;

            // Get filters from user state
            const wsGridFilters = $user.filters?.wsGrid;

            // Parse date range filters
            const createdAtRange = filterUtils._parseDateRange(wsGridFilters?.createdAt);

            // Build filter params for API
            const filterParams = {
                statusCode: wsGridFilters?.statusCode,
                deletedAt: wsGridFilters?.deletedAt,
                createdAtFrom: createdAtRange.from,
                createdAtTo: createdAtRange.to,
            };

            const result = await wsService._getWs(token, filterParams);

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || "Failed to load workspaces");
            }

            // Transform dates from API strings to Date objects
            const transformedData = transformWsData(result.data || []);
            setWorkspaces(transformedData);
            setError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setError(new Error(errorMessage));

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return {
        openWsContextMenu,
        loadWorkspaces,
    };
};
