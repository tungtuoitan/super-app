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
import { useWsHelper } from "../ws/useWs.helper";
import { useWsDetailHelper } from "../ws/useWsDetail.helper";
import { Ws } from "@/store/ws/useWs.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { useNoteDetailHelper } from "../note/useNoteDetail.helper";

export const useEditorToolbarHelper = () => {
    const { auth } = useAuthStore();
    const { enqueueSnackbar } = useSnackbar();
    const { activeTabId } = useEditorTabsStore();
    const { getTabById } = useEditorTabHelper();
    const { isSaving, setIsSaving } = useEditorToolbarStore();

    // Get active tab
    const activeTab = activeTabId ? getTabById(activeTabId) : null;
    const { setOpenTabs, openTabs } = useEditorTabsStore();

    // Note-specific
    const { selectedNote, setSelectedNote } = useNoteGridStore();
    const { originalNoteRef } = useNoteDetailStore();

    const { upsertNote } = useNoteDetailHelper();

    // Workspace-specific
    const { selectedWorkspace, wsHasChanges, setSelectedWorkspace } = useWsDetailStore();
    const { resetWorkspace } = useWsDetailHelper();
    const { loadWorkspaces } = useWsHelper();

    // Get status text based on tab type and deletion state
    const _statusText = (() => {
        if (!activeTab) return "No Tab";

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            return selectedNote?.deletedAt ? "InActive" : "Active";
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            return selectedWorkspace?.deletedAt ? "InActive" : "Active";
        }

        return "Active";
    })();

    // Get item ID based on tab type
    const _itemId = (() => {
        if (!activeTab) return null;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            return selectedNote?.id || null;
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            return selectedWorkspace?.id || null;
        }

        return null;
    })();

    // Handle Upsert - orchestrator for all entity types (create/update/soft delete/restore)
    const handleUpsert = useCallback(async () => {
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
                    // WORKSPACE HANDLER: Multi-Step Save Process
                    // =====================================

                    // Step 3.1: Validate Selected Workspace
                    if (!selectedWorkspace) return;

                    // Step 3.2: Prepare API Request
                    const token = auth.userToken;
                    const payload = [
                        {
                            id: selectedWorkspace.id > 0 ? selectedWorkspace.id : null,
                            name: selectedWorkspace.name,
                            description: selectedWorkspace.description,
                            userId: selectedWorkspace.userId,
                        },
                    ];

                    // Step 3.3: Call Batch Upsert API
                    const result = await wsService._upsertWsBatch(token, payload);

                    // Step 3.4: Validate API Response
                    if (!result.success) {
                        throw new Error(result.message || "Failed to save workspace");
                    }

                    // Step 3.5: Extract Saved Workspace from Response
                    const batchResult = result.object as any;
                    const savedWorkspace = batchResult?.Workspaces?.[0];

                    if (savedWorkspace) {
                        // Step 3.6: Transform API Response to Domain Model
                        const updatedWorkspace: Ws = {
                            id: savedWorkspace.id,
                            name: savedWorkspace.name,
                            description: savedWorkspace.description,
                            createdAt: new Date(savedWorkspace.createdAt),
                            updatedAt: savedWorkspace.updatedAt ? new Date(savedWorkspace.updatedAt) : null,
                            deletedAt: savedWorkspace.deletedAt ? new Date(savedWorkspace.deletedAt) : null,
                            userId: savedWorkspace.userId,
                        };

                        // Step 3.7: Update Active Tab with Saved Data
                        setOpenTabs((prev: BaseTab[]) => {
                            const updatedTabs = prev.map((t) => {
                                const isCurrentTab = t.id === activeTab.id && t.data.id === activeTab.data.id && t.type === constants.vscode.tab.tabTypes.workspace;

                                if (isCurrentTab) {
                                    return {
                                        ...t,
                                        data: updatedWorkspace,
                                        title: updatedWorkspace.name,
                                        hasUnsavedChanges: false,
                                    };
                                }

                                return t;
                            });

                            return updatedTabs;
                        });

                        // Step 3.8: Sync Selected Workspace State
                        setSelectedWorkspace(updatedWorkspace);

                        // Step 3.9: Reload Workspace List
                        await loadWorkspaces();

                        // Step 3.10: Show Success Notification
                        enqueueSnackbar("Workspace saved successfully", { variant: "success" });
                    }
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
    }, [activeTab, selectedNote, selectedWorkspace, upsertNote, setIsSaving, setOpenTabs, setSelectedWorkspace, loadWorkspaces, enqueueSnackbar, auth.userToken]);

    // Handle Cancel - routes to appropriate reset logic
    const handleCancel = useCallback(() => {
        if (!activeTab) return;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            if (originalNoteRef.current) {
                setSelectedNote({ ...originalNoteRef.current });
            }
            enqueueSnackbar("Changes discarded", { variant: "info" });
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            resetWorkspace();
        }
    }, [activeTab, originalNoteRef, setSelectedNote, enqueueSnackbar, resetWorkspace]);

    return {
        handleUpsert,
        handleCancel,
        _statusText,
        _itemId,
    };
};
