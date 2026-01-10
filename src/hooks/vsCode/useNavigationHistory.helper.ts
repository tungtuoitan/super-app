/**
 * Navigation History Helper
 * Pure business logic functions for tracking navigation and restoring positions
 * - Tracks tab switches and field focus
 * - Captures scroll and cursor positions
 * - Restores positions when navigating back/forward
 * - Reopens closed tabs if needed
 * Note: localStorage persistence handled in component level
 */

import { useEffect, useRef } from "react";
import { useNavigationHistoryStore, ScrollPosition, CursorPosition, HistoryEntry, MdPos, MdScrollPos } from "@/store/editor/NavigationHistory.store";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { useNoteDetailStore } from "@/store/note/useNoteDetail.store";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useNoteGridStore } from "@/store/note/useNoteGrid.store";
import { useWsStore } from "@/store/ws/useWs.store";
import { Note, NoteDTO } from "@/types/note.types";
import { BaseTab } from "@/types/editor/tab.types";
import { constants } from "@/utils/index";
import { useEditorTabHelper } from "./useEditorTab.helper";
import { noteService } from "@/services/note.service";
import { wsService, WsDTO } from "@/services/ws.service";
import { transformNotes } from "@/utils/note.utils";
import { transformWs } from "@/utils/ws.utils";
import type * as _monaco from "monaco-editor";

export const STORAGE_KEY_PREFIX = "navigation_history_";
export const MAX_PAST_SIZE = 200; // Limit for Past stack
export const SCROLL_DISTANCE_THRESHOLD = 100; // px - minimum scroll distance to consider "different position"
export const EDITOR_LINE_DISTANCE_THRESHOLD = 5; // lines - minimum line distance for editor position changes (VS Code behavior)
export const MD_SCROLL_DISTANCE_THRESHOLD = 50; // px - minimum Monaco scroll distance to consider "different position"

/**
 * Map of tab types to their scroll element IDs
 * Add new types here as needed
 */
const SCROLL_ELEMENT_MAP: Record<string, string> = {
    note: "noteEditorContent",
    workspace: "workspaceEditorContent",
    file: "fileEditorContent",
    // Add more types as needed
};

/**
 * localStorage data structure - Past/Present/Future model
 */
export interface HistoryStorage {
    past: HistoryEntry[];
    present: HistoryEntry | null;
    future: HistoryEntry[];
}

/**
 * Utility: Get storage key for user
 */
export const getStorageKey = (userId: number | null): string | null => {
    if (!userId) return null;
    return `${STORAGE_KEY_PREFIX}${userId}`;
};

