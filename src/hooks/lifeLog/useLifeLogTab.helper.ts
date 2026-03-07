/**
 * LifeLog Tab Helper Hook
 * Manages opening/closing log editor tabs
 */

import { useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/types/editor/tab.types";
import type { LifeLogLog, LifeLogTrack } from "@/types/lifeLog.types";

export function useLifeLogTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabsStore();

    const openLogTab = useCallback((log: LifeLogLog) => {
        const existing = openTabs.find(
            (t) => t.type === constants.vscode.tab.tabTypes.lifeLog && (t.data as LifeLogLog).id === log.id
        );
        if (existing) {
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `lifelog-tab-${log.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.lifeLog,
                data: log,
                data0: log,
                title: log.title || log.type || "Log",
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
        window.dispatchEvent(new CustomEvent("lifelog-tab-opened"));
    }, [openTabs, setOpenTabs, setActiveTabId]);

    const openTrackTab = useCallback((track: LifeLogTrack) => {
        const existing = openTabs.find(
            (t) => t.type === constants.vscode.tab.tabTypes.lifeLogTrack && (t.data as LifeLogTrack).id === track.id
        );
        if (existing) {
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `lifelog-track-tab-${track.id}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.lifeLogTrack,
                data: track,
                data0: track,
                title: track.name || "Track",
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
        window.dispatchEvent(new CustomEvent("lifelog-tab-opened"));
    }, [openTabs, setOpenTabs, setActiveTabId]);

    const openGraphTab = useCallback(() => {
        const existing = openTabs.find((t) => t.type === constants.vscode.tab.tabTypes.lifeLogGraph);
        if (existing) {
            setActiveTabId(existing.id);
        } else {
            const newTab: BaseTab = {
                id: `lifelog-graph-tab-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.lifeLogGraph,
                data: {} as any,
                data0: {} as any,
                title: "Track Activity",
                hasUnsavedChanges: false,
            };
            setOpenTabs((prev) => [...prev, newTab]);
            setActiveTabId(newTab.id);
        }
        window.dispatchEvent(new CustomEvent("lifelog-tab-opened"));
    }, [openTabs, setOpenTabs, setActiveTabId]);

    const closeLogTab = useCallback((tabId: string) => {
        setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
    }, [setOpenTabs]);

    const updateLogInTabs = useCallback((logId: number, updatedFields: Partial<LifeLogLog>) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.type !== constants.vscode.tab.tabTypes.lifeLog) return t;
                const log = t.data as LifeLogLog;
                if (log.id !== logId) return t;
                const updated = { ...log, ...updatedFields };
                return { ...t, data: updated, title: updated.title || updated.type || "Log" };
            })
        );
    }, [setOpenTabs]);

    return { openLogTab, openTrackTab, openGraphTab, closeLogTab, updateLogInTabs };
}
