/**
 * Open Tabs Sync
 * Handles localStorage persistence for open editor tabs.
 * - Saves tabs to localStorage when they change
 * - Loads and restores tabs on mount or userId change
 *
 * Feature-specific restore/serialize logic is delegated to each module's
 * `tabPersistence` via moduleRegistry — no direct feature imports needed.
 */

import { useEffect } from "react";
import type { BaseTab, OpenTabsStorage, TabStorage } from "@/shell";
import { moduleRegistry } from "@/shell/moduleRegistry";
import { useAuthStore } from "@/shared";
import { useEditorTabBarStore } from "../store/EditorTab.store";

// ── Storage key ───────────────────────────────────────────────────────────────

export const getStorageKey = (userId: number | null | undefined): string | null => {
    if (!userId) return null;
    return `opentabs_${userId}`;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useTabBarSync = () => {
    const { openTabs, setOpenTabs, isLoadingTabs, setIsLoadingTabs, setActiveTabId } = useEditorTabBarStore();
    const { $user } = useAuthStore();

    // ── Restore tabs from localStorage on mount / userId change ───────────────
    // Uses setActiveTabId from the store directly (stable Zustand setter — safe to
    // call inside an effect without adding to the dependency array).

    useEffect(() => {
        const restoreTabs = async () => {
            if (!$user.userId) return;

            const storageKey = getStorageKey($user.userId);
            if (!storageKey) {
                setOpenTabs([]);
                setActiveTabId(null);
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

                if (!$user.userToken) {
                    console.error("No auth token found");
                    setIsLoadingTabs(false);
                    return;
                }

                // Sort by saved index to restore correct order
                const sortedTabs = [...data.tabs].sort((a, b) => a.index - b.index);

                // Restore each tab via its module's tabPersistence handler
                const restoredTabs: BaseTab[] = [];
                for (const persisted of sortedTabs) {
                    const persistence = moduleRegistry.getTabPersistence(persisted.type);
                    if (!persistence) continue;
                    try {
                        const tab = await persistence.restoreTab(persisted, $user.userToken);
                        if (tab) restoredTabs.push(tab);
                    } catch (err) {
                        console.error(`Failed to restore tab type="${persisted.type}" id="${persisted.tabId}":`, err);
                    }
                }

                setOpenTabs(restoredTabs);
                if (restoredTabs.length > 0) {
                    setActiveTabId(restoredTabs[restoredTabs.length - 1].id);
                }
            } catch (error) {
                console.error("Failed to restore tabs from localStorage:", error);
                setOpenTabs([]);
                setActiveTabId(null);
            } finally {
                setIsLoadingTabs(false);
            }
        };

        restoreTabs();
    }, [$user.userId]); // eslint-disable-line react-hooks/exhaustive-deps -- setActiveTabId is a stable Zustand setter

    // ── Persist tabs to localStorage whenever they change ─────────────────────

    useEffect(() => {
        const storageKey = getStorageKey($user.userId);
        if (!storageKey || openTabs.length === 0 || isLoadingTabs) return;

        try {
            const tabsToSave: TabStorage[] = openTabs.flatMap((tab, index) => {
                const persistence = moduleRegistry.getTabPersistence(tab.type);
                if (!persistence) return [];
                const dataId = persistence.getDataId(tab);
                if (dataId === null) return [];
                return [{ tabId: tab.id, type: tab.type, dataId, index }];
            });

            const data: OpenTabsStorage = { tabs: tabsToSave };
            localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (error) {
            console.error("Failed to save tabs to localStorage:", error);
        }
    }, [openTabs, $user.userId, isLoadingTabs]);

    return null;
};
