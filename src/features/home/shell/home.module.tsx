import { Home } from "lucide-react";
import { shellConstants } from "@/shell";
import type { ModuleDefinition, TabMeta } from "@/shell";
import { HomePanel } from "../Components/HomePanel";
import { homeConstants } from "../home.constants";

const HomeEditorPanel = () => <HomePanel />;
const HomeSidebar = () => null;

const getHomeTabMeta = (): TabMeta => ({
    icon: <Home className="w-4 h-4" style={{ color: homeConstants.color }} />,
    color: homeConstants.color,
});

/**
 * Homepage — progress dashboard (TungRoot #1481). Not in the activity bar: opened by clicking the
 * app logo, and shown by the editor area whenever no tab is open.
 */
export const homeModule: ModuleDefinition = {
    id: homeConstants.moduleId,
    icon: Home,
    label: "Home",
    hideFromActivityBar: true,
    hideRightSideBarFilter: true,
    SidebarView: HomeSidebar,
    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.home]: HomeEditorPanel,
    },
    getTabMeta: getHomeTabMeta,
    filterViewKey: null,
};
