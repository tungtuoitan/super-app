/**
 * LogEditorPanel - Editor tab wrapper for a LifeLog Log
 */

import { useEffect } from "react";
import { LogDetailContent } from "./LogDetailContent";
import type { BaseTab } from "@/shell";
import type { LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";
import { useEditorTabBarHelper } from "@/shell";

interface LogEditorPanelProps {
    tab: BaseTab;
}

export function LogEditorPanel({ tab }: LogEditorPanelProps) {
    const { patchTab } = useEditorTabBarHelper();
    const log = tab.data as LifeLogLog;

    // Track unsaved changes
    useEffect(() => {
        patchTab(tab.id, { hasUnsavedChanges: JSON.stringify(tab.data) !== JSON.stringify(tab.data0) });
    }, [tab.data, tab.id]);

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <LogDetailContent logId={log.id} tabId={tab.id} />
        </div>
    );
}
