/**
 * TrackItem Helper Hook
 * Long-press detection, context menu, and tap-to-log for a single track item.
 * Returns functions that accept trackId — no params on the hook itself.
 */

import { useRef, useCallback } from "react";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { useLifeLogLogHelper } from "@/hooks/lifeLog/useLifeLogLog.helper";
import { useLifeLogTrackHelper } from "@/hooks/lifeLog/useLifeLogTrack.helper";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useStandardRegistryHelper } from "@/hooks/standardRegistry/useStandardRegistry.helper";
import { toLocalISOString } from "@/utils/date.utils";
import { constants } from "@/utils/constants";
import { LONG_PRESS_MS } from "@/utils/lifeLog.constants";

export function useTrackItemHelper() {
    const { tracks, logs } = useLifeLogStore();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { createLog } = useLifeLogLogHelper();
    const { deleteTrack } = useLifeLogTrackHelper();
    const { openTrackTab } = useLifeLogTabHelper();
    const { loadKeywords } = useStandardRegistryHelper();

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const getTrack = useCallback((trackId: number) => {
        return tracks.find((t) => t.id === trackId);
    }, [tracks]);

    const openMenu = useCallback((trackId: number, e: React.MouseEvent) => {
        const track = getTrack(trackId);
        if (!track) return;
        showContextMenu(e, constants.contextMenu.contextMenuTypes.lifeLogTrack, {
            onEdit: () => openTrackTab(track),
            onDelete: () => deleteTrack(trackId),
        });
    }, [getTrack, showContextMenu, openTrackTab, deleteTrack]);

    const startPress = useCallback((trackId: number, e: React.MouseEvent | React.TouchEvent) => {
        didLongPressRef.current = false;
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        if ("touches" in e) touchStartRef.current = { x: clientX, y: clientY };
        timerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            openMenu(trackId, { preventDefault: () => {}, stopPropagation: () => {}, clientX, clientY } as React.MouseEvent);
        }, LONG_PRESS_MS);
    }, [openMenu]);

    const cancelPress = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        touchStartRef.current = null;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStartRef.current || !timerRef.current) return;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleTapLog = useCallback(async (trackId: number): Promise<boolean> => {
        if (didLongPressRef.current) return false;
        const track = getTrack(trackId);
        if (!track) return false;

        const occurAt = toLocalISOString(new Date()) ?? undefined;
        const trackLogCount = logs.filter((l) => l.trackId === trackId && l.deletedAt === null).length;
        const nextIndex = trackLogCount + 1;

        await createLog({
            id: 0,
            type: "track",
            trackId: track.id,
            title: `${track.name}-${nextIndex}`,
            isSensitive: track.isSensitive,
            occurAt,
        });
        loadKeywords();
        return true;
    }, [getTrack, logs, createLog, loadKeywords]);

    return {
        openMenu,
        startPress,
        cancelPress,
        handleTouchMove,
        handleTapLog,
    };
}
