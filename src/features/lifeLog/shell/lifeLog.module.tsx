import { Shell, BarChart3, FileText } from "lucide-react";
import { shellConstants } from "@/shell";
import { LifeLogView } from "../Components/LifeLogView";
import { LogEditorPanel } from "../Components/LogEditorPanel";
import { LifeLogGraphPanel } from "../Components/LifeLogGraphPanel";
import { TrackEditorPanel } from "../Components/TrackEditorPanel";
import { LogTypeIcon } from "../Components/LogTypeIcon";
import { TrackIconDisplay } from "../Components/TrackIconDisplay";
import { useLifeLogStore, getLifeLogState } from "../store/useLifeLog.store";
import { lifeLogService } from "../service/lifeLog.service";
import type { LifeLogLog, LifeLogTrack, LogType } from "../types/lifeLog.types";
import type { ModuleDefinition, TabMeta } from "@/shell";
import type { BaseTab } from "@/shell";
import type { KeywordPlugin } from "@/shell";
import { parseKeywordLink } from "@/shared";
import { useLifeLogSaveActions } from "../hooks/useLifeLogSaveActions";
import { useLifeLogTabHelper } from "../hooks/useLifeLogTab.helper";


const LifeLogGraphPanelAdapter = () => <LifeLogGraphPanel />;

function LifeLogTabIcon({ tab }: { tab: BaseTab }) {
    const { tracks } = useLifeLogStore();
    const className = "w-4 h-4";

    if (tab.type === shellConstants.vscode.tab.tabTypes.lifeLogGraph) {
        return <BarChart3 className={className} style={{ color: "#6366f1" }} />;
    }
    if (tab.type === shellConstants.vscode.tab.tabTypes.lifeLogTrack) {
        const track = tab.data as LifeLogLog & { emoji?: string; color?: string };
        return <TrackIconDisplay value={track.emoji} trackColor={track.color} size="sm" />;
    }

    const log = tab.data as LifeLogLog;
    const track = log.trackId ? tracks.find((t) => t.id === log.trackId) : undefined;

    if (log.type === "track") {
        return <TrackIconDisplay value={track?.emoji} trackColor={track?.color} size="sm" />;
    }
    if (!log.type) {
        return <FileText className={className} style={{ color: "#9ca3af" }} />;
    }
    return <LogTypeIcon type={log.type} className={className} />;
}

function getLifeLogTabMeta(tab: BaseTab): TabMeta {
    return {
        icon: <LifeLogTabIcon tab={tab} />,
        color: "#6366f1",
    };
}

export const lifeLogModule: ModuleDefinition = {
    id: "LifeLog",
    icon: Shell,
    label: "LifeLog",

    useSaveActions: useLifeLogSaveActions,

    useShortcuts: () => {
        const { openNewLogTab } = useLifeLogTabHelper();
        return [
            { key: "l", ctrl: true, handler: openNewLogTab }, 
        ];
    },

    onTabClose: (tab: BaseTab) => {
        const { setLogs, setTracks } = getLifeLogState();
        if (tab.type === shellConstants.vscode.tab.tabTypes.lifeLog) {
            const log = tab.data as LifeLogLog;
            if (log.id < 0) setLogs((prev) => prev.filter((l) => l.id !== log.id));
        } else if (tab.type === shellConstants.vscode.tab.tabTypes.lifeLogTrack) {
            const track = tab.data as LifeLogTrack;
            if (track.id < 0) setTracks((prev) => prev.filter((t) => t.id !== track.id));
        }
    },

    SidebarView: LifeLogView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.lifeLog]: LogEditorPanel,
        [shellConstants.vscode.tab.tabTypes.lifeLogGraph]: LifeLogGraphPanelAdapter,
        [shellConstants.vscode.tab.tabTypes.lifeLogTrack]: TrackEditorPanel,
    },

    getTabMeta: getLifeLogTabMeta,

    filterViewKey: null,
};

