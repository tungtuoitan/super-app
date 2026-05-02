/**
 * LifeLog Tab Helper Hook
 * Manages opening/closing log editor tabs.
 * Delegates all tab lifecycle to shell — never builds BaseTab directly.
 */

import { shellConstants } from "@/shell";
import { useEditorTabBarHelper } from "@/shell";
import type { LifeLogLog, LifeLogTrack } from "../types/lifeLog.types";
import { useLifeLogStore } from "../store/useLifeLog.store";

const LOG_TYPE   = shellConstants.vscode.tab.tabTypes.lifeLog;
const TRACK_TYPE = shellConstants.vscode.tab.tabTypes.lifeLogTrack;
const GRAPH_TYPE = shellConstants.vscode.tab.tabTypes.lifeLogGraph;

const dispatchOpened = () =>
    window.dispatchEvent(new CustomEvent(shellConstants.events.mobileTabOpened));

export function useLifeLogTabHelper() {
    const { openTab, openSingletonTab, closeTab, updateTabData } = useEditorTabBarHelper();
    const { setLogs, setTracks } = useLifeLogStore();

    const openLogTab = (log: LifeLogLog) => {
        openTab(log, LOG_TYPE, {
            title: log.title || log.type || "Log",
        });
        dispatchOpened();
    };

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
        openTab(tempLog, LOG_TYPE, {
            title: "New Log",
            hasUnsavedChanges: true,
        });
        dispatchOpened();
    };

    const openTrackTab = (track: LifeLogTrack) => {
        openTab(track, TRACK_TYPE, {
            title: track.name || "Track",
        });
        dispatchOpened();
    };

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
        openTab(tempTrack, TRACK_TYPE, {
            title: "New Track",
            hasUnsavedChanges: true,
        });
        dispatchOpened();
    };

    /** Singleton graph tab */
    const openGraphTab = () => {
        openSingletonTab(GRAPH_TYPE, { title: "Track Activity" });
        dispatchOpened();
    };

    const closeLogTab = (tabId: string) => {
        closeTab(tabId);
    };

    /**
     * Sync updated log data into any open tabs showing this log.
     */
    const updateLogInTabs = (logId: number, updatedFields: Partial<LifeLogLog>) => {
        updateTabData(
            LOG_TYPE,
            logId,
            (current: LifeLogLog) => ({ ...(current as LifeLogLog), ...updatedFields }),
            updatedFields.title || (updatedFields as LifeLogLog).type || undefined,
        );
    };

    return {
        openLogTab,
        openNewLogTab,
        openTrackTab,
        openNewTrackTab,
        openGraphTab,
        closeLogTab,
        updateLogInTabs,
    };
}
