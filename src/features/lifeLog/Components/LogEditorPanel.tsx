/**
 * LogEditorPanel - Editor tab wrapper for a LifeLog Log
 */

import { useEffect } from "react";
import { useEditorTabsStore } from "@/store/index";
import { LogDetailContent } from "./LogDetailContent";
import type { BaseTab } from "@/types/editor/tab.types";
import type { LifeLogLog } from "@/types/lifeLog.types";

interface LogEditorPanelProps {
    tab: BaseTab;
}

export function LogEditorPanel({ tab }: LogEditorPanelProps) {
    const { setOpenTabs } = useEditorTabsStore();
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
    }, [tab.data, tab.id, setOpenTabs]);

    return (
        <div className="flex-1 flex flex-col bg-editor-bg overflow-hidden">
            <LogDetailContent logId={log.id} tabId={tab.id} />
        </div>
    );
}
