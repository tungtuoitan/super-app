/**
 * Module Registry — VSCode Shell Extension Points
 *
 * Shell (ActivityBar, VSSideBar, VSEditorArea, VSPanel) does NOT import features directly.
 * Instead, each feature registers a ModuleDefinition here.
 * Shell reads from this registry at render time.
 *
 * Dependency direction:
 *   features/xxx/shell/xxx.module.ts  →  moduleRegistry  ←  shell components
 */

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { BaseTab } from "@/types/editor/tab.types";

// ─── Contract ────────────────────────────────────────────────────────────────

export interface PanelTabDefinition {
    id: string;
    label: string;
    icon: LucideIcon;
    /** Receives the currently active editor tab (null if none open) */
    Content: ComponentType<{ activeTab: BaseTab | null }>;
}

export interface ModuleDefinition {
    /** Unique module ID — must match constants.modules.* value */
    id: string;

    // ActivityBar
    icon: LucideIcon;
    label: string;
    /**
     * Optional hook that returns a badge count (e.g. daily review due count).
     * Called as a React hook inside a per-module component, so hooks rules apply.
     */
    useBadge?: () => number;

    // VSSideBar — component rendered inside the sidebar when this module is active
    SidebarView: ComponentType;

    // VSEditorArea — map of tab.type → EditorPanel component
    // Each entry: { [tabType]: EditorPanelComponent }
    editorPanels: Partial<Record<string, ComponentType<{ tab: BaseTab }>>>;

    // VSPanel — optional bottom-panel tabs contributed by this module
    panelTabs?: PanelTabDefinition[];

    /**
     * Whether to keep editor panels mounted (hidden) instead of unmounting on tab switch.
     * Useful for panels that hold expensive context/state (e.g. K knowledge editor).
     * Keys are tabTypes that need keep-alive behaviour.
     */
    keepAliveTabTypes?: string[];
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

    /** Returns all panel tab definitions across all modules for a given active module */
    getPanelTabs(activeModuleId: string): PanelTabDefinition[] {
        const module = _registry.find((m) => m.id === activeModuleId);
        return module?.panelTabs ?? [];
    },

    /** Returns all tab types that should be kept alive (not unmounted on switch) */
    getKeepAliveTabTypes(): string[] {
        return _registry.flatMap((m) => m.keepAliveTabTypes ?? []);
    },
};
