import { useEditorTabBarStore } from "../store/EditorTab.store";
import { moduleRegistry } from "../moduleRegistry";
import type { BreadcrumbItem } from "../utils/breadcrumb.utils";
import { BaseTab, TabOpenMeta, TabType } from "../types/tab.types";
import { shellConstants } from "../shell.constants";

// ── Module-level helpers (pure, no hooks) ─────────────────────────────────────

/**
 * Infer a tab title from meta + entity data.
 * Priority: meta.title → data.name → data.title → empty string.
 */
function inferTabTitle(data: unknown, meta: TabOpenMeta): string {
    if (meta.title !== undefined) return meta.title;
    const d = data as Record<string, unknown> | null;
    if (typeof d?.name === "string") return d.name;
    if (typeof d?.title === "string") return d.title;
    return "";
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export const useEditorTabBarHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId, isLoadingTab, setIsLoadingTab } = useEditorTabBarStore();

    // ── Breadcrumb ────────────────────────────────────────────────────────────

    /**
     * Delegate breadcrumb building to whichever module handles this tab type.
     * Builders are plain functions — calling this does NOT subscribe to feature stores.
     */
    const generateBreadcrumbForTab = (data: unknown, type: string): BreadcrumbItem[] | undefined => {
        const fakeTab = { data, type } as BaseTab;
        for (const m of moduleRegistry.getAll()) {
            const result = m.buildBreadcrumb?.(fakeTab);
            if (result !== undefined) return result;
        }
        return undefined;
    };

    // ── Tab activation ────────────────────────────────────────────────────────

    /**
     * Programmatic tab switch — does NOT fire onTabActivate module handlers.
     * Use for restore, close-and-switch, or any code-driven navigation where
     * feature side-effects (e.g. tree selection/scroll) are not desired.
     */
    const setActiveTabIdSilently = (newActiveTabId: string | null) => {
        setActiveTabId(newActiveTabId);
    };

    /**
     * Set active tab and fire all registered module onTabActivate handlers.
     * Use for user-initiated tab switches.
     */
    const updateActiveTab = (newActiveTabId: string | null, tabs?: BaseTab[]) => {
        const tabsToSearch = tabs ?? openTabs;
        setActiveTabIdSilently(newActiveTabId);
        const activeTab = newActiveTabId
            ? (tabsToSearch.find((t: BaseTab) => t.id === newActiveTabId) ?? null)
            : null;
        moduleRegistry.getAll().forEach((m) => m.onTabActivate?.(activeTab));
    };

    // ── Open tab (standard — find by type + data.id) ──────────────────────────

    /**
     * Open a tab for an entity.
     * - If a tab with the same type + data.id already exists → activate it.
     * - Otherwise → create a new tab and activate it.
     *
     * Features never build BaseTab directly; they pass data + TabOpenMeta.
     * `meta` is optional — title falls back to data.name / data.title if omitted.
     */
    const openTab = (
        data: { id: number | string },
        tabType: string,
        meta: TabOpenMeta = {},
    ) => {
        const existing = openTabs.find(
            (t) => t.type === tabType && (t.data as { id: number | string })?.id === data.id,
        );

        if (existing) {
            updateActiveTab(existing.id);
            return;
        }

        const newTab: BaseTab = {
            id: meta.tabId ?? `${tabType}-${data.id}-${Date.now()}`,
            type: tabType as TabType,
            data,
            // data0 is the initial snapshot used by "Discard Changes" to reset data back.
            // It is set once on creation and never mutated — treat it as immutable.
            data0: data,
            title: inferTabTitle(data, meta),
            hasUnsavedChanges: meta.hasUnsavedChanges ?? false,
            isPinned: meta.isPinned,
            openedBy: meta.openedBy,
            breadcrumb: generateBreadcrumbForTab(data, tabType),
            ...(meta.metadata !== undefined && { metadata: meta.metadata }),
        };

        const newTabs = [...openTabs, newTab];
        setOpenTabs(newTabs);
        updateActiveTab(newTab.id, newTabs);
    };

    // ── Open singleton tab (find by type only) ────────────────────────────────

    /**
     * Open a singleton tab (at most one per tabType).
     * - If a tab of this type already exists → swap data if provided, then activate.
     * - Otherwise → create a new tab and activate it.
     *
     * @param position  'last' (default) | 'first' — where to insert when creating.
     */
    const openSingletonTab = (
        tabType: string,
        meta: TabOpenMeta,
        data?: unknown,
        options?: { position?: "first" | "last" },
    ) => {
        const existing = openTabs.find((t) => t.type === tabType);

        if (existing) {
            if (data !== undefined) {
                setOpenTabs((prev) =>
                    prev.map((t) =>
                        t.id === existing.id
                            ? {
                                  ...t,
                                  data,
                                  ...(meta.title !== undefined && { title: meta.title }),
                                  hasUnsavedChanges: meta.hasUnsavedChanges ?? t.hasUnsavedChanges,
                              }
                            : t,
                    ),
                );
            }
            updateActiveTab(existing.id);
            return;
        }

        const resolvedData = data ?? null;
        const newTab: BaseTab = {
            id: meta.tabId ?? `${tabType}-tab`,
            type: tabType as TabType,
            data: resolvedData,
            // data0 is the initial snapshot used by "Discard Changes" (see openTab above).
            data0: resolvedData,
            title: meta.title ?? "",
            hasUnsavedChanges: meta.hasUnsavedChanges ?? false,
            isPinned: meta.isPinned,
            openedBy: meta.openedBy,
        };

        const newTabs =
            options?.position === "first"
                ? [newTab, ...openTabs]
                : [...openTabs, newTab];

        setOpenTabs(newTabs);
        updateActiveTab(newTab.id, newTabs);
    };

    // ── Close tab(s) ──────────────────────────────────────────────────────────

    const closeTab = (tabId: string, _force = false) => {
        const tab = openTabs.find((t: BaseTab) => t.id === tabId);
        if (!tab) return;

        moduleRegistry.getAll().forEach((m) => m.onTabClose?.(tab));

        const newTabs = openTabs.filter((t: BaseTab) => t.id !== tabId);
        setOpenTabs(newTabs);

        if (activeTabId === tabId) {
            updateActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null, newTabs);
        }
    };

    const closeTabs = (tabIds: string[]) => {
        if (tabIds.length === 0) return;

        const tabsToClose = openTabs.filter((t) => tabIds.includes(t.id));
        if (tabsToClose.length === 0) return;

        const modules = moduleRegistry.getAll();
        tabsToClose.forEach((tab) => modules.forEach((m) => m.onTabClose?.(tab)));

        const newTabs = openTabs.filter((t) => !tabIds.includes(t.id));
        setOpenTabs(newTabs);

        if (activeTabId && tabIds.includes(activeTabId)) {
            updateActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null, newTabs);
        }
    };

    // ── Update tab data ───────────────────────────────────────────────────────

    /**
     * Sync an entity's latest data into any open tabs that show it.
     * Call this after saving/editing an entity so open tabs stay in sync.
     *
     * `dataOrUpdater` can be:
     * - A plain value  → replaces tab.data entirely.
     * - A function     → receives current tab.data and returns the next value.
     *                    Use this when you only have a partial patch and need to merge.
     *
     * @example — partial patch (merge)
     *   updateTabData(TAB_TYPE, taskId, (cur) => ({ ...(cur as Task), ...patch }), patch.title);
     *
     * @example — full replacement
     *   updateTabData(TAB_TYPE, taskId, updatedTask, updatedTask.title);
     */
    const updateTabData = (
        tabType: string,
        entityId: number | string,
        dataOrUpdater: unknown | ((current: unknown) => unknown),
        newTitle?: string,
    ) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.type !== tabType) return t;
                if ((t.data as { id: number | string })?.id !== entityId) return t;
                const nextData = typeof dataOrUpdater === "function" ? dataOrUpdater(t.data) : dataOrUpdater;
                return {
                    ...t,
                    data: nextData,
                    ...(newTitle !== undefined && { title: newTitle }),
                };
            }),
        );
    };

    /**
     * Update the data of a singleton tab (identified by type, not entity id).
     * Does nothing if the singleton is not currently open.
     */
    const updateSingletonData = (
        tabType: string,
        newData: unknown,
        newTitle?: string,
    ) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.type !== tabType) return t;
                return {
                    ...t,
                    data: newData,
                    ...(newTitle !== undefined && { title: newTitle }),
                };
            }),
        );
    };

    /**
     * Update arbitrary fields on a specific tab (by id).
     *
     * Pass a plain patch object OR a function that receives the current tab
     * and returns a partial patch — use the function form when you need to
     * spread existing nested fields (e.g. metadata).
     *
     * @example — mark unsaved changes
     *   patchTab(tabId, { hasUnsavedChanges: true });
     *
     * @example — update inner-tab metadata (needs spread)
     *   patchTab(tabId, (cur) => ({ metadata: { ...cur.metadata, activeTab: "general" } }));
     *
     * @example — replace data after save, also reset the undo snapshot
     *   patchTab(tabId, { data: saved, data0: saved, hasUnsavedChanges: false });
     */
    const patchTab = (
        tabId: string,
        patch: Partial<BaseTab> | ((current: BaseTab) => Partial<BaseTab>),
    ) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.id !== tabId) return t;
                const p = typeof patch === "function" ? patch(t) : patch;
                return { ...t, ...p };
            }),
        );
    };

    /**
     * Update arbitrary fields on a singleton tab (by type, not id).
     * Does nothing if no tab of this type is open.
     *
     * @example — update title only
     *   patchSingletonTab('kNode', { title: newName });
     *
     * @example — update nested metadata
     *   patchSingletonTab('kKnowledge', (cur) => ({ metadata: { ...cur.metadata, activeTab: 'general' } }));
     */
    const patchSingletonTab = (
        tabType: string,
        patch: Partial<BaseTab> | ((current: BaseTab) => Partial<BaseTab>),
    ) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.type !== tabType) return t;
                const p = typeof patch === "function" ? patch(t) : patch;
                return { ...t, ...p };
            }),
        );
    };

    // ── Misc ──────────────────────────────────────────────────────────────────

    const getActiveTab = (tabId?: string): BaseTab | null => {
        if (tabId) return openTabs.find((t: BaseTab) => t.id === tabId) ?? null;
        if (!activeTabId) return null;
        return openTabs.find((t: BaseTab) => t.id === activeTabId) ?? null;
    };

    const processTabAfterDelete = (deletedIds: number[], type: string) => {
        const newTabs = openTabs.filter((tab) => {
            if (tab.type === shellConstants.vscode.tab.tabTypes.multiProject) return true;
            return !(tab.type === type && deletedIds.includes((tab.data as { id: number }).id));
        });
        setOpenTabs(newTabs);
    };

    return {
        openTabs,
        activeTabId,
        isLoadingTab,
        setIsLoadingTab,
        openTab,
        openSingletonTab,
        closeTab,
        closeTabs,
        updateTabData,
        updateSingletonData,
        patchTab,
        patchSingletonTab,
        generateBreadcrumbForTab,
        getActiveTab,
        updateActiveTab,
        processTabAfterDelete,
        setActiveTabIdSilently,
    };
};
