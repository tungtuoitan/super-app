/**
 * LifeLogGraphPanel - Track Activity graph rendered in a VSCode editor tab
 */

import { TrackGraphContent } from "./TrackTimelineSheet";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import type { LifeLogLog } from "@/types/lifeLog.types";

export function LifeLogGraphPanel() {
    const { openLogTab } = useLifeLogTabHelper();

    const handleLogClick = (log: LifeLogLog) => {
        openLogTab(log);
    };

    return (
        <div className="w-full h-full flex flex-col bg-background overflow-hidden">
            <TrackGraphContent onLogClick={handleLogClick} />
        </div>
    );
}
