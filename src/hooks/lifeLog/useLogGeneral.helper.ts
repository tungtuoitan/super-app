/**
 * LogGeneral Helper Hook
 * Business logic for editing log fields in the editor tab
 */

import { useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import type { LifeLogLog } from "@/types/lifeLog.types";

export function useLogGeneralHelper() {
    const { openTabs, activeTabId, setOpenTabs } = useEditorTabsStore();

    const tab = openTabs.find((t) => t.id === activeTabId);
    const log = tab?.data as LifeLogLog | undefined;

    const handleFieldChange = useCallback(<K extends keyof LifeLogLog>(field: K, value: LifeLogLog[K]) => {
        if (!activeTabId) return;
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === activeTabId
                    ? { ...t, data: { ...t.data as LifeLogLog, [field]: value }, hasUnsavedChanges: true }
                    : t
            )
        );
    }, [activeTabId, setOpenTabs]);

    return { log, handleFieldChange };
}
