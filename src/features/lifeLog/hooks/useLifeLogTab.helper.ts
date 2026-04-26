/**
 * LifeLog Tab Helper Hook
 * Manages opening/closing log editor tabs
 */


import { useEditorTabBarStore } from "@/store/index";
import { constants } from "@/utils/constants";
import type { BaseTab } from "@/shell/types/tab.types";
import type { LifeLogLog, LifeLogTrack } from "@/features/lifeLog/types/lifeLog.types";
import { useLifeLogStore } from "../store/useLifeLog.store";

export function useLifeLogTabHelper() {
    const { openTabs, setOpenTabs, setActiveTabId } = useEditorTabBarStore();
    const { setLogs, setTracks } = useLifeLogStore();

    const openLogTab = (log: LifeLogLog) => {
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
    }

    /** Create temp log (negative ID), push to store, open tab — no API call */
    const openNewLogTab = () => {
        const tempId = -Date.now();
        const now = new Date();
        const tempLog: LifeLogLog = {
            id: tempId,
            type: "note",
            title: "",
            description: undefined,
            isSensitive: false,
            location: undefined,
            trackId: undefined,
            occurAt: now,
            createdAt: now,
            updatedAt: undefined,
            deletedAt: null,
        };
        setLogs((prev) => [tempLog, ...prev]);
        const newTab: BaseTab = {
            id: `lifelog-tab-${tempId}`,
            type: constants.vscode.tab.tabTypes.lifeLog,
            data: tempLog,
            data0: tempLog,
            title: "New Log",
            hasUnsavedChanges: true,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
        window.dispatchEvent(new CustomEvent("lifelog-tab-opened"));
    }

    const openTrackTab = (track: LifeLogTrack) => {
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
    }

    /** Create temp track (negative ID), push to store, open tab — no API call */
    const openNewTrackTab = () => {
        const tempId = -Date.now();
        const now = new Date();
        const tempTrack: LifeLogTrack = {
            id: tempId,
            name: "New Track",
            description: undefined,
            emoji: undefined,
            color: undefined,
            isSensitive: false,
            createdAt: now,
            updatedAt: undefined,
            deletedAt: null,
        };
        setTracks((prev) => [tempTrack, ...prev]);
        const newTab: BaseTab = {
            id: `lifelog-track-tab-${tempId}`,
            type: constants.vscode.tab.tabTypes.lifeLogTrack,
            data: tempTrack,
            data0: tempTrack,
            title: "New Track",
            hasUnsavedChanges: true,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
        window.dispatchEvent(new CustomEvent("lifelog-tab-opened"));
    }

    const openGraphTab = () => {
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
    }

    const closeLogTab = (tabId: string) => {
        setOpenTabs((prev) => prev.filter((t) => t.id !== tabId));
    }

    const updateLogInTabs = (logId: number, updatedFields: Partial<LifeLogLog>) => {
        setOpenTabs((prev) =>
            prev.map((t) => {
                if (t.type !== constants.vscode.tab.tabTypes.lifeLog) return t;
                const log = t.data as LifeLogLog;
                if (log.id !== logId) return t;
                const updated = { ...log, ...updatedFields };
                return { ...t, data: updated, title: updated.title || updated.type || "Log" };
            })
        );
    }

    return { openLogTab, openNewLogTab, openTrackTab, openNewTrackTab, openGraphTab, closeLogTab, updateLogInTabs };
}
