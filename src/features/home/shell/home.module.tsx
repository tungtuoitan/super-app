import { Home } from "lucide-react";
import type { ModuleDefinition } from "@/shell";
import { HomePanel } from "../Components/HomePanel";
import { homeConstants } from "../home.constants";

const HomeSidebar = () => null;

/**
 * Homepage — progress dashboard (TungRoot #1481). Not a tab and not in the activity bar: shown over
 * the whole workbench (HomeView) at startup and when the app logo is clicked.
 */
export const homeModule: ModuleDefinition = {
    id: homeConstants.moduleId,
    icon: Home,
    label: "Home",
    hideFromActivityBar: true,
    hideRightSideBarFilter: true,
    SidebarView: HomeSidebar,
    HomeView: HomePanel,
    editorPanels: {},
    filterViewKey: null,
};
