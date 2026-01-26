/**
 * TrackingGraphContent - Main content area with stats and chart
 */

import { useMemo } from "react";
import { useTrackingGraphStore } from "@/store/tracking/TrackingGraph.store";
import { useTrackingGraphHelper } from "@/hooks/tracking/useTrackingGraph.helper";
import { TrackingGraphFilters } from "./TrackingGraphFilters";
import { TrackingChart } from "./TrackingChart";
import { Calendar, CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color?: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-md">
            <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: color ? `${color}20` : "rgb(63 63 70 / 0.5)" }}
            >
                <div style={{ color: color || "#9ca3af" }}>{icon}</div>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
        </div>
    );
}

export function TrackingGraphContent() {
    const { dailyTrackings, uniqueItems, filters } = useTrackingGraphStore();
    const { filteredTrackings } = useTrackingGraphHelper();

    const hasData = dailyTrackings.length > 0;

    // Calculate stats for single selected item
    const singleItemStats = useMemo(() => {
        if (filters.selectedItems.length !== 1) return null;

        const selectedKey = filters.selectedItems[0];
        const selectedItem = uniqueItems.find((item) => item.key === selectedKey);
        if (!selectedItem) return null;

        // Count done/not done in filtered trackings
        let doneCount = 0;
        let notDoneCount = 0;

        for (const tracking of filteredTrackings) {
            const item = tracking.items.find((i) => i.key === selectedKey);
            if (item && item.value === 'v') {
                doneCount++;
            } else {
                // x, empty, or not in file = not done
                notDoneCount++;
            }
        }

        const total = doneCount + notDoneCount;
        const rate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

        return {
            name: selectedItem.text,
            doneCount,
            notDoneCount,
            rate,
            isNegative: selectedItem.isNegative,
        };
    }, [filters.selectedItems, uniqueItems, filteredTrackings]);

    if (!hasData) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Calendar className="w-16 h-16 mb-4 opacity-30" />
                <h3 className="text-lg font-medium mb-2">No Tracking Data</h3>
                <p className="text-sm text-center max-w-md">
                    No notes with valid date format (DD-MM-YYYY) found in this folder.
                    Make sure your tracking notes are named like "25-01-2026".
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters */}
            <TrackingGraphFilters />

            {/* Stats Cards - Only show when 1 item selected */}
            {
            singleItemStats ? 
            (
                <div className={`px-4 py-2 h-12`}>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* <span className="text-sm text-muted-foreground mr-2">
                            {singleItemStats?.name??""}:
                        </span> */}
                        <StatCard
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            label="Yes"
                            value={singleItemStats?.doneCount??""}
                            color="#22c55e"
                        />
                        <StatCard
                            icon={<XCircle className="w-3.5 h-3.5" />}
                            label="No"
                            value={singleItemStats?.notDoneCount??''}
                            color="#71717a"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-3.5 h-3.5" />}
                            label="Rate"
                            value={`${singleItemStats?.rate}%`}
                            color={singleItemStats?.rate??0 >= 70 ? "#22c55e" : singleItemStats?.rate??0 >= 40 ? "#f59e0b" : "#ef4444"}
                        />
                    </div>
                </div>
            ): <div className="px-4 py-2 h-12"></div>}

            {/* Chart */}
            <div className="flex-1 p-4 overflow-hidden">
                <TrackingChart />
            </div>
        </div>
    );
}
