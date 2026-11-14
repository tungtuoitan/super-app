/** ReflectChartCard — one number read out of the journal as a small chart; the shape comes from REFLECT_CHART_KINDS */

import { ResponsiveContainer } from "recharts";
import { reflectConstants } from "../reflect.constants";
import { useReflectSeriesByCode } from "../Selectors/useReflectCharts.selector";
import { toReflectChartData } from "../utils/reflect.utils";
import { REFLECT_CHART_KINDS } from "../reflect.chartKinds.constants";

export function ReflectChartCard({ code }: { code: string }) {
    const series = useReflectSeriesByCode(code);
    if (!series) return null;
    const Kind = REFLECT_CHART_KINDS[series.aggregate] ?? REFLECT_CHART_KINDS.sum;

    return (
        <div className={reflectConstants.chartCardClass}>
            <div className="mb-2 text-[13px] font-medium text-foreground">
                {series.label}
                {series.unit && <span className="ml-1 text-[12px] font-normal text-muted-foreground">({series.unit})</span>}
            </div>
            <div style={{ height: reflectConstants.chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <Kind data={toReflectChartData(series.points)} unit={series.unit} label={series.label} />
                </ResponsiveContainer>
            </div>
        </div>
    );
}
