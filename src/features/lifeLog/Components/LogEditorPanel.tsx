/**
 * LogEditorPanel - Editor tab wrapper for a LifeLog Log
 */

import { useEffect } from "react";
import { LogDetailContent } from "./LogDetailContent";
import type { BaseTab } from "@/shell";
import type { LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";
import {useEditorTabBarStore} from "@/shell";

interface LogEditorPanelProps {
    tab: BaseTab;
}

export function LogEditorPanel({ tab }: LogEditorPanelProps) {
    const { setOpenTabs } = useEditorTabBarStore();
    const log = tab.data as LifeLogLog;

    // Track unsaved changes
    useEffect(() => {
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === tab.id
                    ? { ...t, hasUnsavedChanges: JSON.stringify(t.data) !== JSON.stringify(t.data0) }
                    : t
            )
        );
    }, [tab.data, tab.id]);

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <LogDetailContent logId={log.id} tabId={tab.id} />
        </div>
    );
}