// ─── Keyword Navigator Plugin ─────────────────────────────────────────────────

export const lifeLogKeywordPlugin: KeywordPlugin = {
    handles: ["log", "track"],
    resolveTargetTypes: ["LOG", "TRACK"],

    renderIcon: (icon?: string, color?: string, className?: string) => {
        if (color) return <TrackIconDisplay value={icon} trackColor={color} size="sm" />;
        if (icon) return <LogTypeIcon type={icon as LogType} className={className} />;
        return null;
    },

    navigate: async (keyword, openedBy, ctx) => {
        const parsed = parseKeywordLink(keyword);
        if (!parsed) return false;

        if (parsed.type === "log" && parsed.logId) {
            try {
                const existingTab = ctx.openTabs.find(
                    (t) => t.type === shellConstants.vscode.tab.tabTypes.lifeLog && (t.data as LifeLogLog).id === parsed.logId
                );
                if (existingTab) {
                    if (openedBy) ctx.setOpenTabs((prev) => prev.map((t) => t.id === existingTab.id ? { ...t, openedBy } : t));
                    ctx.updateActiveTab(existingTab.id);
                    return true;
                }

                const res = await lifeLogService._getLogById(ctx.userToken, parsed.logId);
                if (res.success && res.data?.[0]) {
                    const dto = res.data[0];
                    const log: LifeLogLog = {
                        id: dto.id,
                        userId: dto.userId,
                        type: dto.type as LifeLogLog["type"],
                        trackId: dto.trackId ?? undefined,
                        title: dto.title ?? undefined,
                        description: dto.description ?? undefined,
                        isSensitive: dto.isSensitive,
                        location: dto.location ?? undefined,
                        occurAt: dto.occurAt ? new Date(dto.occurAt) : undefined,
                        createdAt: new Date(dto.createdAt),
                        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
                        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                    };
                    ctx.openTab(log, shellConstants.vscode.tab.tabTypes.lifeLog, openedBy);
                } else {
                    ctx.log.error("Log not found");
                }
            } catch {
                ctx.log.error("Failed to load log");
            }
            return true;
        }

        if (parsed.type === "track" && parsed.trackId) {
            try {
                const existingTab = ctx.openTabs.find(
                    (t) => t.type === shellConstants.vscode.tab.tabTypes.lifeLogTrack && (t.data as LifeLogTrack).id === parsed.trackId
                );
                if (existingTab) {
                    if (openedBy) ctx.setOpenTabs((prev) => prev.map((t) => t.id === existingTab.id ? { ...t, openedBy } : t));
                    ctx.updateActiveTab(existingTab.id);
                    return true;
                }

                const res = await lifeLogService._getTrackById(ctx.userToken, parsed.trackId);
                if (res.success && res.data?.[0]) {
                    const dto = res.data[0];
                    const track: LifeLogTrack = {
                        id: dto.id,
                        userId: dto.userId,
                        name: dto.name,
                        emoji: dto.emoji,
                        description: dto.description,
                        isSensitive: dto.isSensitive,
                        color: dto.color,
                        createdAt: new Date(dto.createdAt),
                        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
                        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
                    };
                    ctx.openTab(track, shellConstants.vscode.tab.tabTypes.lifeLogTrack, openedBy);
                } else {
                    ctx.log.error("Track not found");
                }
            } catch {
                ctx.log.error("Failed to load track");
            }
            return true;
        }

        return false;
    },

    resolveTarget: async (targetType, targetId, userToken) => {
        if (targetType === "LOG") {
            const res = await lifeLogService._getLogById(userToken, targetId);
            if (res.success && res.data?.[0]) return { link: `sa/l${targetId}`, label: res.data[0].title ?? `Log ${targetId}` };
        }
        if (targetType === "TRACK") {
            const res = await lifeLogService._getTrackById(userToken, targetId);
            if (res.success && res.data?.[0]) return { link: `sa/tr${targetId}`, label: res.data[0].name };
        }
        return undefined;
    },
};





