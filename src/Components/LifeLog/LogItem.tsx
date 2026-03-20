/**
 * LogItem - Single log entry row in the list
 * Only accepts logId — derives all data from store, actions from helper.
 */

import { LogTypeBadge } from "./small/LogTypeBadge";
import { TrackIconDisplay } from "./small/TrackIconDisplay";
import { SensitiveOverlay } from "./small/SensitiveOverlay";
import { cn } from "@/lib/utils";
import { useLifeLogStore } from "@/store/lifeLog/useLifeLog.store";
import { useLogItemHelper } from "@/hooks/lifeLog/useLogItem.helper";
import { formatLogTime } from "@/utils/lifeLog.utils";

interface LogItemProps {
    logId: number;
}

export function LogItem({ logId }: LogItemProps) {
    const { logs, tracks } = useLifeLogStore();
    const { openMenu, handleClick, startPress, cancelPress, handleTouchMove } = useLogItemHelper();

    const log = logs.find((l) => l.id === logId);
    if (!log) return null;

    const track = log.trackId ? tracks.find((t) => t.id === log.trackId) : undefined;

    const title = log.isSensitive ? (
        <SensitiveOverlay>
            <span className="font-medium text-sm">{log.title || log.type}</span>
        </SensitiveOverlay>
    ) : (
        <span className="font-medium text-sm truncate">{log.title || log.type}</span>
    );

    return (
        <div
            className={cn(
                "flex items-start gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer transition-colors",
                "border-b border-border/50 select-none"
            )}
            onMouseDown={(e) => startPress(logId, e)}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={(e) => startPress(logId, e)}
            onTouchMove={handleTouchMove}
            onTouchEnd={cancelPress}
            onClick={() => handleClick(logId)}
            onContextMenu={(e) => openMenu(logId, e)}
        >
            {log.trackId ? (
                <TrackIconDisplay value={track?.emoji} trackColor={track?.color} size="sm" />
            ) : (
                <LogTypeBadge type={log.type} className="mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">{title}</div>
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5 whitespace-nowrap">
                {formatLogTime(log)}
            </span>
        </div>
    );
}
