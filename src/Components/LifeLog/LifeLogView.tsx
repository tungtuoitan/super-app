/**
 * LifeLogView - Sidebar for the LifeLog module
 * Contains TrackPanel (quick tap) + LogList
 */

import { TrackPanel } from "./TrackPanel";
import { LogList } from "./LogList";
import { useLifeLogHeadless } from "@/HeadlessComponents/lifeLog/useLifeLog.headless";

export function LifeLogView() {
    // Side-effects: load logs + tracks on mount
    useLifeLogHeadless();

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <LogList />
            <TrackPanel />
        </div>
    );
}
