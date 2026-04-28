
import { useSnackbar } from "notistack";
import { useWsStore } from "@/features/workspace/store/ws/useWs.store";
import { wsService } from "@/features/workspace/service/ws.service";
import { useWsGridHelper } from "./useWsGrid.helper";
import { useAuthStore } from "@/shell/store/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/shell/types/tab.types";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import {Ws} from "../../types/workspace.types";
import {useEditorTabBarStore} from "@/shell/store/EditorTab.store";

export const useWsDetailHelper = () => {
    const { $user } = useAuthStore();
    const { setWsGridPagination } = useWsStore();
    const { loadWorkspaces } = useWsGridHelper();
    const _console = useConsoleHelper();
    const { setOpenTabs, activeTabId, openTabs } = useEditorTabBarStore();

    const handleWsFieldChange = (field: keyof Ws, value: any) => {
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t: BaseTab) => {
                if (t.id === activeTabId) {
                    const wsData = t.data as Ws;
                    return {
                        ...t,
                        data: { ...wsData, [field]: value },
                        hasUnsavedChanges: true,
                    };
                }
                return t;
            })
        );
    };

    /**
     * Save current workspace (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const upsertWorkspace = 
        async (tabId?: string): Promise<Ws | null> => {
            // Get workspace data from active tab
            const activeTab = openTabs.find((tab) => tab.id === (tabId || activeTabId));
            const selectedWs = activeTab?.data as Ws | undefined;

            if (!selectedWs) {
                console.warn("⚠️ No selected workspace to upsert");
                return null;
            }

            // ============================================================
            // Step 1.5: Validate name field
            // ============================================================
            if (!selectedWs.name || selectedWs.name.trim() === "") {
                _console.error("Workspace name is required");
                return null;
            }

            // ============================================================
            // Step 2: Determine operation mode (create/update/restore)
            // ============================================================
            const isCreateMode = selectedWs.id <= 0;
            const originalWs = activeTab?.data0 as Ws | undefined;
            const isRestoreMode = selectedWs.id > 0 && originalWs?.deletedAt && !selectedWs.deletedAt;
            const token = $user.userToken;

            try {
                // ============================================================
                // Step 3: Prepare upsert data
                // ============================================================
                const upsertData = {
                    id: isCreateMode ? 0 : selectedWs.id, // Always use 0 for create
                    name: selectedWs.name,
                    description: selectedWs.description,
                    statusCode: selectedWs.statusCode, // Include statusCode
                    tags: undefined, // Workspace tags support (not implemented yet)
                    userId: selectedWs.userId,
                    deletedAt: isRestoreMode ? null : undefined, // null = restore, undefined = don't touch
                };

                // ============================================================
                // Step 4: Call batch API to upsert workspace
                // ============================================================
                const result = await wsService._upsertWsBatch(token, [upsertData]);
                if (!result.success) {
                    throw new Error(result.message || "Failed to save workspace");
                }

                // ============================================================
                // Step 6: Extract and validate saved workspace from response
                // ============================================================
                const batchResult = result.object as any;
                const savedWs = batchResult?.workspaces?.[0];

                if (!savedWs) {
                    throw new Error("Failed to save workspace: No data returned from server");
                }

                // Transform DTO to domain model
                const transformedWs: Ws = {
                    id: savedWs.id,
                    name: savedWs.name,
                    description: savedWs.description,
                    statusCode: savedWs.statusCode,
                    hashtags: savedWs.hashtags,
                    createdAt: new Date(savedWs.createdAt),
                    updatedAt: savedWs.updatedAt ? new Date(savedWs.updatedAt) : null,
                    deletedAt: savedWs.deletedAt ? new Date(savedWs.deletedAt) : null,
                    userId: savedWs.userId,
                };

                // ============================================================
                // Step 10: Update tab data and data0 with server response
                // ============================================================
                _console.success(isCreateMode ? "Workspace created successfully" : "Workspace saved successfully");
                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) => {
                            if (tab.id === tabId) {
                                return {
                                    ...tab,
                                    title: transformedWs.name || "Unsaved Workspace",
                                    data: transformedWs,
                                    data0: transformedWs, // Update data0 to new saved state
                                };
                            }
                            return tab;
                        })
                    );
                }

                // Reload workspaces immediately to show the newly saved workspace
                await loadWorkspaces();

                return transformedWs;
            } catch (error) {
                console.error("❌ Failed to save workspace:", error);
                const errorMessage = await parseApiError(error);

                if (isUnauthorizedError(error)) {
                    _console.error("Unauthorized. Please login again.");
                } else {
                    _console.error(`Failed to save workspace: ${errorMessage}`);
                }
                return null;
            }
        }

    return {
        upsertWorkspace,
        handleWsFieldChange,
    };
};
