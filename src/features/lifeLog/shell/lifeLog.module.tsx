import { Shell, BarChart3, FileText } from "lucide-react";
import { LifeLogView } from "../Components/LifeLogView";
import { LogEditorPanel } from "../Components/LogEditorPanel";
import { LifeLogGraphPanel } from "../Components/LifeLogGraphPanel";
import { TrackEditorPanel } from "../Components/TrackEditorPanel";
import { LogTypeIcon } from "../Components/LogTypeIcon";
import { TrackIconDisplay } from "../Components/TrackIconDisplay";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { constants } from "@/utils/constants";
import type { LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";
import type { ModuleDefinition, TabMeta } from "@/shell/moduleRegistry";
import type { BaseTab } from "@/types/editor/tab.types";

const LifeLogGraphPanelAdapter = () => <LifeLogGraphPanel />;

/**
 * LifeLogTabIcon — hook-based component so it can read useLifeLogStore.
 * Called as a JSX element inside getTabMeta, so hooks rules are satisfied.
 */
function LifeLogTabIcon({ tab }: { tab: BaseTab }) {
    const { tracks } = useLifeLogStore();
    const className = "w-4 h-4";

    if (tab.type === constants.vscode.tab.tabTypes.lifeLogGraph) {
        return <BarChart3 className={className} style={{ color: "#6366f1" }} />;
    }
    if (tab.type === constants.vscode.tab.tabTypes.lifeLogTrack) {
        const track = tab.data as LifeLogLog & { emoji?: string; color?: string };
        return <TrackIconDisplay value={track.emoji} trackColor={track.color} size="sm" />;
    }

    const log = tab.data as LifeLogLog;
    const track = log.trackId ? tracks.find((t) => t.id === log.trackId) : undefined;

    if (log.type === "track") {
        return <TrackIconDisplay value={track?.emoji} trackColor={track?.color} size="sm" />;
    }
    if (!log.type) {
        return <FileText className={className} style={{ color: "#9ca3af" }} />;
    }
    return <LogTypeIcon type={log.type} className={className} />;
}

function getLifeLogTabMeta(tab: BaseTab): TabMeta {
    return {
        icon: <LifeLogTabIcon tab={tab} />,
        color: "#6366f1",
    };
}

export const lifeLogModule: ModuleDefinition = {
    id: constants.modules.lifeLog,
    icon: Shell,
    label: constants.vscode.displayNames.lifeLog,

    SidebarView: LifeLogView,

    editorPanels: {
        [constants.vscode.tab.tabTypes.lifeLog]: LogEditorPanel,
        [constants.vscode.tab.tabTypes.lifeLogGraph]: LifeLogGraphPanelAdapter,
        [constants.vscode.tab.tabTypes.lifeLogTrack]: TrackEditorPanel,
    },

    getTabMeta: getLifeLogTabMeta,
};
