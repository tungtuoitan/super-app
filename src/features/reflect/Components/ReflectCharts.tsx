/**
 * ReflectCharts — the charts at the top of the journal page: one card per thing read out of the rows (written by
 * Claude through the talk-log skill) plus how much the journal is used each day. Read-only.
 */

import { reflectConstants } from "../reflect.constants";
import { useReflectChartsHelper } from "../hooks/useReflectCharts.helper";
import { useReflectChartsIsLoading, useReflectSeriesList } from "../Selectors/useReflectCharts.selector";
import { ReflectChartCard } from "./ReflectChartCard";

export function ReflectCharts() {
    useReflectChartsHelper();
    const series = useReflectSeriesList();
    const isLoading = useReflectChartsIsLoading();

    return (
        <section>
            <div className={reflectConstants.sectionTitleClass}>{reflectConstants.chartsTitle}</div>
            {!isLoading && series.length === 0 && <div className={reflectConstants.chartsEmptyClass}>{reflectConstants.chartsEmpty}</div>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {series.map((s) => (
                    <ReflectChartCard key={s.code} code={s.code} />
                ))}
            </div>
        </section>
    );
}
