/**
 * LifeLogGraphPanel - Track Activity graph rendered in a VSCode editor tab
 */

import { TrackGraphContent } from "./TrackTimelineSheet";

export function LifeLogGraphPanel() {
    return (
        <div className="w-full h-full flex flex-col bg-background overflow-hidden">
            <TrackGraphContent />
        </div>
    );
}
