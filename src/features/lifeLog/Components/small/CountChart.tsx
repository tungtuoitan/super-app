import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { resolveTrackColor } from "../trackColors";

interface CountChartProps {
    data: Record<string, string | number>[];
    selectedTracks: any[];
    activeTracks: any[];
}

export function CountChart({ data, selectedTracks, activeTracks }: CountChartProps) {
    const interval = data.length <= 14 ? 0 : data.length <= 30 ? 2 : Math.floor(data.length / 10);
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.6} />
                <XAxis dataKey="dateLabel" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "hsl(var(--sa-border-strong))" }} interval={interval} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} width={24} />
                <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "var(--sa-shadow-pop)" }}
                    labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 500, marginBottom: 4 }}
                    formatter={(value, _name, entry: any) => {
                        const trackId = Number(entry?.dataKey);
                        const track = activeTracks.find((t: any) => t.id === trackId);
                        return [value ?? 0, track?.name ?? entry?.dataKey];
                    }}
                />
                {selectedTracks.map((track: any) => (
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
