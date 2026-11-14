/** A line: for levels and peaks; with `asClock` the values are times of day (bed time, wake-up time) */

import { Line, LineChart, ResponsiveContainer } from "recharts";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { toReflectChartData } from "../../utils/reflect.utils";
import { renderReflectChartAxes } from "./ReflectChartAxes";

export function ReflectLineKind({ series, asClock = false }: ReflectChartKindProps & { asClock?: boolean }) {
    return (
        <div style={{ height: reflectConstants.chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={toReflectChartData(series)} margin={reflectConstants.chartMargin}>
                    {renderReflectChartAxes(series, asClock)}
                    <Line type="monotone" dataKey="value" stroke={reflectConstants.color} strokeWidth={reflectConstants.chartLineWidth} dot={{ r: reflectConstants.chartDotRadius }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

/** Times of day (stored as minutes since midnight of the day the night started) */
export function ReflectClockKind({ series }: ReflectChartKindProps) {
    return <ReflectLineKind series={series} asClock />;
}
