/** Bars: for amounts and counts (times a day, km) */

import { Bar, BarChart, ResponsiveContainer } from "recharts";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { toReflectChartData } from "../../utils/reflect.utils";
import { renderReflectChartAxes } from "./ReflectChartAxes";

export function ReflectBarKind({ series }: ReflectChartKindProps) {
    return (
        <div style={{ height: reflectConstants.chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={toReflectChartData(series)} margin={reflectConstants.chartMargin}>
                    {renderReflectChartAxes(series)}
                    <Bar dataKey="value" fill={reflectConstants.color} radius={reflectConstants.chartBarRadius} maxBarSize={reflectConstants.chartMaxBarSize} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
