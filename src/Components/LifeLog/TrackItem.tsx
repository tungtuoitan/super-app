/**
 * TrackItem - Single tap-to-log track button
 * - Tap: create log immediately
 * - Long press / right-click: context menu (edit, delete)
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useLifeLogLogHelper } from "@/hooks/lifeLog/useLifeLogLog.helper";
import { useLifeLogTrackHelper } from "@/hooks/lifeLog/useLifeLogTrack.helper";
import { useLifeLogTabHelper } from "@/hooks/lifeLog/useLifeLogTab.helper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { TrackIconDisplay } from "./TrackIconDisplay";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { toLocalISOString } from "@/utils/date.utils";
import { constants } from "@/utils/constants";
import type { LifeLogTrack } from "@/types/lifeLog.types";

const LONG_PRESS_MS = 500;

interface TrackItemProps {
    track: LifeLogTrack;
    onClick?: () => void;
}

export function TrackItem({ track, onClick }: TrackItemProps) {
    const { createLog } = useLifeLogLogHelper();
    const { deleteTrack } = useLifeLogTrackHelper();
    const { openTrackTab } = useLifeLogTabHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { isMobile } = useMobileStore();
    const { logs } = useLifeLogStore();
    const [flashing, setFlashing] = useState(false);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const openMenu = useCallback((e: React.MouseEvent) => {
        showContextMenu(e, constants.contextMenu.contextMenuTypes.lifeLogTrack, {
            onEdit: () => openTrackTab(track),
            onDelete: () => deleteTrack(track.id),
        });
    }, [showContextMenu, track, openTrackTab, deleteTrack]);

    const startPress = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        didLongPressRef.current = false;
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        if ("touches" in e) touchStartRef.current = { x: clientX, y: clientY };
        timerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            openMenu({ preventDefault: () => {}, stopPropagation: () => {}, clientX, clientY } as React.MouseEvent);
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

    const handleClick = useCallback(async () => {
        if (didLongPressRef.current) return;
        setFlashing(true);
        const occurAt = toLocalISOString(new Date()) ?? undefined;
        const trackLogCount = logs.filter((l) => l.trackId === track.id && l.deletedAt === null).length;
        const nextIndex = trackLogCount + 1;
        await createLog({
            id: 0,
            type: "track",
            trackId: track.id,
            title: `${track.name}-${nextIndex}`,
            isSensitive: track.isSensitive,
            occurAt,
        });
        setTimeout(() => setFlashing(false), 600);
        onClick?.();
    }, [createLog, logs, track, onClick]);

    return (
        <button
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchMove={handleTouchMove}
            onTouchEnd={cancelPress}
            onClick={handleClick}
            onContextMenu={openMenu}
            className={cn(
                "flex flex-col items-center gap-1 rounded-lg border transition-all",
                "bg-muted/30 border-border hover:bg-muted/60 hover:border-primary/30",
                "cursor-pointer select-none flex-shrink-0",
                isMobile ? "w-[76px] px-2 py-3" : "w-[60px] px-2 py-2",
                flashing && "border-primary/70 bg-primary/10"
            )}
            title={track.name}
        >
            <TrackIconDisplay value={track.emoji} trackColor={track.color} size={isMobile ? "lg" : "md"} />
            <span className="text-[9px] text-center leading-tight line-clamp-1 w-full break-words">{track.name}</span>
        </button>
    );
}
