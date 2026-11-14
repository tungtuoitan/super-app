/** Bars: for amounts and counts (km run, times suggested) */

import { Bar, BarChart } from "recharts";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { renderReflectChartAxes } from "./ReflectChartAxes";

export function ReflectBarKind(props: ReflectChartKindProps) {
    return (
        <BarChart data={props.data} margin={reflectConstants.chartMargin}>
            {renderReflectChartAxes(props)}
            <Bar dataKey="value" fill={reflectConstants.color} radius={reflectConstants.chartBarRadius} maxBarSize={reflectConstants.chartMaxBarSize} />
        </BarChart>
    );
}
