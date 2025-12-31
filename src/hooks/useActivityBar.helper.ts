import { useNavigationStore } from "@/contexts/NavigationContext";
import { useActivityBarStore } from "@/store/index";
import type { ActivityBarView } from "@/utils/constants";

export interface UseActivityBarHelperReturn {
    handleActivityClick: (view: ActivityBarView) => void;

    // Sidebar
    toggleSideBar: () => void;
}

export const useActivityBarHelper = (): UseActivityBarHelperReturn => {
    const { activeView, navigateToView } = useNavigationStore();
    const { isSideBarVisible, setIsSideBarVisible } = useActivityBarStore();

    const toggleSideBar = () => {
        setIsSideBarVisible(!isSideBarVisible);
    };

    const handleActivityClick = (view: ActivityBarView) => {
        // Do nothing if clicking the already active view
        if (activeView === view) {
            return;
        }

        // Navigate to different view
        navigateToView(view);
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
