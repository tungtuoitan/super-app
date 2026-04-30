import { wsService, WsDTO } from "@/features/workspace/service/ws.service";
import { useWsDetailStore } from "@/features/workspace/store/ws/useWsDetail.store";
import { useEditorTabHelper } from "@/shell";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { constants } from "@/shared";
import { BaseTab } from "@/shell";
import { useAuthStore } from "@/shared";
import { parseApiError, isUnauthorizedError } from "@/shared";
import { useOrchestratorContextMenuHelper } from "@/shared";
import { filterUtils } from "@/shared";
import {useConsoleHelper} from "@/shared";
import {Ws} from "../../types/workspace.types";
import {useEditorTabBarStore} from "@/shell";
import {collectIdsFromTabs, generateTempId, generateUnsavedName} from "../../utils/temp-id.utils";

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

    const { workspaces, setWorkspaces, setWsGridIsLoading, setWsGridError, wsGridRowSelection, setWsGridRowSelection, wsGridPagination, setTotalCount } = useWsStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    const { openTab } = useEditorTabHelper();
    const { openTabs, setOpenTabs } = useEditorTabBarStore();
    const _console = useConsoleHelper();
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
            statusCode: constants.standardRegistryFE.activeStatus.active, // Default to active status
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
            userId: 0, // Temporary user ID
        };

        // Insert at the beginning of workspaces array
        setWorkspaces([newWorkspace, ...workspaces]);

        // Open workspace tab for editing
        openTab(newWorkspace, constants.vscode.tab.tabTypes.workspace);

        // Focus vào Workspace Name field sau khi tab mở
        setShouldFocusWsName(true);
    };

    /**
     * Toggle delete/restore for selected workspaces (soft delete)
     * - type = 'soft-delete': Set deletedAt timestamp (soft delete)
     * - type = 'restore': Clear deletedAt (restore)
     */
    const __deleteRestore_Wses = async (ids?: number[], type: "soft-delete" | "restore" = "soft-delete") => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(wsGridRowSelection).map((id) => parseInt(id));
        if (selectedIds.length === 0) return;

        // Separate temporary workspaces (negative IDs) from persisted workspaces (positive IDs)
        const tempWsIds = selectedIds.filter((id) => id < 0);
        const persistedWsIds = selectedIds.filter((id) => id > 0);

        try {
            const token = $user.userToken;

            // Handle temporary workspaces - only for delete (remove from grid locally)
            if (type === "soft-delete" && tempWsIds.length > 0) {
                setWorkspaces((prevWs) => prevWs.filter((ws) => !tempWsIds.includes(ws.id)));

                _console.success(`Removed ${tempWsIds.length} unsaved workspace(s)`);
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

                _console.success(`Successfully ${type === "soft-delete" ? "soft deleted" : "restored"} ${persistedWsIds.length} workspace(s)`);

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
            setWsGridRowSelection({});
        } catch (error) {
            console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} workspaces:`, error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to ${type === "soft-delete" ? "delete" : "restore"} workspaces: ${errorMessage}`);
            }
        }
    };

    /**
     * Permanently delete selected workspaces (hard delete)
     * Uses DELETE API to remove from database completely
     */
    const __hardDeleteSelectedWorkspaces = async (ids?: number[]) => {
        // Use provided ids or fall back to current selection
        const selectedIds = ids ?? Object.keys(wsGridRowSelection).map((id) => parseInt(id));
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

                _console.success(`Successfully permanently deleted ${persistedWsIds.length} workspace(s)`);

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
            setWsGridRowSelection({});
        } catch (error) {
            console.error("Failed to hard delete workspaces:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                _console.error("Unauthorized. Please login again.");
            } else {
                _console.error(`Failed to permanently delete workspaces: ${errorMessage}`);
            }
        }
    };

    // Handle context menu
    const openWsContextMenu = (event: React.MouseEvent, row?: any) => {
        event.preventDefault();
        event.stopPropagation();

        // Use current selection from store, or use hovered row if no selection
        let selectedIds = Object.keys(wsGridRowSelection).map((id) => parseInt(id));
        
        // If no selection and row provided, use the hovered row
        if (selectedIds.length === 0 && row) {
            selectedIds = [parseInt(row.id)];
        }

        const selectedWorkspaces = [...workspaces]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .filter((ws) => selectedIds.includes(ws.id));

        showContextMenu(event, "workspace-grid", {
            selectedWorkspaces,
            selectedIds,
            onSoftDelete: () => __deleteRestore_Wses(selectedIds, "soft-delete"),
            onHardDelete: () => __hardDeleteSelectedWorkspaces(selectedIds),
            onRestore: () => __deleteRestore_Wses(selectedIds, "restore"),
            onAddWorkspace: __createNewWorkspace,
        });
    };
    // =============================================================================
    // =============================================================================

    // Load workspaces with filters from user state
    const loadWorkspaces = async () => {
        try {
            setWsGridIsLoading(true);
            const token = $user.userToken;

            // Get filters from user state
            const wsGridFilters = $user.filters?.wsGrid;

            // Parse date range filters
            const createdAtRange = filterUtils._parseDateRange(wsGridFilters?.createdAt);

            // Build filter params for API (matching NoteGrid pattern)
            const filterParams = {
                searchQuery: undefined, // Can be added from GridControlStore if needed
                statusCode: wsGridFilters?.statusCode,
                deletedAt: wsGridFilters?.deletedAt,
                createdAtFrom: createdAtRange.from,
                createdAtTo: createdAtRange.to,
                page: wsGridPagination.pageIndex + 1,
                pageSize: wsGridPagination.pageSize,
            };

            const result = await wsService._getWs(token, filterParams);

            // Check API response success
            if (!result.success) {
                throw new Error(result.message || "Failed to load workspaces");
            }

            // Transform dates from API strings to Date objects
            const transformedData = transformWsData(result.data || []);
            setWorkspaces(transformedData);
            setTotalCount(result.totalCount || transformedData.length);
            setWsGridError(null);
        } catch (err) {
            const errorMessage = await parseApiError(err);
            setWsGridError(new Error(errorMessage));

            // Show snackbar for unauthorized errors
            if (isUnauthorizedError(err)) {
                _console.error("Unauthorized. Please login again.");
            }
        } finally {
            setWsGridIsLoading(false);
        }
    };

    return {
        openWsContextMenu,
        loadWorkspaces,
    };
};
