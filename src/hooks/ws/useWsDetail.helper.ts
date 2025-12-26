import { useCallback } from "react";
import { useSnackbar } from "notistack";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { useWsStore, Ws } from "@/store/ws/useWs.store";
import { wsService } from "@/services/ws.service";
import { useWsGridHelper } from "./useWsGrid.helper";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { BaseTab } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";

export const useWsDetailHelper = () => {
    const { $user } = useAuthStore();
    const { selectedWs } = useWsStore();
    const { originalWsRef } = useWsDetailStore();
    const { setSelectedWs } = useWsStore();
    const { loadWorkspaces } = useWsGridHelper();
    const { enqueueSnackbar } = useSnackbar();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();

    const handleWsFieldChange = (field: keyof Ws, value: any) => {
        setOpenTabs((prev: BaseTab[]) => prev.map((t: BaseTab) => (t.id === activeTabId ? { ...t, hasUnsavedChanges: true } : t)));

        if (!selectedWs) return;
        const updated = { ...selectedWs, [field]: value };
        setSelectedWs(updated);
    };

    /**
     * Save current workspace (create or update using Upsert pattern)
     * @param tabId - Current tab ID to update after save
     */
    const upsertWorkspace = useCallback(
        async (tabId?: string): Promise<Ws | null> => {
            if (!selectedWs) {
                console.warn("⚠️ No selected workspace to upsert");
                return null;
            }

            // ============================================================
            // Step 2: Determine operation mode (create/update/restore)
            // ============================================================
            const isCreateMode = selectedWs.id <= 0;
            const isRestoreMode = selectedWs.id > 0 && originalWsRef.current?.deletedAt && !selectedWs.deletedAt;
            const token = $user.userToken;

            try {
                // ============================================================
                // Step 3: Prepare upsert data
                // ============================================================
                const upsertData = {
                    id: isCreateMode ? 0 : selectedWs.id, // Always use 0 for create
                    name: selectedWs.name,
                    description: selectedWs.description,
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
                    createdAt: new Date(savedWs.createdAt),
                    updatedAt: savedWs.updatedAt ? new Date(savedWs.updatedAt) : null,
                    deletedAt: savedWs.deletedAt ? new Date(savedWs.deletedAt) : null,
                    userId: savedWs.userId,
                };

                // ============================================================
                // Step 10: Update selected workspace in store with server response
                // ============================================================
                enqueueSnackbar(isCreateMode ? "Workspace created successfully" : "Workspace saved successfully", { variant: "success" });
                setSelectedWs(transformedWs);
                if (tabId) {
                    setOpenTabs((prev) =>
                        prev.map((tab: BaseTab) => {
                            if (tab.id === tabId) {
                                return {
                                    ...tab,
                                    title: transformedWs.name || "Unsaved Workspace",
                                    data: transformedWs,
                                };
                            }
                            return tab;
                        }),
                    );
                }

                originalWsRef.current = { ...selectedWs };
                await loadWorkspaces();

                return transformedWs;
            } catch (error) {
                console.error("❌ Failed to save workspace:", error);
                const errorMessage = await parseApiError(error);

                if (isUnauthorizedError(error)) {
                    enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
                } else {
                    enqueueSnackbar(`Failed to save workspace: ${errorMessage}`, { variant: "error" });
                }
                return null;
            }
        },
        [selectedWs, loadWorkspaces],
    );

    return {
        upsertWorkspace,
        handleWsFieldChange,
    };
};
