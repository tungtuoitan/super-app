/**
 * KWorkspace Operation Helper Hook
 * Handles loading workspaces and their tree data
 *
 * @pattern Functions only - State should be accessed directly from useKStore()
 * @returns {Object} KWorkspace operation functions only (no state)
 * @example
 * // Get state from store
 * const { allK, currentK } = useKStore();
 * // Get actions from helper
 * const { loadAllK, selectWorkspace } = useKLoader();
 */

import {useConsoleHelper} from "@/shell/hooks/useConsole.helper";
import {useAuthStore} from "@/shell/store/Auth.store";
import {useKMovingTreeStore} from "../../store/KMovingTree.store";
import {KService} from "../../service/K.service";
import {useKStore} from "../../store/K.store";
import {KTestService} from "../../service/kTest.service";
import {KItemV2} from "../../types/K-v2.types";
import {KDTO} from "../../types/K-dto.types";
import {KWsResponse} from "../../types/K.types";
import {ResultOptions} from "@/shared/types/resultOptions.types";


export const useKLoader = () => {
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { allK, setAllK, currentK, setSelectedKId, selectedKId, setCurrentK, isLoadingK, setIsLoadingK, isLoadingTree, setIsLoadingTree, setNodeScoreMap, setDailyReviewDueCount } = useKStore();
    const { setTargetWorkspaceId } = useKMovingTreeStore();

    /**
     * Load all user workspaces
     * Fetches ws and sets the first one as default
     */
    const loadAllK = async () => {
        try {
            setIsLoadingK(true);

            const token = $user.userToken;
            const data = await KService._getAllUserWorkspaces(token);

            setAllK(data);

            // Set default to first non-deleted workspace if available and no tree loaded
            if (data.length > 0 && !currentK) {
                const firstActive = data.find((k) => !k.deletedAt);
                if (!firstActive) return data;
                const defaultWorkspaceId = firstActive.id;
                setSelectedKId(defaultWorkspaceId);
                const nextTarget = data.find((k) => !k.deletedAt && k.id !== defaultWorkspaceId);
                if (nextTarget) {
                    setTargetWorkspaceId(nextTarget.id);
                }
                // Auto-load tree for default workspace
                // await loadTree(defaultWorkspaceId);
            }

            return data;
        } catch (error) {
            console.error("❌ Failed to load kworkspaces:", error);
            throw error;
        } finally {
            setIsLoadingK(false);
        }
    };

    /** Load global daily review due count (for ActivityBar badge) */
    const loadDailyReviewCount = async () => {
        try {
            const res = await KTestService._getGlobalDailyQueue();
            if (res.success && res.object) {
                const dueCount = res.object.filter(q => q.dueCount + q.newCount > 0).length;
                setDailyReviewDueCount(dueCount);
            }
        } catch { /* silent */ }
    };

    /**
     * Load tree data for a specific workspace
     * Sets as current tree
     *
     * ⚠️ PERFORMANCE NOTE - FILTERING MOVED TO FRONTEND:
     * Uses V2 API structure with full entity data (ALL items, no server filtering).
     * Frontend will filter by deletedAt, statusCode, and search text.
     *
     * User filter preferences are stored in $user.filters.workspace but NOT sent to backend.
     * Filtering happens in transformToTreeData() in Ktree.miniHelper.ts
     *
     * @param calculatedVirtualItems - Optional array of virtual items (ID < 0) to preserve in state
     * @param targetWorkspaceId - Optional workspace ID to load. If not provided, uses selectedKId
     * @returns The loaded workspace data
     */
    const loadTree = async (calculatedVirtualItems?: KItemV2[], targetWorkspaceId?: number): Promise<KDTO | undefined> => {
        const workspaceIdToLoad = targetWorkspaceId ?? selectedKId;

        if(workspaceIdToLoad == null){
            console.warn("workspaceId is null, cant load tree")
            return
        }

        try {
            setIsLoadingTree(true);

            const token = $user.userToken;

            // Fetch workspace tree with V2 structure (ALL items, no filtering)
            const result: ResultOptions<KDTO> = await KService._getWorkspaceTreeV2(token, workspaceIdToLoad);
            if(result && result.success){
                const freshData = result.object?.flatData ?? [];

                // Use functional form so we read the CURRENT state (avoids stale-closure race
                // where a concurrent loadTree() could preserve a virtual node that should be gone).
                setCurrentK(prev => {
                    const currentVirtualItems = (prev?.flatData ?? []).filter((item: KItemV2) => item?.id < 0);
                    // If caller passed an explicit list (even empty []) → use it (removes disposed virtuals).
                    // If caller passed nothing (undefined) → keep whatever virtual items are in current state.
                    const mergedVirtualItems = calculatedVirtualItems !== undefined
                        ? calculatedVirtualItems
                        : currentVirtualItems;

                    return {
                        ...result.object,
                        flatData: [...freshData, ...mergedVirtualItems],
                    } as KDTO;
                });

                // Return a snapshot for callers that need it (mergedVirtualItems resolved above,
                // so just return freshData; callers should prefer reading store state instead).
                return { ...result.object, flatData: freshData } as KDTO;
            }

        } catch (error) {
            throw error;
        } finally {
            setTimeout(() => {
                setIsLoadingTree(false)
            }, 100);
        }
    };



    const createKnowledge = async (data: { name: string; description?: string; imageBase64?: string }): Promise<KWsResponse | null> => {
        try {
            const token = $user.userToken;
            const result = await KService._createKnowledge(token, data);
            if (result?.success && result.object) {
                const created = result.object as KWsResponse;
                setAllK((prev) => [...prev, created]);
                return created;
            }
            return null;
        } catch (error) {
            console.error("❌ Failed to create knowledge:", error);
            return null;
        }
    };

    const updateKnowledge = async (id: number, data: { name: string; description?: string; imageBase64?: string }): Promise<boolean> => {
        try {
            const token = $user.userToken;
            const result = await KService._updateKnowledge(token, id, data);
            if (result?.success && result.object) {
                const updated = result.object;
                setAllK((prev) => prev.map((k) => (k.id === id ? { ...k, ...updated } : k)));
                return true;
            }
            return false;
        } catch (error) {
            console.error("❌ Failed to update knowledge:", error);
            return false;
        }
    };

    const softDeleteKnowledge = async (id: number): Promise<boolean> => {
        try {
            const token = $user.userToken;
            const result = await KService._softDeleteKnowledge(token, id);
            if (result?.success) {
                const now = new Date().toISOString();
                setAllK((prev) => prev.map((k) => (k.id === id ? { ...k, deletedAt: now } : k)));
                // If deleting the currently selected knowledge, deselect it
                if (selectedKId === id) {
                    const next = allK.find((k) => k.id !== id && !k.deletedAt);
                    setSelectedKId(next?.id ?? null);
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error("❌ Failed to soft-delete knowledge:", error);
            return false;
        }
    };

    /** Load per-question-node latest scores and store in nodeScoreMap */
    // const loadNodeScores = async (knowledgeId: number): Promise<void> => {
    //     try {
    //         const scores = await KTestService._getNodeScores(knowledgeId);
    //         setNodeScoreMap(scores ?? {});
    //     } catch {
    //         // non-critical — silently ignore
    //     }
    // };

    return {
        // Actions only - get state directly from useKStore()
        loadAllK,
        loadTree,
        createKnowledge,
        updateKnowledge,
        softDeleteKnowledge,
        loadDailyReviewCount,
        // loadNodeScores,
    };
};
