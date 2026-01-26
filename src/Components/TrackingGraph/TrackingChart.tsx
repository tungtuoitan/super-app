/**
 * TrackingChart - Line chart visualization using Recharts
 */

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { useTrackingGraphStore } from "@/store/tracking/TrackingGraph.store";
import { useTrackingGraphHelper } from "@/hooks/tracking/useTrackingGraph.helper";
import { getLineColor, getItemColor } from "@/utils/tracking-parser.utils";

interface CustomDotProps {
    cx?: number;
    cy?: number;
    payload?: any;
    dataKey?: string | number;
    isNegative?: boolean;
    value?: number;
}

/**
 * Custom dot renderer for showing green/red dots based on value
 * Green for positive items done, Red for negative items done
 * No dot for not done (value = 0)
 */
function CustomDot({ cx, cy, value, isNegative }: CustomDotProps) {
    if (cx === undefined || cy === undefined || value === undefined) return null;

    // Not done (0) - no dot
    if (value === 0) return null;

    const color = getItemColor(value, isNegative || false);

    return (
        <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={color}
            stroke="#1f2937"
            strokeWidth={1}
        />
    );
}

/**
 * Custom tooltip content - shows item status and note if available
 */
function CustomTooltipContent({ active, payload, label }: any) {
    if (!active || !payload || payload.length === 0) return null;

    // Get the data point to access notes
    const dataPoint = payload[0]?.payload;

    // 👉 Check xem có note nào không
    const hasAnyNote = payload.some((entry: any) => {
        const itemKey = entry.dataKey;
        return dataPoint?.[`${itemKey}_note`];
    });

    // ❌ Không có note thì không hiển thị tooltip
    if (!hasAnyNote) return null;

    return (
        <div className="bg-popover border border-border rounded-md p-3 shadow-lg max-w-sm">
            <p className="font-medium text-foreground mb-2">{label}</p>
            <div className="space-y-2">
                {payload.map((entry: any, index: number) => {
                    const value = entry.value;
                    const itemKey = entry.dataKey;
                    // Get note from the data point (stored as itemKey_note)
                    const note = dataPoint?.[`${itemKey}_note`];

                    let status = "No";
                    let statusColor = "text-muted-foreground";

                    if (value === 1) {
                        status = "Yes";
                        statusColor = "text-green-500";
                    }

                    return (
                        <div key={index} className="space-y-0.5">
                            <div className="flex items-center gap-2 text-sm">
                                {/* <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: entry.color }}
                                /> */}
                                <span className="text-muted-foreground">{entry.name}:</span>
                                {/* <span className={statusColor}>{status}</span> */}
                            </div>
                            {note && (
                                <p className="text-xs text-muted-foreground pl-5 italic">
                                    Note: {note}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function TrackingChart() {
    const { filters, uniqueItems } = useTrackingGraphStore();
    const { chartData, isItemNegative, getItemDisplayName } = useTrackingGraphHelper();

    if (filters.selectedItems.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>Select items to display in the chart</p>
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <p>No tracking data available for the selected filters</p>
            </div>
        );
    }

    // Get item index for consistent colors
    const getItemIndex = (key: string) => {
        return uniqueItems.findIndex((item) => item.key === key);
    };

    return (
        <div className="flex-1 w-full h-full" style={{ minHeight: 400 }}>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis
                        dataKey="dateLabel"
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        tickLine={{ stroke: "#4b5563" }}
                        axisLine={{ stroke: "#4b5563" }}
                    />
                    <YAxis
                        domain={[0, 1]}
                        ticks={[0, 1]}
                        tickFormatter={(value) => {
                            if (value === 1) return "Yes";
                            return "No";
                        }}
                        tick={{ fill: "#9ca3af", fontSize: 12 }}
                        tickLine={{ stroke: "#4b5563" }}
                        axisLine={{ stroke: "#4b5563" }}
                        width={50}
                    />
                    <Tooltip content={<CustomTooltipContent />} />
                    <Legend
                        wrapperStyle={{ paddingTop: 10 }}
                        formatter={(value) => (
                            <span className="text-muted-foreground text-sm">{value}</span>
                        )}
                    />

                    {/* Reference line at Yes level */}
                    <ReferenceLine y={1} stroke="#22c55e" strokeDasharray="3 3" opacity={0.3} />

                    {/* Lines for each selected item */}
                    {filters.selectedItems.map((itemKey) => {
                        const itemIndex = getItemIndex(itemKey);
                        const isNegative = isItemNegative(itemKey);
                        // Use red for negative items, otherwise use normal color palette
                        const lineColor = isNegative ? "#ef4444" : getLineColor(itemIndex);
                        const displayName = getItemDisplayName(itemKey);

                        return (
                            <Line
                                key={itemKey}
                                type="monotone"
                                dataKey={itemKey}
                                name={displayName}
                                stroke={lineColor}
                                strokeWidth={2}
                                connectNulls={false}
                                dot={(props: any) => (
                                    <CustomDot
                                        cx={props.cx}
                                        cy={props.cy}
                                        value={props.value}
                                        isNegative={isNegative}
                                    />
                                )}
                                activeDot={{
                                    r: 7,
                                    stroke: lineColor,
                                    strokeWidth: 2,
                                    fill: "#1f2937",
                                }}
                            />
                        );
                    })}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
