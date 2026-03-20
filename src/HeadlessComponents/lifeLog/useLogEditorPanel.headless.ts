/**
 * LogEditorPanel Headless Hook
 * Side-effects: track unsaved changes on tab data
 */

import { useEffect } from "react";
import { useEditorTabsStore } from "@/store/index";

export function useLogEditorPanelHeadless() {
    const { openTabs, activeTabId, setOpenTabs } = useEditorTabsStore();
    const tab = openTabs.find((t) => t.id === activeTabId);

    useEffect(() => {
        if (!tab || !activeTabId) return;
        setOpenTabs((prev) =>
            prev.map((t) =>
                t.id === activeTabId
                    ? { ...t, hasUnsavedChanges: JSON.stringify(t.data) !== JSON.stringify(t.data0) }
                    : t
            )
        );
    }, [tab?.data, activeTabId, setOpenTabs]);
}
