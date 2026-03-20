/**
 * CountChart - Bar chart showing activity count by day
 */

import {
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { resolveTrackColor } from "@/utils/lifeLog.utils";
import type { LifeLogTrack } from "@/types/lifeLog.types";

interface CountChartProps {
    data: Record<string, string | number>[];
    selectedTracks: LifeLogTrack[];
    activeTracks: LifeLogTrack[];
}

export function CountChart({ data, selectedTracks, activeTracks }: CountChartProps) {
    const interval = data.length <= 14 ? 0 : data.length <= 30 ? 2 : Math.floor(data.length / 10);
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
                <XAxis dataKey="dateLabel" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#4b5563" }} interval={interval} />
                <YAxis allowDecimals={false} tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
                <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                    formatter={(value: number | undefined, _name: string | undefined, entry: any) => {
                        const trackId = Number(entry?.dataKey);
                        const track = activeTracks.find((t) => t.id === trackId);
                        return [value ?? 0, track?.name ?? entry?.dataKey];
                    }}
                />
                {selectedTracks.map((track) => (
                    <Bar
                        key={track.id}
                        dataKey={String(track.id)}
                        name={track.name}
                        fill={resolveTrackColor(track.color, activeTracks.indexOf(track))}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={28}
                    />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
