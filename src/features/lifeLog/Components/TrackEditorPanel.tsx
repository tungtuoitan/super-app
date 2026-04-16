/**
 * TrackEditorPanel - Editor tab wrapper for a LifeLog Track
 */

import { useEffect } from "react";
import { useEditorTabsStore } from "@/store/index";
import { TrackGeneral } from "./TrackGeneral";
import type { BaseTab } from "@/types/editor/tab.types";
import type { LifeLogTrack } from "@/features/lifeLog/types/lifeLog.types";

interface TrackEditorPanelProps {
    tab: BaseTab;
}

export function TrackEditorPanel({ tab }: TrackEditorPanelProps) {
    const { setOpenTabs } = useEditorTabsStore();
    const track = tab.data as LifeLogTrack;

    useEffect(() => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tab.id
                    ? { ...t, hasUnsavedChanges: JSON.stringify(t.data) !== JSON.stringify(t.data0) }
                    : t
            )
        );
    }, [tab.data, tab.id, setOpenTabs]);

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <div className="flex flex-col h-full w-full bg-background overflow-auto">
                <TrackGeneral trackId={track.id} tabId={tab.id} />
            </div>
        </div>
    );
}
