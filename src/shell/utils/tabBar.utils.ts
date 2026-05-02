/**
 * Shared utilities for tab bar operations.
 * Used by useTabBarHelper, useTabBarMenu.helper, and useTabBarShortcuts.
 */

import { shellConstants } from "../shell.constants";
import { moduleRegistry } from "../moduleRegistry";
import type { BaseTab } from "../types/tab.types";

// ── Pinned state ──────────────────────────────────────────────────────────────

/**
 * Persist the pinned/unpinned state of all tabs to localStorage.
 * Called after any operation that changes tab.isPinned.
 */
export function savePinnedStateToStorage(tabs: BaseTab[]): void {
    const pinnedState: Record<string, boolean> = {};
    tabs.forEach((tab) => { pinnedState[tab.id] = !!tab.isPinned; });
    localStorage.setItem(shellConstants.storage.tabPinnedState, JSON.stringify(pinnedState));
}

/**
 * Sort tabs so pinned tabs appear before unpinned ones.
 * Preserves relative order within each group.
 */
export function sortByPinnedFirst(tabs: BaseTab[]): BaseTab[] {
    return [...tabs].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return 0;
    });
}

// ── Tab group ─────────────────────────────────────────────────────────────────

/**
 * Returns true if this tab is a child of a tab group.
 * A tab is a child when its openedBy.link matches the group key of another tab (the leader).
 */
export function isGroupChild(tab: BaseTab, allTabs: BaseTab[]): boolean {
    const link = tab.openedBy?.link;
    if (!link) return false;
    return allTabs.some((t) => moduleRegistry.getTabGroupKey(t) === link);
}
