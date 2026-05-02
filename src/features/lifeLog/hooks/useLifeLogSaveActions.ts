
import { constants } from "@/shared";
import { shellConstants } from "@/shell";
import { useLifeLogLogHelper } from "../hooks/useLifeLogLog.helper";
import { useLifeLogTrackHelper } from "../hooks/useLifeLogTrack.helper";
import { useLifeLogStore } from "../store/useLifeLog.store";
import { toLocalISOString } from "@/shared";
import type { BaseTab } from "@/shell";
import type { LifeLogLog, LifeLogTrack } from "@/features/lifeLog/types/lifeLog.types";
import {SaveActions} from "@/shell";
import { useEditorTabBarHelper } from "@/shell";

export function useLifeLogSaveActions(): SaveActions {
    const { upsertLog } = useLifeLogLogHelper();
    const { upsertTrack } = useLifeLogTrackHelper();
    const { setLogs, setTracks } = useLifeLogStore();
    const { patchTab, setActiveTabIdSilently } = useEditorTabBarHelper();

    const handles = (tabType: string) =>
        tabType === shellConstants.vscode.tab.tabTypes.lifeLog ||
        tabType === shellConstants.vscode.tab.tabTypes.lifeLogTrack;

    const onSave = async (tab: BaseTab) => {
        if (tab.type === shellConstants.vscode.tab.tabTypes.lifeLog) {
            const log = tab.data as LifeLogLog;
            const isNew = log.id <= 0;
            const tempId = log.id;
            const saved = await upsertLog({
                id: isNew ? 0 : log.id,
                type: log.type,
                trackId: log.trackId,
                title: log.title,
                description: log.description,
                isSensitive: log.isSensitive,
                location: log.location,
                occurAt: log.occurAt ? toLocalISOString(log.occurAt) ?? undefined : undefined,
            });
            if (saved) {
                if (isNew) {
                    const newTabId = `lifelog-tab-${saved.id}-${Date.now()}`;
                    setLogs((prev) => prev.map((l) => l.id === tempId ? saved : l));
                    patchTab(tab.id, { id: newTabId, data: saved, data0: saved, hasUnsavedChanges: false });
                    setActiveTabIdSilently(newTabId);
                } else {
                    patchTab(tab.id, (cur) => ({ data0: cur.data, hasUnsavedChanges: false }));
                }
            }
        } else if (tab.type === shellConstants.vscode.tab.tabTypes.lifeLogTrack) {
            const track = tab.data as LifeLogTrack;
            const isNew = track.id <= 0;
            const tempId = track.id;
            const saved = await upsertTrack({
                id: isNew ? 0 : track.id,
                name: track.name,
                description: track.description,
                emoji: track.emoji,
                color: track.color,
                isSensitive: track.isSensitive,
            });
            if (saved) {
                if (isNew) {
                    const newTabId = `lifelog-track-tab-${saved.id}-${Date.now()}`;
                    setTracks((prev) => prev.map((t) => t.id === tempId ? saved : t));
                    patchTab(tab.id, { id: newTabId, data: saved, data0: saved, hasUnsavedChanges: false });
                    setActiveTabIdSilently(newTabId);
                } else {
                    patchTab(tab.id, (cur) => ({ data0: cur.data, hasUnsavedChanges: false }));
                }
            }
        }
    }

    return { handles, onSave };
}


