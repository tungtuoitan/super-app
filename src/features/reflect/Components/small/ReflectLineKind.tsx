/** A line: for levels and peaks (mood, hours slept) */

import { Line, LineChart } from "recharts";
import { reflectConstants } from "../../reflect.constants";
import type { ReflectChartKindProps } from "../../types/reflect.types";
import { renderReflectChartAxes } from "./ReflectChartAxes";

export function ReflectLineKind(props: ReflectChartKindProps) {
    return (
        <LineChart data={props.data} margin={reflectConstants.chartMargin}>
            {renderReflectChartAxes(props)}
            <Line type="monotone" dataKey="value" stroke={reflectConstants.color} strokeWidth={reflectConstants.chartLineWidth} dot={{ r: reflectConstants.chartDotRadius }} />
        </LineChart>
    );
}
