import { useRef, useCallback } from "react";
import { differenceInMinutes, format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { LogTypeBadge } from "./LogTypeBadge";
import { TrackIconDisplay } from "./TrackIconDisplay";
import { SensitiveOverlay } from "./SensitiveOverlay";
import { cn } from "@/lib/utils";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";
import type { LifeLogLog } from "@/features/lifeLog/types/lifeLog.types";

const LONG_PRESS_MS = 500;

interface LogItemProps {
    log: LifeLogLog;
    trackEmoji?: string;
    trackColor?: string;
    onClick?: (log: LifeLogLog) => void;
    onDelete?: (log: LifeLogLog) => void;
}

function formatHour12(date: Date) {
    const hour = date.getHours();
    return hour % 12 || 12;
}

function getVietnameseTimeLabel(date: Date) {
    const hour = date.getHours();
    if (hour < 11) return "sáng";
    if (hour < 13) return "trưa";
    if (hour < 18) return "chiều";
    return "tối";
}

export function formatLogTime(log: LifeLogLog): string {
    const date = log.occurAt ?? log.createdAt;
    const now = new Date();
    const minutes = differenceInMinutes(now, date);
    const label = getVietnameseTimeLabel(date);
    const hour12 = formatHour12(date);
    const timeText = `${hour12}h ${label}`;

    if (minutes < 60) return `${minutes} phút trước`;
    if (isToday(date)) return timeText;
    if (isYesterday(date)) return `${timeText} qua`;
    if (isThisWeek(date)) return `${timeText} ${format(date, "EEEE")}`;
    if (isThisYear(date)) return `${timeText} ngày ${format(date, "d/M")}`;
    return `Tháng ${format(date, "M")}, ${format(date, "yyyy")}`;
}

export function LogItem({ log, trackEmoji, trackColor, onClick, onDelete }: LogItemProps) {
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const openMenu = useCallback((e: React.MouseEvent) => {
        showContextMenu(e, constants.contextMenu.contextMenuTypes.lifeLogLog, {
            onDelete: () => onDelete?.(log),
        });
    }, [showContextMenu, log, onDelete]);

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

    const handleClick = useCallback(() => {
        if (didLongPressRef.current) return;
        onClick?.(log);
    }, [onClick, log]);

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
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchMove={handleTouchMove}
            onTouchEnd={cancelPress}
            onClick={handleClick}
            onContextMenu={openMenu}
        >
            {log.trackId ? (
                <TrackIconDisplay value={trackEmoji} trackColor={trackColor} size="sm" />
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
