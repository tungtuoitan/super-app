import {MenuContextType} from "./MenuContext.store";

export type MenuContextPlugin = {
    handles: MenuContextType[];
    component: React.ComponentType;
};

const _map = new Map<MenuContextType, React.ComponentType>();

export const menuContextRegistry = {
    register(plugin: MenuContextPlugin) {
        plugin.handles.forEach((type) => _map.set(type, plugin.component));
    },
    get(type: MenuContextType): React.ComponentType | null {
        return _map.get(type) ?? null;
    },
};
