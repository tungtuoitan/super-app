import { useOrchestratorContextMenuStore } from "./ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "./useOrchestratorContextMenu.helper";

export function useMenuContext() {
    const store = useOrchestratorContextMenuStore();
    const helper = useOrchestratorContextMenuHelper();
    return { ...store, ...helper };
}
