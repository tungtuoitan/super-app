/**
 * Navigation History Helper
 * Pure business logic functions for tracking navigation and restoring positions
 * - Tracks tab switches and field focus
 * - Captures scroll and cursor positions
 * - Restores positions when navigating back/forward
 * - Reopens closed tabs if needed
 * Note: localStorage persistence handled in component level
 */

import { useRef } from "react";
import { useNavigationHistoryStore, ScrollPosition, CursorPosition, HistoryEntry } from "@/store/editor/NavigationHistory.store";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { Note } from "@/types/note.types";
import { BaseTab } from "@/types/editor/tab.types";
import { constants } from "@/utils/index";
import { useEditorTabHelper } from "./useEditorTab.helper";

export const STORAGE_KEY_PREFIX = "navigation_history_";
export const MAX_PAST_SIZE = 200; // Limit for Past stack
export const SCROLL_DISTANCE_THRESHOLD = 100; // px - minimum scroll distance to consider "different position"

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
    const { getActiveTab } = useEditorTabHelper();
    const { setNewTabAnd } = useEditorTabHelper();

    // Track if we're currently navigating (to prevent tracking during restore)
    const isNavigatingRef = useRef(false);

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
     * Check if two entries are "significantly different"
     * Returns true if they should be considered different items in history
     *
     * Criteria for "significantly different":
     * 1. Different tab or type → different
     * 2. Same tab, scroll position far apart (>SCROLL_DISTANCE_THRESHOLD) → different
     * 3. Same tab, close position, but both have field and fields are different → different
     *
     * Otherwise → same (skip push)
     */
    const areEntriesSignificantlyDifferent = (entry1: HistoryEntry, entry2: HistoryEntry): boolean => {
        // 1. Different tab, type, or item → different
        if (entry1.tabId !== entry2.tabId || entry1.itemId !== entry2.itemId || entry1.type !== entry2.type) {
            return true;
        }

        // Same tab - check scroll distance using type-specific element
        const scrollElementId = SCROLL_ELEMENT_MAP[entry1.type];
        if (scrollElementId) {
            const scroll1 = entry1.scrollPositions?.find(s => s.elementId === scrollElementId);
            const scroll2 = entry2.scrollPositions?.find(s => s.elementId === scrollElementId);

            const scrollTop1 = scroll1?.scrollTop || 0;
            const scrollTop2 = scroll2?.scrollTop || 0;
            const scrollDistance = Math.abs(scrollTop1 - scrollTop2);

            // 2. Same tab, scroll position far apart → different
            if (scrollDistance > SCROLL_DISTANCE_THRESHOLD) {
                return true;
            }
        }

        // 3. Same tab, close position → check fields
        // const field1 = entry1.focusedFieldId;
        // const field2 = entry2.focusedFieldId;

        // Both have fields and fields are different → different
        // if (field1 && field2 && field1 !== field2) {
        //     return true;
        // }

        // Otherwise → same (skip)
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
            timestamp: Date.now(),
        };

        // If no Present, just set it
        if (!present) {
            setPresent(newEntry);
            return;
        }

        // Validate: Check if new entry is significantly different from Present
        if (!areEntriesSignificantlyDifferent(present, newEntry)) {
            // Not significantly different → just update Present timestamp
            setPresent({ ...newEntry });
            return;
        }

        // Significantly different → push to history

        // 2. Move Present to Past (if exists)
        setPast((prevPast) => {
            let newPast = [...prevPast, present];
            // 5. Limit Past size - remove oldest entries
            if (newPast.length > MAX_PAST_SIZE) {
                newPast = newPast.slice(newPast.length - MAX_PAST_SIZE);
            }
            return newPast;
        });

        // 3. New entry becomes Present
        setPresent(newEntry);

        // 4. Clear Future
        setFuture([]);
    };

    /**
     * Track current location - call this when switching tabs or focusing fields
     * Generic for all tab types (note, workspace, file, etc.)
     */
    const trackNavigation = (focusedFieldId?: string) => {
        // Don't track if we're currently navigating back/forward
        if (isNavigatingRef.current) return;

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
        if (itemId < 0) return;

        const scrollPositions = captureScrollPositions(tabType);
        // const cursorPosition = captureCursorPosition(focusedFieldId);

        pushHistory({
            tabId: activeTabId,
            type: tabType,
            itemId: itemId.toString(),
            scrollPositions,
            // cursorPosition,
            // focusedFieldId,
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
     * - Opens tab if closed
     * - Switches to tab
     * - Restores positions
     */
    const navigateToEntry = (entry: HistoryEntry | null) => {
        if (!entry) return;

        // Validate itemId - don't navigate to invalid/temporary items
        const itemIdNum = parseInt(entry.itemId);
        if (isNaN(itemIdNum) || itemIdNum <= 0) {
            console.warn('Invalid itemId in history entry:', entry);
            isNavigatingRef.current = false;
            return;
        }

        isNavigatingRef.current = true;

        // Check if tab exists
        const existingTab = openTabs.find(tab => tab.id === entry.tabId);

        if (existingTab) {
            // Tab exists - just switch to it
            setNewTabAnd(entry.tabId);
        } else {
            // Tab doesn't exist - need to reopen it based on type
            let newTab: BaseTab | null = null;

            if (entry.type === 'note') {
                // Create a minimal Note object with the itemId to reopen the tab
                const noteData: Note = { id: itemIdNum } as Note;
                newTab = {
                    id: `note-${noteData.id}-${Date.now()}`,
                    type: constants.vscode.tab.tabTypes.note,
                    data: noteData,
                    title: noteData.name || constants.vscode.tabTitles.unsavedNote,
                    hasUnsavedChanges: false,
                };
            } else if (entry.type === 'workspace') {
                // Create workspace tab
                const wsData = { id: itemIdNum } as any; // Use Ws type when available
                newTab = {
                    id: `workspace-${wsData.id}-${Date.now()}`,
                    type: constants.vscode.tab.tabTypes.workspace,
                    data: wsData,
                    title: wsData.name || constants.vscode.tabTitles.unsavedWorkspace,
                    hasUnsavedChanges: false,
                };
            }
            // Add other types here as needed (file, folder, etc.)

            if (newTab) {
                setOpenTabs(prev => [...prev, newTab!]);
                setNewTabAnd(newTab.id);
            }
        }

        // Restore positions after DOM updates
        setTimeout(() => {
            restoreScrollPositions(entry.scrollPositions);

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
        if (present) {
            setFuture((prevFuture) => [present, ...prevFuture]);
        }

        // 3. Update Past and Present
        setPast(newPast);
        setPresent(newPresent);

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
        if (present) {
            setPast((prevPast) => {
                let newPast = [...prevPast, present];
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
        setFuture([]);
        const storageKey = getStorageKey(userId);
        if (storageKey) {
            localStorage.removeItem(storageKey);
        }
    };

    /**
     * Get current entry in history (Present)
     */
    const getCurrentEntry = (): HistoryEntry | null => {
        return present;
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

        // Utilities
        clearHistory,
        getCurrentEntry,
    };
};
