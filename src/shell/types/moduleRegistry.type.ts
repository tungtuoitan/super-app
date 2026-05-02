/**
 * Module Registry — VSCode Shell Extension Points
 *
 * Shell (ActivityBar, VSSideBar, VSEditorArea, VSPanel, TabBar) does NOT import features directly.
 * Instead, each feature registers a ModuleDefinition here.
 * Shell reads from this registry at render time.
 *
 * Dependency direction:
 *   features/xxx/shell/xxx.module.tsx  →  moduleRegistry  ←  shell components
 */

import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { BaseTab } from "@/shell";
import type { SaveActions } from "@/shell/types/actions.types";

// --- Contract -----------------------------------------------------------------

// -- TabPersistence ------------------------------------------------------------

/** Shape of one persisted tab entry in localStorage */
export interface TabStorage {
    tabId: string;
    type: string;
    dataId: number | string;
    index: number;
}

/** Top-level localStorage shape for open tabs */
export interface OpenTabsStorage {
    tabs: TabStorage[];
}

/** Per-module contract for tab persistence (serialize ? restore). Plain functions, no React. */
export interface TabPersistence {
    /** Return the dataId to persist. Return null to skip saving this tab (e.g. temp/unsaved). */
    getDataId(tab: BaseTab): number | string | null;
    /** Fetch the entity and reconstruct a full BaseTab. Return null if the data no longer exists. */
    restoreTab(persisted: TabStorage, userToken: string): Promise<BaseTab | null>;
}

// -- ShortcutDefinition --------------------------------------------------------

/** A keyboard shortcut contributed by a feature module. */
export interface ShortcutDefinition {
    /** Key value, case-insensitive (e.g. "l", "k", "w") */
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    /** Called when the shortcut fires */
    handler: () => void;
}

export interface PanelTabDefinition {
    id: string;
    label: string;
    icon: LucideIcon;
    /** Receives the currently active editor tab (null if none open) */
    Content: ComponentType<{ activeTab: BaseTab | null }>;
    /** Only show this tab when the active editor tab matches this type */
    showWhenTabType?: string;
    /** Called when the user switches away from this panel tab */
    onLeave?: () => void;
}

/** Visual metadata for a tab button in the TabBar */
export interface TabMeta {
    /** Icon to render inside the tab button */
    icon: ReactNode;
    /** Hex color for the icon / active border */
    color: string;
}

export interface ModuleDefinition {
    /** Unique module ID — must match shellConstants.modules.* value */
    id: string;

    // -- SaveActions ----------------------------------------------------------
    /**
     * Hook returning save/handles for this module's tab types.
     * Called as a React hook inside the editor toolbar coordinator.
     */
    useSaveActions?: () => SaveActions;

    // -- TabPersistence -------------------------------------------------------
    /** Serialize / restore tabs for this module. Plain object � no React hooks. */
    tabPersistence?: TabPersistence;

    // -- Tab close ------------------------------------------------------------
    /**
     * Plain function called when ANY tab closes. Guard on `tab.type` and only
     * act on types this module owns. Read store state imperatively via the
     * Zustand `getXState()` accessors — no hooks here, this runs outside React.
     */
    onTabClose?: (tab: BaseTab) => void;

    // -- Tab flags ------------------------------------------------------------
    /**
     * Static flags that customize shell rendering for this module's tab types.
     * Replaces hardcoded `tab.type === shellConstants.xxx` checks in shell components.
     */
    tabFlags?: {
        /** Skip the "deleted" strikethrough / [Deleted] label for these tabs (e.g. K knowledge nodes) */
        noDeletedStyle?: boolean;
    };

    // -- Shortcuts ------------------------------------------------------------
    /**
     * Hook returning keyboard shortcuts contributed by this module.
     * Called once per render inside useTabBarShortcuts.
     */
    useShortcuts?: () => ShortcutDefinition[];

    // -- IsInModule -----------------------------------------------------------
    /**
     * Hook returning a predicate: �is this tab currently active in the sidebar module?�
     * Used by TabBar to highlight tabs that belong to the current module view.
     * Each handler should return false for tab types it doesn't own.
     */
    useIsInModule?: () => (tab: BaseTab) => boolean;

    // -- TabActivate ----------------------------------------------------------
    /**
     * Plain function called when the active tab changes via `updateActiveTab`.
     * Use for feature-specific side-effects: e.g. workspace tree selection + scroll.
     * `tab` is null when all tabs are closed.
     * NOT called by `setNewTabAnd` (programmatic switches without UI side-effects).
     * Read store state via Zustand `getXState()` accessors.
     */
    onTabActivate?: (tab: BaseTab | null) => void;

