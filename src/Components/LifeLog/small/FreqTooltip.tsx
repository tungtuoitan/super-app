/**
 * FreqTooltip - Tooltip for frequency chart dots
 */

import { format, subDays } from "date-fns";
import { TrackIconDisplay } from "./TrackIconDisplay";
import type { FreqTrack, LifeLogLog } from "@/types/lifeLog.types";

interface FreqTooltipProps {
    active?: boolean;
    payload?: any[];
    freqData: FreqTrack[];
    days: number;
    logs: LifeLogLog[];
}

export function FreqTooltip({ active, payload, freqData, days, logs }: FreqTooltipProps) {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    const trackInfo = freqData[p.y];
    const track = trackInfo?.track;
    const date = format(subDays(new Date(), days - 1 - p.x), "dd/MM/yyyy");

    const dotLogs: LifeLogLog[] = (p.logIds ?? [])
        .map((id: number) => logs?.find((l) => l.id === id))
        .filter(Boolean);

    return (
        <div style={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, padding: "8px 10px", fontSize: 12, minWidth: 160, maxWidth: 240 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <TrackIconDisplay value={track?.emoji} trackColor={track?.color} size="sm" />
                <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{track?.name}</span>
            </div>
            <div style={{ color: "#9ca3af", marginBottom: 4 }}>{date} · {p.count}×</div>
            {dotLogs.slice(0, 3).map((log) => (
                <div key={log.id} style={{ borderTop: "1px solid hsl(var(--border))", paddingTop: 4, marginTop: 4 }}>
                    {log.title && <div style={{ color: "hsl(var(--foreground))", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.title}</div>}
                    {log.description && <div style={{ color: "#9ca3af", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{log.description}</div>}
                    {(log.occurAt ?? log.createdAt) && (
                        <div style={{ color: "#6b7280", fontSize: 10, marginTop: 1 }}>{format(new Date(log.occurAt ?? log.createdAt), "HH:mm")}</div>
                    )}
                </div>
            ))}
            {dotLogs.length > 3 && <div style={{ color: "#6b7280", fontSize: 10, marginTop: 4 }}>+{dotLogs.length - 3} more</div>}
            {p.logIds?.length > 0 && <div style={{ color: "#9ca3af", fontSize: 10, marginTop: 4 }}>click to open</div>}
        </div>
    );
}
