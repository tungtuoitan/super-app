import { BookOpen } from "lucide-react";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell";
import type { BaseTab } from "@/shell";
import WikiGraphView from "../Components/WikiGraphView/WikiGraphView";
import WikiInfoPanel from "../Components/WikiInfoPanel/WikiInfoPanel";

const WIKI_COLOR = "#8b5cf6";

const WikiInfoPanelAdapter = ({ tab }: { tab: BaseTab }) => (
    <WikiInfoPanel tab={tab} />
);

export const wikiModule: ModuleDefinition = {
    id: constants.modules.wiki,
    icon: BookOpen,
    label: constants.vscode.displayNames.wiki,

    SidebarView: WikiGraphView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.wikiInfo]: WikiInfoPanelAdapter,
    },

    keepAliveTabTypes: [constants.vscode.tab.tabTypes.wikiInfo],

    getTabMeta: () => ({
        icon: <BookOpen className="w-4 h-4" style={{ color: WIKI_COLOR }} />,
        color: WIKI_COLOR,
    }),
};
