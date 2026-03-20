/**
 * LifeLog Utils — Pure utility functions
 */

import { differenceInMinutes, format, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { TRACK_COLORS, ICON_TARGET_SIZE, ICON_MAX_BYTES } from "@/utils/lifeLog.constants";
import { parseAsLocalDate } from "@/utils/date.utils";
import type { LifeLogLog, LifeLogLogDTO, LifeLogTrack, LogType } from "@/types/lifeLog.types";

// ─── Track color ─────────────────────────────────────────────────────────────

/** Returns the hex for a track, falling back to palette by index */
export function resolveTrackColor(color: string | undefined | null, fallbackIndex: number): string {
    if (color) return color;
    return TRACK_COLORS[fallbackIndex % TRACK_COLORS.length].hex;
}

// ─── Time formatting ─────────────────────────────────────────────────────────

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

// ─── DTO transformations ─────────────────────────────────────────────────────

export function transformLog(dto: LifeLogLogDTO): LifeLogLog {
    return {
        id: dto.id,
        userId: dto.userId,
        type: (dto.type as LogType) ?? "note",
        trackId: dto.trackId ?? undefined,
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        isSensitive: dto.isSensitive ?? false,
        location: dto.location ?? undefined,
        occurAt: dto.occurAt ? parseAsLocalDate(dto.occurAt) ?? undefined : undefined,
        createdAt: parseAsLocalDate(dto.createdAt) ?? new Date(),
        updatedAt: dto.updatedAt ? parseAsLocalDate(dto.updatedAt) ?? undefined : undefined,
        deletedAt: dto.deletedAt ? parseAsLocalDate(dto.deletedAt) : null,
    };
}

// ─── Image processing ────────────────────────────────────────────────────────

export function processImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const sx = (img.naturalWidth - side) / 2;
            const sy = (img.naturalHeight - side) / 2;

            const canvas = document.createElement("canvas");
            canvas.width = ICON_TARGET_SIZE;
            canvas.height = ICON_TARGET_SIZE;
            canvas.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, ICON_TARGET_SIZE, ICON_TARGET_SIZE);

            let quality = 0.95;
            let dataUrl = canvas.toDataURL("image/webp", quality);
            while (dataUrl.length * 0.75 > ICON_MAX_BYTES && quality > 0.1) {
                quality -= 0.05;
                dataUrl = canvas.toDataURL("image/webp", quality);
            }
            resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = url;
    });
}

export const isCustomImage = (v: string) => v.startsWith("data:image");
