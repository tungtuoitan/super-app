/**
 * Open Tabs Sync Component
 * Handles localStorage persistence for open editor tabs
 * - Saves tabs to localStorage when they change
 * - Loads and restores tabs on mount or userId change
 * This component doesn't render anything, just side effects
 */

import { useEffect, useState } from "react";
import { useEditorTabsStore } from "@/store/index";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { useWsStore } from "@/store/ws/useWs.store";
import { useNavigationHistoryStore } from "@/store/editor/NavigationHistory.store";
import { BaseTab } from "@/types/editor/tab.types";
import { constants } from "@/utils/constants";
import { Note, NoteDTO } from "@/types/note.types";
import { Ws } from "@/types/workspace.types";
import { noteService } from "@/services/note.service";
import { wsService, WsDTO } from "@/services/ws.service";
import { transformNotes } from "@/utils/note.utils";
import { transformWs } from "@/utils/ws.utils";
import {useEditorTabHelper} from "@/hooks/index";

// Storage types
export interface TabStorage {
    tabId: string;
    type: string; 
    dataId: number;
    index: number;
}

export interface OpenTabsStorage {
    tabs: TabStorage[];
}

// Helper to get storage key for user
export const getStorageKey = (userId: number | null | undefined): string | null => {
    if (!userId) return null;
    return `opentabs_${userId}`;
};

