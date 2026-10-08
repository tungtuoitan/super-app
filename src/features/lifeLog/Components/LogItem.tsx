import { useRef, useCallback } from "react";
import { differenceInMinutes, format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { LogTypeBadge } from "./LogTypeBadge";
import { TrackIconDisplay } from "./TrackIconDisplay";
import { SensitiveOverlay } from "./SensitiveOverlay";
import { cn } from "@/lib/utils";
import { useMenuContextHelper } from "@/shared";
import { constants } from "@/shared";
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
    const { showContextMenu } = useMenuContextHelper();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didLongPressRef = useRef(false);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const openMenu = (e: React.MouseEvent) => {
        showContextMenu(e, "lifelog-log", {
            onDelete: () => onDelete?.(log),
        });
    }

    const startPress = (e: React.MouseEvent | React.TouchEvent) => {
        didLongPressRef.current = false;
        const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        if ("touches" in e) touchStartRef.current = { x: clientX, y: clientY };
        timerRef.current = setTimeout(() => {
            didLongPressRef.current = true;
            openMenu({ preventDefault: () => {}, stopPropagation: () => {}, clientX, clientY } as React.MouseEvent);
        }, LONG_PRESS_MS);
    }

    const cancelPress = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        touchStartRef.current = null;
    }

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartRef.current || !timerRef.current) return;
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        const dy = e.touches[0].clientY - touchStartRef.current.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }

    const handleClick = () => {
        if (didLongPressRef.current) return;
        onClick?.(log);
    }

    const title = log.isSensitive ? (
        <SensitiveOverlay>
            <span className="text-[13px] text-foreground">{log.title || log.type}</span>
        </SensitiveOverlay>
    ) : (
        <span className="text-[13px] text-foreground truncate">{log.title || log.type}</span>
    );

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 min-h-[32px] py-1.5 hover:bg-sa-hover cursor-pointer transition-colors duration-100",
                "border-b border-sa-border select-none"
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
                <LogTypeBadge type={log.type} />
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">{title}</div>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground flex-shrink-0 whitespace-nowrap">
                {formatLogTime(log)}
            </span>
        </div>
    );
}
