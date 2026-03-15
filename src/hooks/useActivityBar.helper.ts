import { useNavigationStore } from "@/contexts/NavigationContext";
import { useActivityBarStore } from "@/store/index";
import { constants, type ActivityBarView } from "@/utils/constants";
import { useWorkspaceHelper } from "./workspace/useWorkspaceHelper";
import {useGridControlStore} from "@/store/grid/useGridControl.store";
import {STORAGE_KEYS, storageService} from "@/services/storage.service";

export interface UseActivityBarHelperReturn {
    handleActivityClick: (view: ActivityBarView) => void;
    toggleSideBar: () => void;
}

export const useActivityBarHelper = (): UseActivityBarHelperReturn => {
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();
    const { setModuleName, moduleName } = useGridControlStore();

    const toggleSideBar = () => {
        setIsSideBarVisible(!isSideBarVisible);
    };

    const handleActivityClick = (view: string) => {
        // Do nothing if clicking the already active view
        if (moduleName === view) {
            return;
        }

        const result = saveNewsBeforeNavigate();
        if (!result) {
            return;
        }
        setModuleName(view)
        storageService.set(`${STORAGE_KEYS.MODULE_NAME}`, view)

        // Navigate to different view
        // navigateToView(view);
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