export const OpenTabsSync = () => {
    const { openTabs, setOpenTabs, setActiveTabId, isLoadingTabs, setIsLoadingTabs } = useEditorTabsStore();
    const { $user } = useAuthStore();
    const { notes } = useNoteGridStore();
    const { workspaces } = useWsStore();
    const { present } = useNavigationHistoryStore();
    const { setNewTabAnd } = useEditorTabHelper();

    // Load tabs from localStorage on mount or userId change
    useEffect(() => {
        const restoreTabs = async () => {
            if(!$user.userId) return;
            const storageKey = getStorageKey($user.userId);
            if (!storageKey) {
                setOpenTabs([]);
                setNewTabAnd(null);
                return;
            }

            setIsLoadingTabs(true);

            try {
                const stored = localStorage.getItem(storageKey);
                if (!stored) {
                    setIsLoadingTabs(false);
                    return;
                }

                const data: OpenTabsStorage = JSON.parse(stored);
                if (!data.tabs || data.tabs.length === 0) {
                    setIsLoadingTabs(false);
                    return;
                }

                // Sort by index to restore correct order
                const sortedTabs = [...data.tabs].sort((a, b) => a.index - b.index);

                // Separate by type
                const noteTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.note);
                const wsTabs = sortedTabs.filter((t) => t.type === constants.vscode.tab.tabTypes.workspace);

                // Collect missing IDs
                const missingNoteIds: number[] = [];
                const missingWsIds: number[] = [];

                // Check which notes are missing from grid
                for (const tab of noteTabs) {
                    const existsInGrid = notes.find((n) => n.id === tab.dataId);
                    if (!existsInGrid) {
                        missingNoteIds.push(tab.dataId);
                    }
                }

                // Check which workspaces are missing from grid
                for (const tab of wsTabs) {
                    const existsInGrid = workspaces.find((w) => w.id === tab.dataId);
                    if (!existsInGrid) {
                        missingWsIds.push(tab.dataId);
                    }
                }

                // Fetch missing data from API using services
                let fetchedNotes: Note[] = [];
                let fetchedWs: Ws[] = [];

                if (!$user.userToken) {
                    console.error("No auth token found");
                    setIsLoadingTabs(false);
                    return;
                }

                if (missingNoteIds.length > 0) {
                    const idsString = missingNoteIds.join(",");
                    try {
                        const result = await noteService._getNotes($user.userToken, { ids: idsString });
                        if (result.success && result.data) {
                            // Convert DTOs to domain models
                            fetchedNotes = transformNotes(result.data as NoteDTO[]);
                        }
                    } catch (error) {
                        console.error("Failed to fetch notes by ids:", error);
                    }
                }

                if (missingWsIds.length > 0) {
                    const idsString = missingWsIds.join(",");
                    try {
                        const result = await wsService._getWs($user.userToken, { ids: idsString });
                        if (result.success && result.data) {
                            // Convert DTOs to domain models
                            fetchedWs = transformWs(result.data as WsDTO[]);
                        }
                    } catch (error) {
                        console.error("Failed to fetch workspaces by ids:", error);
                    }
                }

                // Now restore tabs with all data available
                const restoredTabs: BaseTab[] = [];

                for (const tabStorage of sortedTabs) {
                    if (tabStorage.type === constants.vscode.tab.tabTypes.note) {
                        // Try grid first, then fetched data
                        let noteData = notes.find((n) => n.id === tabStorage.dataId);
                        if (!noteData) {
                            noteData = fetchedNotes.find((n) => n.id === tabStorage.dataId);
                        }

                        if (noteData) {
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.note,
                                data: noteData,
                                data0: noteData,
                                title: noteData.name || constants.vscode.tabTitles.unsavedNote,
                                hasUnsavedChanges: false,
                            });
                        }
                    } else if (tabStorage.type === constants.vscode.tab.tabTypes.workspace) {
                        // Try grid first, then fetched data
                        let wsData = workspaces.find((w) => w.id === tabStorage.dataId);
                        if (!wsData) {
                            wsData = fetchedWs.find((w) => w.id === tabStorage.dataId);
                        }

                        if (wsData) {
                            restoredTabs.push({
                                id: tabStorage.tabId,
                                type: constants.vscode.tab.tabTypes.workspace,
                                data: wsData,
                                data0: wsData,
                                title: wsData.name || constants.vscode.tabTitles.unsavedWorkspace,
                                hasUnsavedChanges: false,
                            });
                        }
                    }
                }

                // Set restored tabs
                setOpenTabs(restoredTabs);

                // Set active tab based on Present in navigation history
                if (present) {
                    // HistoryEntry tracks different types, so match by type and itemId
                    const matchingTab = restoredTabs.find((tab) => {
                        if (tab.type === constants.vscode.tab.tabTypes.note && present.type === 'note') {
                            return (tab.data as Note).id === parseInt(present.itemId);
                        } else if (tab.type === constants.vscode.tab.tabTypes.workspace && present.type === 'workspace') {
                            return (tab.data as Ws).id === parseInt(present.itemId);
                        }
                        return false;
                    });

                    if (matchingTab) {
                        setNewTabAnd(matchingTab.id);
                    } else if (restoredTabs.length > 0) {
                        // Fallback to last tab
                        setNewTabAnd(restoredTabs[restoredTabs.length - 1].id);
                    }
                } else if (restoredTabs.length > 0) {
                    // No history, just activate last tab
                    setNewTabAnd(restoredTabs[restoredTabs.length - 1].id);
                }
            } catch (error) {
                console.error("Failed to restore tabs from localStorage:", error);
                setOpenTabs([]);
                setNewTabAnd(null);
            } finally {
                setIsLoadingTabs(false);
            }
        };

        restoreTabs();
    }, [$user.userId, setOpenTabs, setActiveTabId, setIsLoadingTabs]);

    // Save tabs to localStorage whenever they change
    useEffect(() => {
        const storageKey = getStorageKey($user.userId);
        if (!storageKey || openTabs.length === 0 || isLoadingTabs) return;

        try {
            const tabsToSave: TabStorage[] = openTabs.map((tab, index) => {
                let dataId: number = 0;

                if (tab.type === constants.vscode.tab.tabTypes.note) {
                    dataId = (tab.data as Note).id;
                } else if (tab.type === constants.vscode.tab.tabTypes.workspace) {
                    dataId = (tab.data as Ws).id;
                }

                return {
                    tabId: tab.id,
                    type: tab.type,
                    dataId: dataId,
                    index: index,
                };
            });

            const data: OpenTabsStorage = {
                tabs: tabsToSave,
            };

            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save tabs to localStorage:", error);
        }
    }, [openTabs, $user.userId, isLoadingTabs]);

    // This component doesn't render anything
    return null;
};
