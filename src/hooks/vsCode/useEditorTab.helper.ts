import { Note } from "@/types/note.types";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { BaseTab, TabType } from "@/types/editor/tab.types";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import { useWsDetailStore } from "@/store/ws/useWsDetail.store";
import { Ws } from "@/types/workspace.types";
import { useNavigationHistoryStore, HistoryEntry } from "@/store/editor/NavigationHistory.store";
import { useWorkspaceStore } from "@/store/index";
import { useGridControlStore } from "@/store/grid/useGridControl.store";
import { WorkspaceItemV2 } from "@/types/workspace-v2.types";

export const useEditorTabHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabsStore();
    const { setNotes } = useNoteGridStore();
    const { past, present, setPast, setPresent, future, setFuture } = useNavigationHistoryStore();
    const { currentWorkspace, setCurrentWorkspace, setSelectedItemIds, _treeRef } = useWorkspaceStore();
    const { moduleName } = useGridControlStore();
    const { isDragging, setLastSelectedItemId } = useWorkspaceStore();

    /**
     * Helper: Tìm workspace item ID dựa trên entity (note hoặc workspace)
     * @param entityType - 2 (folder), 3 (note), 4 (file)
     * @param entityId - ID của entity (note.id, workspace.id, file.id)
     * @returns workspace_items.id hoặc null nếu không tìm thấy
     */
    const findWorkspaceItemId = (entityType: 2 | 3 | 4, entityId: number): number | null => {
        if (!currentWorkspace?.flatData) {
            console.warn("⚠️ findWorkspaceItemId: No currentWorkspace or flatData");
            return null;
        }

        // Tìm trong flatData dựa trên entityType và entityId
        const item = currentWorkspace.flatData.find((item) => item.entityType === entityType && item.entityId === entityId);

        if (item) {
        } else {
            console.warn(`❌ Not found in workspace: entityType=${entityType}, entityId=${entityId}`);
        }

        return item?.id || null; // workspace_items.id
    };

    /**
     * Update active tab ID and handle tree selection
     * Data tracking is now done via tab.data vs tab.data0
     */
    const updateActiveTab = (newActiveTabId: string | null, tabs?: BaseTab[]) => {
        const tabsToSearch = tabs || openTabs;

        setNewTabAnd(newActiveTabId);

        if (newActiveTabId) {
            const activeTab = tabsToSearch.find((tab: BaseTab) => tab.id === newActiveTabId);

            if (activeTab?.type === constants.vscode.tab.tabTypes.note) {
                const noteData = activeTab.data as Note;

                // ⭐ Select item trong workspace tree nếu note này có trong workspace
                const workspaceItemId = findWorkspaceItemId(3, noteData.id); // 3 = note entity type
                if (workspaceItemId) {
                    setSelectedItemIds([workspaceItemId]);
                    // Scroll to item trong tree
                    if (_treeRef.current) {
                        // Expand parent folders TRƯỚC KHI get node (vì node chỉ exist khi được render)
                        _treeRef.current.openParents(workspaceItemId.toString());

                        // Scroll to node để đảm bảo nó visible
                        _treeRef.current.scrollTo(workspaceItemId.toString());

                        // Bây giờ get node sau khi parents đã expand
                        const node = _treeRef.current.get(workspaceItemId.toString());
                        if (node) {
                            // Use focus() to scroll the node into view (react-arborist API)
                            node.focus();
                        } else {
                            console.warn("⚠️ Node not found in tree after openParents:", workspaceItemId.toString());
                        }
                    } else {
                        console.warn("⚠️ Tree ref not available");
                    }
                }
            } else if (activeTab?.type === constants.vscode.tab.tabTypes.workspace) {
                const wsData = activeTab.data as Ws;

                // ⭐ Select workspace folder item trong tree (workspace type = folder type 2)
                const workspaceItemId = findWorkspaceItemId(2, wsData.id); // 2 = folder entity type
                if (workspaceItemId) {
                    setSelectedItemIds([workspaceItemId]);
                    // Scroll to item trong tree
                    if (_treeRef.current) {
                        // Expand parent folders TRƯỚC KHI get node (vì node chỉ exist khi được render)
                        _treeRef.current.openParents(workspaceItemId.toString());

                        // Scroll to node để đảm bảo nó visible
                        _treeRef.current.scrollTo(workspaceItemId.toString());

                        // Bây giờ get node sau khi parents đã expand
                        const node = _treeRef.current.get(workspaceItemId.toString());
                        if (node) {
                            // Use focus() to scroll the node into view (react-arborist API)
                            node.focus();
                        } else {
                            console.warn("⚠️ Node not found in tree after openParents:", workspaceItemId.toString());
                        }
                    } else {
                        console.warn("⚠️ Tree ref not available");
                    }
                }
            }
        }
    };
    // ================================================================
    // OPEN TAB - Generic handler for multiple tab types
    // ================================================================
    const openTab = (data: Note | Ws, tabType: string) => {
        // Auto-detect type based on data structure
        // Note has 'type' field (meeting, brainstorm, etc.), Workspace doesn't
        const type = tabType;

        // ===================================
        // 1. Check for existing tab
        // ===================================
        let existingTab: BaseTab | undefined;

        if (type === constants.vscode.tab.tabTypes.note) {
            const noteData = data as Note;
            existingTab = openTabs.find((tab: BaseTab) => tab.type === constants.vscode.tab.tabTypes.note && (tab.data as Note).id === noteData.id);
        } else if (type === constants.vscode.tab.tabTypes.workspace) {
            const wsData = data as Ws;
            existingTab = openTabs.find((tab: BaseTab) => tab.type === constants.vscode.tab.tabTypes.workspace && (tab.data as Ws).id === wsData.id);
        }
        // Add more tab types here in the future...

        // ===================================
        // 2. Activate existing or create new
        // ===================================
        if (existingTab) {
            // Tab already exists, just activate it
            updateActiveTab(existingTab.id);
        } else {
            // ===================================
            // 3. Create new tab based on type
            // ===================================
            let newTab: BaseTab;

            if (type === constants.vscode.tab.tabTypes.note) {
                const noteData = data as Note;
                newTab = {
                    id: `note-${noteData.id}-${Date.now()}`,
                    type: constants.vscode.tab.tabTypes.note,
                    data: noteData,
                    data0: noteData,
                    title: noteData.name || constants.vscode.tabTitles.unsavedNote,
                    hasUnsavedChanges: false,
                };
            } else if (type === constants.vscode.tab.tabTypes.workspace) {
                const wsData = data as Ws;
                newTab = {
                    id: `workspace-${wsData.id}-${Date.now()}`,
                    type: constants.vscode.tab.tabTypes.workspace,
                    data: wsData,
                    data0: wsData,
                    title: wsData.name || constants.vscode.tabTitles.unsavedWorkspace,
                    hasUnsavedChanges: false,
                };
            } else {
                // Fallback for unknown types (extend this later)
                newTab = {
                    id: `unknown-${Date.now()}`,
                    type: type as TabType,
                    data: data,
                    data0: data,
                    title: constants.vscode.tabTitles.unknownTab,
                    hasUnsavedChanges: false,
                };
            }

            // ===================================
            // 4. Add to tabs and activate
            // ===================================
            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            updateActiveTab(newTab.id, newTabs);
        }
    };

    // ================================================================
    // CLOSE TAB - Generic cleanup handler for multiple tab types
    // ================================================================
    const closeTab = (tabId: string, force = false) => {
        const tab = openTabs.find((t: BaseTab) => t.id === tabId);

        if (!tab) return;

        // ===================================
        // 1. Type-specific cleanup logic
        // ===================================
        if (tab.type === constants.vscode.tab.tabTypes.note) {
            // Cleanup for Note tabs
            const noteData = tab.data as Note;

            // Remove temporary notes (negative ID) from grid
            if (noteData.id < 0) {
                setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteData.id));
                if (moduleName === constants.modules.workspace) {
                    setCurrentWorkspace((prevWs) => {
                        if (!prevWs || !prevWs.flatData) return prevWs;
                        return {
                            ...prevWs,
                            flatData: prevWs.flatData.filter((item) => !(item.entityType === 3 && item.entityId === noteData.id)),
                        };
                    });
                }
            } else if (moduleName === constants.modules.workspace) {
                // For existing notes (positive ID) in workspace module,
                // remove the workspace item if closing without saving
                // This handles the case where user clicks "Don't Save" on the confirmation
                const workspaceItem = currentWorkspace?.flatData?.find((item) => item.entityType === 3 && item.entityId === noteData.id);

                // Only remove if the item itself is new (negative workspace_items.id)
                if (workspaceItem && workspaceItem.id < 0) {
                    setCurrentWorkspace((prevWs) => {
                        if (!prevWs || !prevWs.flatData) return prevWs;
                        return {
                            ...prevWs,
                            flatData: prevWs.flatData.filter((item) => item.id !== workspaceItem.id),
                        };
                    });
                }
            }

            // Additional note-specific cleanup can go here...
        } else if (tab.type === constants.vscode.tab.tabTypes.workspace) {
            // Cleanup for Workspace tabs
            const wsData = tab.data as Ws;

            // Remove temporary workspaces (negative ID) if needed
            if (wsData.id < 0) {
                // Add workspace cleanup logic here when needed
                // Example: setWorkspaces(prev => prev.filter(ws => ws.id !== wsData.id));
            }

            // Additional workspace-specific cleanup can go here...
        }
        // Add more tab type cleanup handlers here in the future...

        // ===================================
        // 2. Remove tab from list
        // ===================================
        const newTabs = openTabs.filter((t: BaseTab) => t.id !== tabId);
        setOpenTabs(newTabs);

        // ===================================
        // 3. Handle active tab switching
        // ===================================
        if (activeTabId === tabId) {
            if (newTabs.length > 0) {
                // Switch to the last tab
                updateActiveTab(newTabs[newTabs.length - 1].id, newTabs);
            } else {
                // No tabs left
                updateActiveTab(null, newTabs);
            }
        }
    };

    // ================================================================
    // CLOSE TABS - Close multiple tabs at once
    // ================================================================
    const closeTabs = (tabIds: string[]) => {
        if (tabIds.length === 0) return;

        const tabsToClose = openTabs.filter((t) => tabIds.includes(t.id));
        if (tabsToClose.length === 0) return;

        // ===================================
        // 1. Collect cleanup targets
        // ===================================
        const noteIdsToRemove = new Set<number>();
        const workspaceItemIdsToRemove = new Set<number>();

        tabsToClose.forEach((tab) => {
            if (tab.type === constants.vscode.tab.tabTypes.note) {
                const noteData = tab.data as Note;

                // Temporary notes
                if (noteData.id < 0) {
                    noteIdsToRemove.add(noteData.id);

                    if (moduleName === constants.modules.workspace) {
                        currentWorkspace?.flatData?.forEach((item) => {
                            if (item.entityType === 3 && item.entityId === noteData.id) {
                                workspaceItemIdsToRemove.add(item.id);
                            }
                        });
                    }
                }
                // Existing notes but new workspace items
                else if (moduleName === constants.modules.workspace) {
                    const workspaceItem = currentWorkspace?.flatData?.find((item) => item.entityType === 3 && item.entityId === noteData.id);

                    if (workspaceItem && workspaceItem.id < 0) {
                        workspaceItemIdsToRemove.add(workspaceItem.id);
                    }
                }
            }

            // Workspace tab cleanup (future)
            // else if (tab.type === constants.vscode.tab.tabTypes.workspace) {}
        });

        // ===================================
        // 2. Apply cleanup (setState ONCE)
        // ===================================
        if (noteIdsToRemove.size > 0) {
            setNotes((prev) => prev.filter((note) => !noteIdsToRemove.has(note.id)));
        }

        if (moduleName === constants.modules.workspace && workspaceItemIdsToRemove.size > 0) {
            setCurrentWorkspace((prevWs) => {
                if (!prevWs || !prevWs.flatData) return prevWs;

                return {
                    ...prevWs,
                    flatData: prevWs.flatData.filter((item) => !workspaceItemIdsToRemove.has(item.id)),
                };
            });
        }

        // ===================================
        // 3. Remove tabs
        // ===================================
        const newTabs = openTabs.filter((t) => !tabIds.includes(t.id));
        setOpenTabs(newTabs);

        // ===================================
        // 4. Active tab handling
        // ===================================
        if (activeTabId && tabIds.includes(activeTabId)) {
            updateActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null, newTabs);
        }
    };

    // ================================================================
    // CONVENIENCE METHODS - Specific tab type openers
    // ================================================================
    // const openNoteTab = (note: Note) => {
    //     openTab(note, constants.vscode.tab.tabTypes.note);
    // };

    // const openWorkspaceTab = (ws: Ws) => {
    //     openTab(ws, constants.vscode.tab.tabTypes.workspace);
    // };

    /**
     * Get the currently active tab or a specific tab by ID
     * @param tabId Optional tab ID to get specific tab
     * @returns The active/specific tab or null if not found
     */
    const getActiveTab = (tabId?: string): BaseTab | null => {
        if (tabId) {
            return openTabs.find((tab: BaseTab) => tab.id === tabId) || null;
        }
        if (!activeTabId) return null;
        return openTabs.find((tab: BaseTab) => tab.id === activeTabId) || null;
    };

    const setNewTabAnd = (newActiveTabId: string | null) => {
        setActiveTabId(newActiveTabId);
        const newTab = openTabs.find((tab: BaseTab) => tab.id === newActiveTabId);
        if (newTab && newTab.type === constants.vscode.tab.tabTypes.note) {
            const noteId = newTab.data.id;
            const item: WorkspaceItemV2 | undefined = currentWorkspace?.flatData.find((item) => item.entityType === 3 && item.entityId === noteId);
            if (item && item.id) {
                setSelectedItemIds([item.id]);
                setLastSelectedItemId(item.id);
            } else {
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
            }
        }
    };

    /**
     * Check if two history entries are duplicates (adjacent items that are "same")
     */
    const $areEntriesDuplicate = (entry1: HistoryEntry, entry2: HistoryEntry): boolean => {
        // Same item and same type
        return entry1.itemId === entry2.itemId && entry1.type === entry2.type;
    };

    /**
     * Remove duplicate adjacent entries from history array
     */
    const removeDuplicateAdjacentEntries = (entries: HistoryEntry[]): HistoryEntry[] => {
        if (entries.length === 0) return entries;

        const result: HistoryEntry[] = [entries[0]];

        for (let i = 1; i < entries.length; i++) {
            const prev = result[result.length - 1];
            const current = entries[i];

            // Only add if not duplicate of previous
            if (!$areEntriesDuplicate(prev, current)) {
                result.push(current);
            }
        }

        return result;
    };

    /**
     * Process tabs and navigation history after deleting notes
     * - Removes tabs with deleted noteIds
     * - Cleans navigation history (Past/Future)
     * - Removes duplicate adjacent entries
     * - Updates Present and activeTabId
     *
     * @param deletedNoteIds - Array of note IDs that were deleted
     */
    const processTabAfterDelete = (deletedIds: number[], type: string) => {
        // 1. Remove tabs with deleted noteIds
        const newTabs = openTabs.filter((tab) => !(tab.type === type && deletedIds.includes(tab.data.id)));
        setOpenTabs(newTabs);

        // 2. Clean navigation history - remove entries with deleted noteIds
        let cleanedPast = past.filter((entry) => !(entry.type === type && deletedIds.includes(parseInt(entry.itemId))));
        let cleanedFuture = future.filter((entry) => !(entry.type === type && deletedIds.includes(parseInt(entry.itemId))));

        // 3. Remove duplicate adjacent entries and filter out invalid itemIds (id <= 0)
        cleanedPast = removeDuplicateAdjacentEntries(cleanedPast).filter((entry) => {
            const itemIdNum = parseInt(entry.itemId);
            return !isNaN(itemIdNum) && itemIdNum > 0;
        });
        cleanedFuture = removeDuplicateAdjacentEntries(cleanedFuture).filter((entry) => {
            const itemIdNum = parseInt(entry.itemId);
            return !isNaN(itemIdNum) && itemIdNum > 0;
        });

        setPast(cleanedPast);
        setFuture(cleanedFuture);

        // 4. If present was deleted, set present to last item of past
        if (present && present.type === type && deletedIds.includes(parseInt(present.itemId))) {
            if (cleanedPast.length > 0) {
                // Set present to last item of past
                const newPresent = cleanedPast[cleanedPast.length - 1];
                setPresent(newPresent);
                setPast(cleanedPast.slice(0, -1)); // Remove last item from past

                // Set activeTabId to the new present's tab
                setNewTabAnd(`note-${newPresent.itemId}-${Date.now()}`);
            } else {
                // No past entries, clear present and active tab
                setPresent(null);
                setNewTabAnd(null);
            }
        }
    };

    return {
        openTab,
        // openNoteTab,
        // openWorkspaceTab,
        closeTab,
        closeTabs,
        getActiveTab,
        updateActiveTab,
        processTabAfterDelete,
        setNewTabAnd,
    };
};