export const useNavigationHistoryHelper = () => {
    const { past, setPast, present, setPresent, future, setFuture } = useNavigationHistoryStore();
    const { openTabs, activeTabId, setActiveTabId, setOpenTabs, editorAreaRef } = useEditorTabsStore();
    const { editorRef } = useNoteDetailStore();
    const { getActiveTab } = useEditorTabHelper();
    const { setNewTabAnd } = useEditorTabHelper();
    const { $user } = useAuthStore();
    const { notes } = useNoteGridStore();
    const { workspaces } = useWsStore();

    // Track if we're currently navigating (to prevent tracking during restore)
    const isNavigatingRef = useRef(false);

    // Track pending present update to avoid race conditions
    // When setPresent is called, present doesn't update immediately (React async state)
    // This ref tracks the latest value we're trying to set
    const pendingPresentRef = useRef<HistoryEntry | null>(null);

    // Sync pendingPresentRef with present whenever present changes
    useEffect(() => {
        if (present) {
            pendingPresentRef.current = present;
        }
    }, [present]);

    /**
     * Capture current scroll positions from DOM
     * @param type - Tab type (note, workspace, file, etc.)
     */
    const captureScrollPositions = (type: string): ScrollPosition[] => {
        const positions: ScrollPosition[] = [];

        // Get scroll element ID based on type
        const scrollElementId = SCROLL_ELEMENT_MAP[type];
        if (scrollElementId) {
            const editorContent = document.getElementById(scrollElementId);
            if (editorContent) {
                positions.push({
                    elementId: scrollElementId,
                    scrollTop: editorContent.scrollTop,
                    scrollLeft: editorContent.scrollLeft,
                });
            }
        }

        // Add more elements as needed (e.g., sidebar, grids)
        // const sidebar = document.getElementById("workspace-tree");
        // if (sidebar) { ... }

        return positions;
    };

    /**
     * Capture current cursor position from active field
     */
    // const captureCursorPosition = (fieldId?: string): CursorPosition | undefined => {
    //     if (!fieldId) return undefined;

    //     const activeElement = document.activeElement;
    //     if (activeElement && (activeElement instanceof HTMLTextAreaElement || activeElement instanceof HTMLInputElement)) {
    //         return {
    //             fieldId,
    //             selectionStart: activeElement.selectionStart || 0,
    //             selectionEnd: activeElement.selectionEnd || 0,
    //         };
    //     }

    //     return undefined;
    // };

    /**
     * Capture current cursor position from Monaco Editor
     * @param editor - Monaco editor instance
     * @returns MdPos or undefined if editor not available
     */
    const captureEditorPosition = (editor: _monaco.editor.IStandaloneCodeEditor | null): MdPos | undefined => {
        if (!editor || (editor as any)._isDisposed) return undefined;

        try {
            const position = editor.getPosition();
            if (!position) return undefined;

            return {
                lineNumber: position.lineNumber,
                column: position.column,
            };
        } catch (error) {
            console.warn("[Navigation] Failed to capture editor position:", error);
            return undefined;
        }
    };

    /**
     * Capture current scroll position from Monaco Editor
     * @param editor - Monaco editor instance
     * @returns MdScrollPos or undefined if editor not available
     */
    const captureEditorScrollPosition = (editor: _monaco.editor.IStandaloneCodeEditor | null): MdScrollPos | undefined => {
        if (!editor || (editor as any)._isDisposed) return undefined;

        try {
            const scrollTop = editor.getScrollTop();
            const scrollLeft = editor.getScrollLeft();

            return {
                scrollTop,
                scrollLeft,
            };
        } catch (error) {
            console.warn("[Navigation] Failed to capture editor scroll position:", error);
            return undefined;
        }
    };

    /**
     * Restore cursor position in Monaco Editor
     * @param editor - Monaco editor instance
     * @param position - Position to restore
     * @param scrollPosition - Scroll position to restore (optional, for precise control)
     */
    const restoreEditorPosition = (
        editor: _monaco.editor.IStandaloneCodeEditor | null,
        position?: MdPos,
        scrollPosition?: MdScrollPos
    ) => {
        if (!editor || (editor as any)._isDisposed) return;

        try {
            // Restore scroll position first (if provided, for exact scroll)
            if (scrollPosition) {
                editor.setScrollPosition({
                    scrollTop: scrollPosition.scrollTop,
                    scrollLeft: scrollPosition.scrollLeft,
                });
            }

            // Then restore cursor position
            if (position) {
                editor.setPosition(position);
                // console.log("[Navigation] Restored editor position to:", position);

                // Focus editor to show cursor
                editor.focus();

                // If no scroll position provided, reveal cursor in center
                if (!scrollPosition) {
                    editor.revealPositionInCenter(position, 0);
                }
            }
        } catch (error) {
            console.warn("[Navigation] Failed to restore editor position:", error);
        }
    };

    /**
     * Check if two entries are "significantly different"
     * Returns true if they should be considered different items in history
     *
     * Criteria for "significantly different":
     * 1. Khác itemId hoặc type → different (khác entity)
     * 2. Cùng itemId + type = note: check lineNumber
     *    - Khác lineNumber (>EDITOR_LINE_DISTANCE_THRESHOLD) → different
     * 3. Otherwise → same (skip push)
     */
    const areEntriesSignificantlyDifferent = (entry1: HistoryEntry, entry2: HistoryEntry): boolean => {
        // 1. Khác itemId hoặc type → different (khác entity)
        if (entry1.itemId !== entry2.itemId || entry1.type !== entry2.type) {
            return true;
        }

        // 2. Cùng entity (itemId + type), type = note: check line distance
        if (entry1.type === 'note' && entry2.type === 'note') {
            const pos1 = entry1.mdPos;
            const pos2 = entry2.mdPos;

            if (pos1 && pos2) {
                const lineDistance = Math.abs(pos1.lineNumber - pos2.lineNumber);

                // Khác lineNumber (>EDITOR_LINE_DISTANCE_THRESHOLD) → different
                if (lineDistance > EDITOR_LINE_DISTANCE_THRESHOLD) {
                    return true;
                }
            }

            // Same line number → same (skip)
            return false;
        }

        // 3. Cùng entity, other types → same (skip)
        return false;
    };

    /**
     * Push new entry to history (User navigates to new location)
     * Logic:
     * 1. Validate new entry vs Present (skip if not significantly different)
     * 2. Present → Push to Past (end of array)
     * 3. New entry → Becomes Present
     * 4. Future → Clear completely
     * 5. Limit Past to MAX_PAST_SIZE (trim oldest)
     */
    const pushHistory = (entry: Omit<HistoryEntry, "timestamp">) => {

        const newEntry: HistoryEntry = {
            ...entry,
            mdPos: {
                lineNumber: entry.mdPos?.lineNumber ?? 1,
                column: entry.mdPos?.column ?? 1000,
            },
            timestamp: Date.now(),
        };

        // CRITICAL: Use pendingPresentRef instead of present to avoid race conditions
        // present doesn't update immediately after setPresent (React async state)
        const currentPresent = pendingPresentRef.current;

        // console.log("comparing present vs newEntry:", currentPresent, newEntry);

        // If no Present, just set it
        if (!currentPresent) {
            setPresent(newEntry);
            pendingPresentRef.current = newEntry;
            // console.log("new present:", newEntry);
            return;
        }


        // Special case: Same tab/item/type, but position data just became available
        // This happens when TrackTabNavigation tracks before editor mounts, then MarkdownEditorNavigationTracker tracks after mount
        // if (currentPresent.tabId === newEntry.tabId &&
        //     currentPresent.itemId === newEntry.itemId &&
        //     currentPresent.type === newEntry.type &&
        //     currentPresent.type === 'note') {

        //     const presentHasNoPosition = !currentPresent.mdPos && !currentPresent.mdScrollPos;
        //     const newEntryHasPosition = newEntry.mdPos || newEntry.mdScrollPos;

        //     if (presentHasNoPosition && newEntryHasPosition) {
        //         // Update present with position data
        //         setPresent(newEntry);
        //         pendingPresentRef.current = newEntry;
        //         console.log("[Navigation] Updated present with position data:", newEntry);
        //         return;
        //     }
        // }

        // Validate: Check if new entry is significantly different from Present
        if (!areEntriesSignificantlyDifferent(currentPresent, newEntry)) {
            // Not significantly different → just update Present timestamp
            // setPresent({ ...newEntry });
            // console.log("no diff, skipping push");
            return;
        }

        // Significantly different → push to history

        // 2. Move Present to Past (if exists)
        setPast((prevPast) => {
            let newPast = [...prevPast, currentPresent];
            // 5. Limit Past size - remove oldest entries
            if (newPast.length > MAX_PAST_SIZE) {
                newPast = newPast.slice(newPast.length - MAX_PAST_SIZE);
            }
            return newPast;
        });

        // 3. New entry becomes Present
        setPresent({...newEntry});
        pendingPresentRef.current = newEntry;
        // console.log("new present:", newEntry);

        // 4. Clear Future
        setFuture([]);
    };

    /**
     * Track current location - call this when switching tabs or focusing fields
     * Generic for all tab types (note, workspace, file, etc.)
     * @param options - Optional tracking options
     */
    const trackNavigation = (options?: {
        focusedFieldId?: string;
        mdPos?: MdPos;
        mdScrollPos?: MdScrollPos;
    }) => {
        // Don't track if we're currently navigating back/forward
        if (isNavigatingRef.current) {
            // console.log("skipping tracking");
            return;
        }

        // Get active tab
        const activeTab = getActiveTab();
        if (!activeTabId || !activeTab) return;

        // Extract item data based on tab type
        let itemId: number | undefined;
        let tabType: string | undefined;

        if (activeTab.type === constants.vscode.tab.tabTypes.note) {
            const noteData = activeTab.data as Note;
            itemId = noteData.id;
            tabType = 'note';
        } else if (activeTab.type === constants.vscode.tab.tabTypes.workspace) {
            const wsData = activeTab.data as any; // Use Ws type when available
            itemId = wsData.id;
            tabType = 'workspace';
        }
        // Add more tab types here as needed (file, folder, etc.)

        // Validate item data
        if (!itemId || !tabType) return;

        // Don't track temporary items (id < 0)
        // if (itemId < 0) return;

        const scrollPositions = captureScrollPositions(tabType);
        // const cursorPosition = captureCursorPosition(options?.focusedFieldId);
        // console.log("[Navigation] Tracking navigation:", {
        //     tabName: activeTab.title,
        //     scrollPositions,
        //     mdPos: options?.mdPos?.lineNumber,
        // })

        pushHistory({
            type: tabType,
            itemId: itemId.toString(),
            scrollPositions,
            // cursorPosition,
            // focusedFieldId: options?.focusedFieldId,
            mdPos: options?.mdPos,
            mdScrollPos: options?.mdScrollPos,
        });
    };

    /**
     * Restore scroll positions to DOM
     */
    const restoreScrollPositions = (scrollPositions?: ScrollPosition[]) => {
        if (!scrollPositions) return;

        scrollPositions.forEach((pos) => {
            const element = document.getElementById(pos.elementId);
            if (element) {
                element.scrollTop = pos.scrollTop;
                element.scrollLeft = pos.scrollLeft;
            }
        });
    };

    /**
     * Focus field by ID using editorAreaRef
     */
    // const focusFieldById = (fieldId: string) => {
    //     if (!editorAreaRef?.current) {
    //         console.warn("editorAreaRef not available");
    //         return;
    //     }

    //     const field = editorAreaRef.current.querySelector(`#${fieldId}`) as HTMLElement;
    //     if (field) {
    //         field.focus();
    //         // Move cursor to end of text
    //         if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
    //             const textLength = field.value.length;
    //             field.setSelectionRange(textLength, textLength);
    //         }
    //     }
    // };

    /**
     * Navigate to a specific history entry
     * - Opens tab if closed (fetching data from API if needed)
     * - Switches to tab
     * - Restores positions
     */
    const navigateToEntry = async (entry: HistoryEntry | null) => {
        if (!entry) return;

        // Validate itemId - don't navigate to invalid/temporary items
        const itemIdNum = parseInt(entry.itemId);
        if (isNaN(itemIdNum) || itemIdNum <= 0) {
            console.warn('Invalid itemId in history entry:', entry);
            isNavigatingRef.current = false;
            return;
        }

        isNavigatingRef.current = true;

        // Check if tab exists by entity id (not tabId)
        let existingTab: BaseTab | undefined;
        if (entry.type === 'note') {
            existingTab = openTabs.find(tab =>
                tab.type === constants.vscode.tab.tabTypes.note &&
                (tab.data as Note).id === itemIdNum
            );
        } else if (entry.type === 'workspace') {
            existingTab = openTabs.find(tab =>
                tab.type === constants.vscode.tab.tabTypes.workspace &&
                (tab.data as any).id === itemIdNum
            );
        }

        if (existingTab) {
            // Tab exists - just switch to it
            setNewTabAnd(existingTab.id);
        } else {
            // Tab doesn't exist - need to reopen it based on type
            let newTab: BaseTab | null = null;

            if (entry.type === 'note') {
                // Try to find in grid first
                let noteData = notes.find((n) => n.id === itemIdNum);

                // If not in grid, fetch from API (similar to OpenTabsSync.tsx)
                if (!noteData) {
                    if (!$user.userToken) {
                        console.error("[Navigation] No auth token found");
                        isNavigatingRef.current = false;
                        return;
                    }

                    try {
                        const result = await noteService._getNotes($user.userToken, { ids: itemIdNum.toString() });
                        if (result.success && result.data && result.data.length > 0) {
                            const fetchedNotes = transformNotes(result.data as NoteDTO[]);
                            noteData = fetchedNotes[0];
                        }
                    } catch (error) {
                        console.error("[Navigation] Failed to fetch note:", error);
                        isNavigatingRef.current = false;
                        return;
                    }
                }

                if (noteData) {
                    newTab = {
                        id: `note-${noteData.id}-${Date.now()}`, // Generate new tabId
                        type: constants.vscode.tab.tabTypes.note,
                        data: noteData,
                        title: noteData.name || constants.vscode.tabTitles.unsavedNote,
                        hasUnsavedChanges: false,
                    };
                }
            } else if (entry.type === 'workspace') {
                // Try to find in grid first
                let wsData = workspaces.find((w) => w.id === itemIdNum);

                // If not in grid, fetch from API (similar to OpenTabsSync.tsx)
                if (!wsData) {
                    if (!$user.userToken) {
                        console.error("[Navigation] No auth token found");
                        isNavigatingRef.current = false;
                        return;
                    }

                    try {
                        const result = await wsService._getWs($user.userToken, { ids: itemIdNum.toString() });
                        if (result.success && result.data && result.data.length > 0) {
                            const fetchedWs = transformWs(result.data as WsDTO[]);
                            wsData = fetchedWs[0];
                        }
                    } catch (error) {
                        console.error("[Navigation] Failed to fetch workspace:", error);
                        isNavigatingRef.current = false;
                        return;
                    }
                }

                if (wsData) {
                    newTab = {
                        id: `workspace-${wsData.id}-${Date.now()}`, // Generate new tabId
                        type: constants.vscode.tab.tabTypes.workspace,
                        data: wsData,
                        title: wsData.name || constants.vscode.tabTitles.unsavedWorkspace,
                        hasUnsavedChanges: false,
                    };
                }
            }
            // Add other types here as needed (file, folder, etc.)

            if (newTab) {
                setOpenTabs(prev => [...prev, newTab!]);
                setNewTabAnd(newTab.id);
            } else {
                console.warn("[Navigation] Failed to create tab for entry:", entry);
                isNavigatingRef.current = false;
                return;
            }
        }

        // Restore positions after DOM updates
        setTimeout(() => {
            // Restore DOM scroll positions
            restoreScrollPositions(entry.scrollPositions);

            // Restore Monaco editor positions (for note type)
            if (entry.type === 'note') {
                const editor = editorRef.current;
                if (editor && !(editor as any)._isDisposed) {
                    // If no position data, set cursor to end of first line
                    const positionToRestore = entry.mdPos || { lineNumber: 1, column: 1000 };
                    restoreEditorPosition(editor, positionToRestore, entry.mdScrollPos);
                }
            }

            // Focus field if specified and move cursor to end
            // if (entry.focusedFieldId) {
            //     focusFieldById(entry.focusedFieldId);
            // }

            // Increase timeout to ensure VSEditorArea's 100ms timeout completes first
            isNavigatingRef.current = false;
        }, 250);
    };

    /**
     * Navigate back (Alt + Left Arrow)
     * Logic:
     * 1. Pop last entry from Past
     * 2. That entry → Becomes Present
     * 3. Old Present → Push to Future (beginning)
     */
    const handleGoBack = () => {
        if (past.length === 0) return;

        isNavigatingRef.current = true;

        // 1. Pop last entry from Past
        const newPresent = past[past.length - 1];
        const newPast = past.slice(0, -1);

        // 2. Old Present → Push to beginning of Future
        const currentPresent = pendingPresentRef.current;
        if (currentPresent) {
            setFuture((prevFuture) => [currentPresent, ...prevFuture]);
        }

        // 3. Update Past and Present
        setPast(newPast);
        setPresent(newPresent);
        pendingPresentRef.current = newPresent;

        // Navigate to the new present
        navigateToEntry(newPresent);
    };

    /**
     * Navigate forward (Alt + Right Arrow)
     * Logic:
     * 1. Shift first entry from Future
     * 2. That entry → Becomes Present
     * 3. Old Present → Push to Past (end)
     */
    const handleGoForward = () => {
        if (future.length === 0) return;

        isNavigatingRef.current = true;

        // 1. Shift first entry from Future
        const newPresent = future[0];
        const newFuture = future.slice(1);

        // 2. Old Present → Push to end of Past
        const currentPresent = pendingPresentRef.current;
        if (currentPresent) {
            setPast((prevPast) => {
                let newPast = [...prevPast, currentPresent];
                // Apply limit
                if (newPast.length > MAX_PAST_SIZE) {
                    newPast = newPast.slice(newPast.length - MAX_PAST_SIZE);
                }
                return newPast;
            });
        }

        // 3. Update Future and Present
        setFuture(newFuture);
        setPresent(newPresent);
        pendingPresentRef.current = newPresent;

        // Navigate to the new present
        navigateToEntry(newPresent);
    };

    /**
     * Check if can navigate back
     */
    const canGoBack = () => past.length > 0;

    /**
     * Check if can navigate forward
     */
    const canGoForward = () => future.length > 0;

    /**
     * Clear all history
     * Note: userId should be passed from component that has access to $user
     */
    const clearHistory = (userId: number | null) => {
        setPast([]);
        setPresent(null);
        pendingPresentRef.current = null;
        setFuture([]);
        const storageKey = getStorageKey(userId);
        if (storageKey) {
            localStorage.removeItem(storageKey);
        }
    };

    /**
     * Get current entry in history (Present)
     * Returns pendingPresentRef to get the most up-to-date value
     */
    const getCurrentEntry = (): HistoryEntry | null => {
        return pendingPresentRef.current;
    };

    return {
        // Tracking
        trackNavigation,
        isNavigating: () => isNavigatingRef.current,

        // Navigation
        handleGoBack,
        handleGoForward,
        canGoBack,
        canGoForward,

        // Editor position tracking
        captureEditorPosition,
        captureEditorScrollPosition,
        restoreEditorPosition,

        // Utilities
        clearHistory,
        getCurrentEntry,
    };
};
