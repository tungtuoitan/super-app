/**
 * TrackingGraphPanel - Main editor panel for tracking graph
 */

import { useEffect } from "react";
import { useTrackingGraphStore } from "@/store/tracking/TrackingGraph.store";
import { useTrackingDataHelper } from "@/hooks/tracking/useTrackingData.helper";
import { TrackingGraphContent } from "./TrackingGraphContent";
import { BaseTab } from "@/types/editor/tab.types";
import type { TrackingGraphTabData } from "@/types/tracking.types";
import { Loader2 } from "lucide-react";

interface TrackingGraphPanelProps {
    tab: BaseTab;
}

export function TrackingGraphPanel({ tab }: TrackingGraphPanelProps) {
    const tabData = tab.data as TrackingGraphTabData;
    const { isLoading, currentFolderId } = useTrackingGraphStore();
    const { loadTrackingData } = useTrackingDataHelper();

    // Load data when tab opens or folder changes
    useEffect(() => {
        if (tabData.folderId && tabData.folderId !== currentFolderId) {
            loadTrackingData(tabData.folderId, tabData.folderName);
        }
    }, [tabData.folderId, tabData.folderName, currentFolderId, loadTrackingData]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-editor-bg">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Loading tracking data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <TrackingGraphContent />
        </div>
    );
}
