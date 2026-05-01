import { useWorkspaceHelper } from "@/features/workspace";
import {ActivityBarView, useSideBarStore} from "@/shell";
import {STORAGE_KEYS, storageService} from "@/shared";
import {useActivityBarStore} from "../store/ActivityBar.store";

export interface UseActivityBarHelperReturn {
    handleActivityClick: (view: ActivityBarView) => void;
    toggleSideBar: () => void;
}

export const useActivityBarHelper = (): UseActivityBarHelperReturn => {
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();
    const { saveNewsBeforeNavigate } = useWorkspaceHelper();
    const { setModuleName, moduleName } = useSideBarStore();

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
