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

// ─── Contract ────────────────────────────────────────────────────────────────

export interface PanelTabDefinition {
    id: string;
    label: string;
    icon: LucideIcon;
    /** Receives the currently active editor tab (null if none open) */
    Content: ComponentType<{ activeTab: BaseTab | null }>;
}

/** Visual metadata for a tab button in the TabBar */
export interface TabMeta {
    /** Icon to render inside the tab button */
    icon: ReactNode;
    /** Hex color for the icon / active border */
    color: string;
}

export interface ModuleDefinition {
    /** Unique module ID — must match constants.modules.* value */
    id: string;

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
}

// ─── Registry ────────────────────────────────────────────────────────────────

const _registry: ModuleDefinition[] = [];

export const moduleRegistry = {
    register(def: ModuleDefinition): void {
        if (_registry.find((m) => m.id === def.id)) {
            console.warn(`[moduleRegistry] Module "${def.id}" is already registered. Skipping.`);
            return;
        }
        _registry.push(def);
    },

    getAll(): ModuleDefinition[] {
        return _registry;
    },

    getById(id: string): ModuleDefinition | undefined {
        return _registry.find((m) => m.id === id);
    },

    /** Returns the EditorPanel component for a given tab type, searching all modules */
    getEditorPanel(tabType: string): ComponentType<{ tab: BaseTab }> | null {
        for (const m of _registry) {
            if (m.editorPanels[tabType]) return m.editorPanels[tabType]!;
        }
        return null;
    },

    /** Returns tab visual metadata for a tab button, searching all modules */
    getTabMeta(tab: BaseTab): TabMeta | null {
        for (const m of _registry) {
            if (m.editorPanels[tab.type] && m.getTabMeta) {
                return m.getTabMeta(tab);
            }
        }
        return null;
    },

    /** Returns the group key if this tab is a group leader (e.g. task tab), else null */
    getTabGroupKey(tab: BaseTab): string | null {
        for (const m of _registry) {
            if (m.editorPanels[tab.type] && m.getTabGroupKey) {
                return m.getTabGroupKey(tab);
            }
        }
        return null;
    },

    /** Returns all panel tab definitions for a given active module */
    getPanelTabs(activeModuleId: string): PanelTabDefinition[] {
        return _registry.find((m) => m.id === activeModuleId)?.panelTabs ?? [];
    },

    /** Returns all tab types that should be kept alive (not unmounted on switch) */
    getKeepAliveTabTypes(): string[] {
        return _registry.flatMap((m) => m.keepAliveTabTypes ?? []);
    },

    /** Returns a back button for a tab without openedBy, or null */
    getBackButton(tab: BaseTab, context: { projects: any[] }): { link: string; label: string } | null {
        for (const m of _registry) {
            if (m.editorPanels[tab.type] && m.getBackButton) {
                const result = m.getBackButton(tab, context);
                if (result) return result;
            }
        }
        return null;
    },
};