    // -- BreadcrumbBuilder ----------------------------------------------------
    /**
     * Plain function: build a breadcrumb for a tab. Return undefined to skip
     * (shell tries the next module, then produces nothing).
     * Read store state via Zustand `getXState()` accessors.
     */
    buildBreadcrumb?: (tab: BaseTab) => import("../utils/breadcrumb.utils").BreadcrumbItem[] | undefined;

    /**
     * Hook returning a scalar that signals "breadcrumbs must be regenerated".
     * TabBar watches this value as an effect dependency.
     * Example: workspace module returns currentWorkspace?.id.
     */
    useBreadcrumbTrigger?: () => unknown;

    // -- GlobalInit ---------------------------------------------------------------
    /**
     * Hook called unconditionally at app startup, regardless of which sidebar module is active.
     * Use for data fetching or tab initialization that must run even when this module's
     * sidebar view is not mounted (e.g. loading projects for a pinned MultiProject tab).
     * Runs inside GlobalModuleInit which is always mounted in VSCodeLayout.
     */
    useGlobalInit?: () => void;

    // -- BeforeModuleSwitch ---------------------------------------------------
    /**
     * Hook returning a guard called before the active sidebar module changes.
     * Return false (or a Promise resolving to false) to cancel the switch.
     * Example: workspace saves unsaved notes before navigating away.
     */
    useOnBeforeModuleSwitch?: () => () => unknown;

    // -- PanelTabs (hook-based) -----------------------------------------------
    /**
     * Hook returning bottom-panel tab definitions for this module.
     * Use instead of the static `panelTabs` when tab definitions need
     * React state / store access (e.g. to wire up an onLeave callback).
     * If both are provided, `usePanelTabs` takes precedence.
     */
    usePanelTabs?: () => PanelTabDefinition[];

    // -- BackButton (hook-based) ----------------------------------------------
    /**
     * Hook returning a synchronous back-button resolver for the active tab.
     * Called with hook access � can read from stores (e.g. projects list).
     * Return null if this module doesn't own the active tab.
     */
    useGetBackButton?: () => (tab: BaseTab) => { link: string; label: string } | null;

    /**
     * Plain async fallback for back-button resolution when store data is not yet loaded.
     * No React hooks � receives userToken, fetches from API, returns result or null.
     */
    getBackButtonAsync?: (tab: BaseTab, userToken: string) => Promise<{ link: string; label: string } | null>;

    // ── ActivityBar ──────────────────────────────────────────────────────────
    icon: LucideIcon;
    label: string;
    /**
     * Optional hook that returns a badge count (e.g. daily review due count).
     * Called as a React hook inside a per-module component, so hooks rules apply.
     */
    useBadge?: () => number;

    // ── VSSideBar ────────────────────────────────────────────────────────────
    /** Component rendered inside the sidebar when this module is active */
    SidebarView: ComponentType;

    // ── VSEditorArea ─────────────────────────────────────────────────────────
    /** Map of tab.type → EditorPanel component */
    editorPanels: Partial<Record<string, ComponentType<{ tab: BaseTab }>>>;

    /**
     * Whether to keep editor panels mounted (hidden) instead of unmounting on tab switch.
     * Useful for panels that hold expensive context/state (e.g. K knowledge editor).
     */
    keepAliveTabTypes?: string[];

    // ── VSPanel ──────────────────────────────────────────────────────────────
    /** Bottom-panel tabs contributed by this module */
    panelTabs?: PanelTabDefinition[];

    // ── TabBar ───────────────────────────────────────────────────────────────
    /**
     * Returns the visual metadata (icon + color) for a tab button.
     * Called for every tab whose type belongs to this module's editorPanels.
     * Return null to fall back to the default FileText icon.
     */
    getTabMeta?: (tab: BaseTab) => TabMeta | null;

    /**
     * If this tab acts as a group header (e.g. a Task tab groups its child note/ws tabs),
     * return a unique group key string. Return null/undefined otherwise.
     * Child membership is already encoded in tab.openedBy.link — TabBar matches them automatically.
     */
    getTabGroupKey?: (tab: BaseTab) => string | null;

    // ── EditorToolbar ────────────────────────────────────────────────────────
    /**
     * Derive a back button for a tab that doesn't have tab.openedBy set.
     * Pure function — receives tab + context (e.g. projects array).
     * Return null if this module doesn't provide a back button.
     */
    getBackButton?: (tab: BaseTab, context: { projects: any[] }) => { link: string; label: string } | null;

    /** filterRegistry view key for this module's main grid. null = no filterable grid. */
    filterViewKey?: string | null;
}

