/**
 * TrackItem - Single tap-to-log track button
 * Only accepts trackId — derives data from store, actions from helper.
 * - Tap: create log immediately
 * - Long press / right-click: context menu (edit, delete)
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { TrackIconDisplay } from "./small/TrackIconDisplay";
import { useMobileStore } from "@/store/mobile/Mobile.store";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useTrackItemHelper } from "@/hooks/lifeLog/useTrackItem.helper";

interface TrackItemProps {
    trackId: number;
}

export function TrackItem({ trackId }: TrackItemProps) {
    const { tracks } = useLifeLogStore();
    const { isMobile } = useMobileStore();
    const { openMenu, startPress, cancelPress, handleTouchMove, handleTapLog } = useTrackItemHelper();
    const [flashing, setFlashing] = useState(false);

    const handleClick = useCallback(async () => {
        const logged = await handleTapLog(trackId);
        if (!logged) return;
        setFlashing(true);
        setTimeout(() => setFlashing(false), 600);
    }, [handleTapLog, trackId]);

    const track = tracks.find((t) => t.id === trackId);
    if (!track) return null;

    return (
        <button
            onMouseDown={(e) => startPress(trackId, e)}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={(e) => startPress(trackId, e)}
            onTouchMove={handleTouchMove}
            onTouchEnd={cancelPress}
            onClick={handleClick}
            onContextMenu={(e) => openMenu(trackId, e)}
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
