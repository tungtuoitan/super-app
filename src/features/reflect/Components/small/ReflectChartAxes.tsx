/** The grid, axes and tooltip every chart shape shares. A function and not a component: recharts needs them as direct children of the chart. */

import { CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { formatReflectChartValue } from "../../utils/reflect.utils";

export function renderReflectChartAxes({ unit, label }: Pick<ReflectChartKindProps, "unit" | "label">) {
    const c = reflectConstants;
    return [
        <CartesianGrid key="grid" strokeDasharray={c.chartGridDash} stroke={c.chartGridStroke} opacity={c.chartGridOpacity} />,
        <XAxis key="x" dataKey="label" tick={c.chartAxisTick} tickLine={false} axisLine={{ stroke: c.chartAxisStroke }} />,
        <YAxis key="y" tick={c.chartAxisTick} tickLine={false} axisLine={false} width={c.chartYAxisWidth} />,
        <Tooltip key="tip" contentStyle={c.chartTooltipStyle} formatter={(v) => [formatReflectChartValue(v as number | undefined, unit), label]} />,
    ];
}
