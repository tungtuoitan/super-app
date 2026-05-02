import type { ActivityBarView } from "../types/activeBarView";
import { useSideBarStore } from "../store/SideBar.store";
import {STORAGE_KEYS, storageService} from "@/shared";
import {useActivityBarStore} from "../store/ActivityBar.store";
import { moduleRegistry } from "@/shell/moduleRegistry";

export interface UseActivityBarHelperReturn {
    handleActivityClick: (view: ActivityBarView) => void;
    toggleSideBar: () => void;
}

export const useActivityBarHelper = (): UseActivityBarHelperReturn => {
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { setModuleName, moduleName } = useSideBarStore();

    // Collect pre-switch guards from all modules (e.g. workspace saves unsaved notes)
    // eslint-disable-next-line react-hooks/rules-of-hooks -- registry is immutable after startup; hook count is stable
    const beforeSwitchGuards = moduleRegistry.getAll()
        .filter((m) => m.useOnBeforeModuleSwitch != null)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        .map((m) => m.useOnBeforeModuleSwitch!());

    const toggleSideBar = () => {
        setIsSideBarVisible(!isSideBarVisible);
    };

    const handleActivityClick = (view: string) => {
        // Do nothing if clicking the already active view
        if (moduleName === view) {
            return;
        }

        // Run each module's pre-switch guard; cancel if any returns false
        for (const guard of beforeSwitchGuards) {
            const result = guard();
            if (result === false) return;
        }

        setModuleName(view)
        storageService.set(`${STORAGE_KEYS.MODULE_NAME}`, view)

        // Ensure sidebar is visible when switching views
        if (!isSideBarVisible) {
            setIsSideBarVisible(true);
        }
    };

    return {
        handleActivityClick,
        toggleSideBar,
    };
};
