/**
 * LifeLogView - Sidebar for the LifeLog module
 * Contains TrackPanel (quick tap) + LogList
 */

import { TrackPanel } from "./TrackPanel";
import { LogList } from "./LogList";

export function LifeLogView() {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            <LogList />
            <TrackPanel />
        </div>
    );
}
