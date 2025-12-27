/**
 * Editor Toolbar Helper
 * Orchestrates toolbar actions for different tab types (Note, Workspace, etc.)
 * Routes to appropriate service helpers based on active tab type
 */

import { useCallback } from "react";
import { useSnackbar } from "notistack";
import type { BaseTab } from "@/types/editor/tab.types";
import type { Note } from "@/types/note.types";
import { constants } from "@/utils/constants";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { useEditorTabsStore } from "@/store/index";
import { useEditorToolbarStore } from "@/store/editor/EditorToolbar.store";
import { storageService } from "@/services/storage.service";
import { wsService } from "@/services/ws.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { parseApiError, isUnauthorizedError } from "@/utils/api-error.utils";
import { useNoteGridHelper } from "../note/useNoteGrid.helper";
import { useWsGridHelper } from "../ws/useWsGrid.helper";
import { useWsDetailHelper } from "../ws/useWsDetail.helper";
import { Ws, useWsStore } from "@/store/ws/useWs.store";
import { useNoteDetailHelper } from "../note/useNoteDetail.helper";

export const useEditorToolbarHelper = () => {
    const { enqueueSnackbar } = useSnackbar();
    const { getActiveTab } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();

    // Get active tab
    const activeTab = getActiveTab();
    const { setOpenTabs, openTabs } = useEditorTabsStore();

    // Note-specific
    const { originalNoteRef } = useNoteDetailStore();
    const { upsertNote } = useNoteDetailHelper();

    // Workspace-specific
    const { selectedWs, setSelectedWs } = useWsStore();
    const { originalWsRef } = useWsDetailStore();
    const { upsertWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsGridHelper();

    // Get status text based on tab type and deletion state
    const _deleteStatusText = (() => {
        if (!activeTab) return "No Tab";

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            const noteData = activeTab.data as Note;
            return noteData?.deletedAt ? "Deleted" : "Existing";
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            return selectedWs?.deletedAt ? "Deleted" : "Existing";
        }

        return "Existing";
    })();

    // Get item ID based on tab type
    const _itemId = (() => {
        if (!activeTab) return null;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            const noteData = activeTab.data as Note;
            return noteData?.id || null;
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            return selectedWs?.id || null;
        }

        return null;
    })();

    // Handle Upsert - orchestrator for all entity types (create/update/soft delete/restore)
    const commonUpsert = useCallback(async () => {
        // =====================================
        // STEP 1: Validate Active Tab
        // =====================================
        if (!activeTab) return;

        // =====================================
        // STEP 2: Set Saving State
        // =====================================
        setIsSaving(true);

        try {
            // =====================================
            // STEP 3: Route to Appropriate Handler Based on Tab Type
            // =====================================
            switch (activeTab.type) {
                case constants.vscode.tab.tabTypes.note:
                    // =====================================
                    // NOTE HANDLER: Delegate to Note Upsert Logic
                    // =====================================
                    await upsertNote(activeTab.id);
                    break;

                case constants.vscode.tab.tabTypes.workspace:
                    // =====================================
                    // WORKSPACE HANDLER: Delegate to Workspace Upsert Logic
                    // =====================================
                    await upsertWorkspace(activeTab.id);
                    break;

                default:
                    console.warn(`Unsupported tab type: ${activeTab.type}`);
                    break;
            }
        } catch (error) {
            // =====================================
            // STEP 4: Handle Errors
            // =====================================
            console.error("Failed to save:", error);
            const errorMessage = await parseApiError(error);

            if (isUnauthorizedError(error)) {
                enqueueSnackbar("Unauthorized. Please login again.", { variant: "error" });
            } else {
                enqueueSnackbar(`Failed to save ${activeTab.type}: ${errorMessage}`, { variant: "error" });
            }
        } finally {
            // =====================================
            // STEP 5: Reset Saving State
            // =====================================
            setIsSaving(false);
        }
    }, [activeTab, upsertNote, upsertWorkspace, setIsSaving, enqueueSnackbar]);

    // Handle Cancel - routes to appropriate reset logic
    const commonCancel = useCallback(() => {
        if (!activeTab) return;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            if (originalNoteRef.current) {
                // Reset tab data to original
                setOpenTabs((prev) =>
                    prev.map((tab) => (tab.id === activeTab.id ? { ...tab, data: originalNoteRef.current as Note, hasUnsavedChanges: false } : tab))
                );
            }
            enqueueSnackbar("Changes discarded", { variant: "info" });
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            if (originalWsRef.current) {
                setSelectedWs({ ...originalWsRef.current });
            }
            enqueueSnackbar("Changes discarded", { variant: "info" });
        }
    }, [activeTab, originalNoteRef, originalWsRef, setOpenTabs, setSelectedWs, enqueueSnackbar]);

    return {
        commonUpsert,
        commonCancel,
        _deleteStatusText,
        _itemId,
    };
};
