/** ReflectChartCard — one metric as a card; how it is drawn comes from its shape (REFLECT_CHART_KINDS) */

import { usePrivacyIsHidden } from "@/shared";
import { reflectConstants } from "../reflect.constants";
import { REFLECT_CHART_KINDS } from "../reflect.chartKinds.constants";
import { useReflectSeriesByCode } from "../Selectors/useReflectCharts.selector";
import { inferReflectShape } from "../utils/reflect.utils";

export function ReflectChartCard({ code }: { code: string }) {
    const series = useReflectSeriesByCode(code);
    const isPrivacyHidden = usePrivacyIsHidden();
    if (!series) return null;
    const Kind = REFLECT_CHART_KINDS[inferReflectShape(series)];

    return (
        <div className={reflectConstants.chartCardClass}>
            <div className={reflectConstants.chartTitleClass}>
                {series.label}
                {series.unit && <span className={reflectConstants.chartUnitClass}>({series.unit})</span>}
            </div>
            {series.sensitive && isPrivacyHidden ? <div className={reflectConstants.sensitiveHiddenClass}>{reflectConstants.sensitiveHidden}</div> : <Kind series={series} />}
        </div>
    );
}
