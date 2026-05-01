import type { Note } from "@/features/note";
import { BaseTab, TabType } from "@/shell";
import { shellConstants } from "@/shell/shell.constants";
import type { LifeLogLog, LifeLogTrack } from "@/features/lifeLog";
import type { Task } from "@/features/taskDetail";
import type { Ws } from "@/features/workspace";
import {useEditorTabBarStore} from "../store/EditorTab.store";
import type { Project } from "@/features/project";
import type { BreadcrumbItem } from "../utils/breadcrumb.utils";
import { moduleRegistry } from "@/shell/moduleRegistry";

export const useEditorTabBarHelper = () => {
    const { openTabs, setOpenTabs, activeTabId, setActiveTabId } = useEditorTabBarStore();

    // ── Registry hook collections ─────────────────────────────────────────────
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const tabCloseHandlers = moduleRegistry.getAll()
        .filter((m) => m.useOnTabClose != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useOnTabClose!());

    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const tabActivateHandlers = moduleRegistry.getAll()
        .filter((m) => m.useOnTabActivate != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useOnTabActivate!());

    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const breadcrumbBuilders = moduleRegistry.getAll()
        .filter((m) => m.useBuildBreadcrumb != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useBuildBreadcrumb!());

    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const breadcrumbTriggerKey = moduleRegistry.getAll()
        .filter((m) => m.useBreadcrumbTrigger != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => String(m.useBreadcrumbTrigger!()))
        .join(",");

    // ── Breadcrumb ────────────────────────────────────────────────────────────

    /**
     * Generate breadcrumb for a tab by delegating to registered module builders.
     * Each module decides whether it handles the given tab type.
     */
    const generateBreadcrumbForTab = (data: Note | Ws, type: string): BreadcrumbItem[] | undefined => {
        const fakeTab = { data, type } as BaseTab;
        for (const builder of breadcrumbBuilders) {
            const result = builder(fakeTab);
            if (result !== undefined) return result;
        }
        return undefined;
    };

    // ── Tab activation ────────────────────────────────────────────────────────

    /**
     * Set the active tab ID only — no feature side-effects.
     * Used for programmatic switches (tab restore, close-and-switch) where
     * tree sync / scroll animations are undesirable.
     */
    const setNewTabAnd = (newActiveTabId: string | null) => {
        setActiveTabId(newActiveTabId);
    };

    /**
     * Set the active tab and fire all registered module activate handlers
     * (e.g. workspace tree selection + scroll).
     * Use this for user-initiated tab switches.
     */
    const updateActiveTab = (newActiveTabId: string | null, tabs?: BaseTab[]) => {
        const tabsToSearch = tabs || openTabs;
        setNewTabAnd(newActiveTabId);

        const activeTab = newActiveTabId
            ? (tabsToSearch.find((tab: BaseTab) => tab.id === newActiveTabId) ?? null)
            : null;
        tabActivateHandlers.forEach((h) => h(activeTab));
    };

    // ── Open tab ──────────────────────────────────────────────────────────────

    const openTab = (
        data: Note | Ws | Project | Task | LifeLogLog | LifeLogTrack,
        tabType: string,
        openedBy?: { link: string; label: string },
    ) => {
        const type = tabType;

        // 1. Check for existing tab
        let existingTab: BaseTab | undefined;
        if (type === shellConstants.vscode.tab.tabTypes.note) {
            existingTab = openTabs.find((t) => t.type === type && (t.data as Note).id === (data as Note).id);
        } else if (type === shellConstants.vscode.tab.tabTypes.workspace) {
            existingTab = openTabs.find((t) => t.type === type && (t.data as Ws).id === (data as Ws).id);
        } else if (type === shellConstants.vscode.tab.tabTypes.project) {
            existingTab = openTabs.find((t) => t.type === type && (t.data as Project).id === (data as Project).id);
        } else if (type === shellConstants.vscode.tab.tabTypes.task) {
            existingTab = openTabs.find((t) => t.type === type && (t.data as Task).id === (data as Task).id);
        } else if (type === shellConstants.vscode.tab.tabTypes.lifeLog) {
            existingTab = openTabs.find((t) => t.type === type && (t.data as LifeLogLog).id === (data as LifeLogLog).id);
        } else if (type === shellConstants.vscode.tab.tabTypes.lifeLogTrack) {
            existingTab = openTabs.find((t) => t.type === type && (t.data as LifeLogTrack).id === (data as LifeLogTrack).id);
        }

        // 2. Activate existing tab
        if (existingTab) {
            updateActiveTab(existingTab.id);
            return;
        }

        // 3. Create new tab
        let newTab: BaseTab;

        if (type === shellConstants.vscode.tab.tabTypes.note) {
            const d = data as Note;
            newTab = {
                id: `note-${d.id}-${Date.now()}`,
                type,
                data: d, data0: d,
                title: d.name || shellConstants.vscode.tabTitles.unsavedNote,
                hasUnsavedChanges: false,
                breadcrumb: generateBreadcrumbForTab(d, type),
                openedBy,
            };
        } else if (type === shellConstants.vscode.tab.tabTypes.workspace) {
            const d = data as Ws;
            newTab = {
                id: `workspace-${d.id}-${Date.now()}`,
                type,
                data: d, data0: d,
                title: d.name || shellConstants.vscode.tabTitles.unsavedWorkspace,
                hasUnsavedChanges: false,
                openedBy,
            };
        } else if (type === shellConstants.vscode.tab.tabTypes.project) {
            const d = data as Project;
            newTab = {
                id: `project-${d.id}-${Date.now()}`,
                type,
                data: d, data0: d,
                title: d.name,
                hasUnsavedChanges: false,
                openedBy,
            };
        } else if (type === shellConstants.vscode.tab.tabTypes.task) {
            const d = data as Task;
            newTab = {
                id: `task-${d.id}-${Date.now()}`,
                type,
                data: d, data0: d,
                title: d.title,
                hasUnsavedChanges: false,
                openedBy,
            };
        } else if (type === shellConstants.vscode.tab.tabTypes.lifeLog) {
            const d = data as LifeLogLog;
            newTab = {
                id: `lifelog-${d.id}-${Date.now()}`,
                type,
                data: d, data0: d,
                title: d.title || `Log ${d.id}`,
                hasUnsavedChanges: false,
                openedBy,
            };
        } else if (type === shellConstants.vscode.tab.tabTypes.lifeLogTrack) {
            const d = data as LifeLogTrack;
            newTab = {
                id: `lifelogtrack-${d.id}-${Date.now()}`,
                type,
                data: d, data0: d,
                title: d.name,
                hasUnsavedChanges: false,
                openedBy,
            };
        } else {
            newTab = {
                id: `unknown-${Date.now()}`,
                type: type as TabType,
                data, data0: data,
                title: shellConstants.vscode.tabTitles.unknownTab,
                hasUnsavedChanges: false,
                openedBy,
            };
        }

        // 4. Add and activate
        const newTabs = [...openTabs, newTab];
        setOpenTabs(newTabs);
        updateActiveTab(newTab.id, newTabs);
    };

    // ── Close tab(s) ──────────────────────────────────────────────────────────

    const closeTab = (tabId: string, force = false) => {
        const tab = openTabs.find((t: BaseTab) => t.id === tabId);
        if (!tab) return;

        tabCloseHandlers.forEach((h) => h(tab));

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

        tabsToClose.forEach((tab) => tabCloseHandlers.forEach((h) => h(tab)));

        const newTabs = openTabs.filter((t) => !tabIds.includes(t.id));
        setOpenTabs(newTabs);

        if (activeTabId && tabIds.includes(activeTabId)) {
            updateActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null, newTabs);
        }
    };

    // ── Misc ──────────────────────────────────────────────────────────────────

    const getActiveTab = (tabId?: string): BaseTab | null => {
        if (tabId) return openTabs.find((tab: BaseTab) => tab.id === tabId) || null;
        if (!activeTabId) return null;
        return openTabs.find((tab: BaseTab) => tab.id === activeTabId) || null;
    };

    const processTabAfterDelete = (deletedIds: number[], type: string) => {
        const newTabs = openTabs.filter((tab) => {
            if (tab.type === "multiProject") return true;
            return !(tab.type === type && deletedIds.includes((tab.data as { id: number }).id));
        });
        setOpenTabs(newTabs);
    };

    return {
        openTab,
        generateBreadcrumbForTab,
        closeTab,
        closeTabs,
        getActiveTab,
        updateActiveTab,
        processTabAfterDelete,
        setNewTabAnd,
        /**
         * Serialized trigger key — changes when any module's breadcrumb-relevant state changes.
         * Use as a TabBar effect dependency to know when to regenerate breadcrumbs.
         */
        breadcrumbTriggerKey,
    };
};
