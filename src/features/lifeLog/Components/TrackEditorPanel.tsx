/**
 * TrackEditorPanel - Editor tab wrapper for a LifeLog Track
 */

import { useEffect } from "react";
import { TrackGeneral } from "./TrackGeneral";
import type { BaseTab } from "@/shell";
import type { LifeLogTrack } from "@/features/lifeLog/types/lifeLog.types";
import { useEditorTabBarHelper } from "@/shell";

interface TrackEditorPanelProps {
    tab: BaseTab;
}

export function TrackEditorPanel({ tab }: TrackEditorPanelProps) {
    const { patchTab } = useEditorTabBarHelper();
    const track = tab.data as LifeLogTrack;

    useEffect(() => {
        patchTab(tab.id, { hasUnsavedChanges: JSON.stringify(tab.data) !== JSON.stringify(tab.data0) });
    }, [tab.data, tab.id]);

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <div className="flex flex-col h-full w-full bg-background overflow-auto">
                <TrackGeneral trackId={track.id} tabId={tab.id} />
            </div>
        </div>
    );
}
