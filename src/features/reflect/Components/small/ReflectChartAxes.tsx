/** The grid, axes and tooltip the recharts shapes share. A function and not a component: recharts needs them as direct children of the chart. */

import { CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectSeriesDTO } from "../../types/reflect.types";
import { formatReflectChartValue, formatReflectMinutes } from "../../utils/reflect.utils";

/** `asClock` draws the vertical axis and tooltip as clock times (for bed time and wake-up time stored as minutes) */
export function renderReflectChartAxes(series: ReflectSeriesDTO, asClock = false) {
    const c = reflectConstants;
    const tick = asClock ? (v: number) => formatReflectMinutes(v) : undefined;
    return [
        <CartesianGrid key="grid" strokeDasharray={c.chartGridDash} stroke={c.chartGridStroke} opacity={c.chartGridOpacity} />,
        <XAxis key="x" dataKey="label" tick={c.chartAxisTick} tickLine={false} axisLine={{ stroke: c.chartAxisStroke }} />,
        <YAxis key="y" tick={c.chartAxisTick} tickLine={false} axisLine={false} width={asClock ? c.chartTimeAxisWidth : c.chartYAxisWidth} tickFormatter={tick} domain={asClock ? ["dataMin - 30", "dataMax + 30"] : undefined} />,
        <Tooltip
            key="tip"
            contentStyle={c.chartTooltipStyle}
            formatter={(v) => [asClock ? formatReflectMinutes(Number(v)) : formatReflectChartValue(v as number | undefined, series.unit), series.label] as [string, string]}
        />,
    ];
}
