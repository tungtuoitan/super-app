/**
 * Module Registry â€” VSCode Shell Extension Points
 *
 * Shell (ActivityBar, VSSideBar, VSEditorArea, VSPanel, TabBar) does NOT import features directly.
 * Instead, each feature registers a ModuleDefinition here.
 * Shell reads from this registry at render time.
 *
 * Dependency direction:
 *   features/xxx/shell/xxx.module.tsx  â†’  moduleRegistry  â†  shell components
 */

import type { ComponentType, ReactNode } from "react";
import type { BaseTab } from "@/shell";
import {ModuleDefinition, PanelTabDefinition, TabMeta, TabPersistence} from "./types/moduleRegistry.type";


const _registry: ModuleDefinition[] = [];
const _globalPanelTabs: PanelTabDefinition[] = [];

export const moduleRegistry = {
    register(def: ModuleDefinition): void {
        const existingIndex = _registry.findIndex((m) => m.id === def.id);
        if (existingIndex >= 0) {
            _registry[existingIndex] = def;
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

    /** Register a panel tab that is not tied to a specific module (e.g. noteDetail shown when activeTab is note) */
    registerGlobalPanelTab(tab: PanelTabDefinition): void {
        if (!_globalPanelTabs.find((t) => t.id === tab.id)) {
            _globalPanelTabs.push(tab);
        }
    },

    getGlobalPanelTabs(): PanelTabDefinition[] {
        return _globalPanelTabs;
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

    /** Returns the TabPersistence handler for a given tab type, or null if none registered */
    getTabPersistence(tabType: string): TabPersistence | null {
        for (const m of _registry) {
            if (m.editorPanels[tabType] && m.tabPersistence) {
                return m.tabPersistence;
            }
        }
        return null;
    },

    /** Returns tab display flags for a given tab type (empty object if none registered) */
    getTabFlags(tabType: string): NonNullable<ModuleDefinition["tabFlags"]> {
        for (const m of _registry) {
            if (m.editorPanels[tabType] && m.tabFlags) {
                return m.tabFlags;
            }
        }
        return {};
    },
};


