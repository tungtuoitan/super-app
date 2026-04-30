import type { OrchestratorContextMenuType } from "./ContextMenu.store";

export type ContextMenuPlugin = {
    handles: OrchestratorContextMenuType[];
    component: React.ComponentType;
};

const _map = new Map<OrchestratorContextMenuType, React.ComponentType>();

export const contextMenuRegistry = {
    register(plugin: ContextMenuPlugin) {
        plugin.handles.forEach((type) => _map.set(type, plugin.component));
    },
    get(type: OrchestratorContextMenuType): React.ComponentType | null {
        return _map.get(type) ?? null;
    },
};
