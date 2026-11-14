/**
 * ReflectCharts — the Charts view of the journal: one card per number the nightly scan read out of it.
 * Read-only; the only action is scanning right away.
 */

import { reflectConstants } from "../reflect.constants";
import { useReflectChartsHelper } from "../hooks/useReflectCharts.helper";
import { useReflectChartsIsLoading, useReflectChartsIsScanning, useReflectSeriesList } from "../Selectors/useReflectCharts.selector";
import { ReflectChartCard } from "./ReflectChartCard";

export function ReflectCharts() {
    const { scanNow } = useReflectChartsHelper();
    const series = useReflectSeriesList();
    const isLoading = useReflectChartsIsLoading();
    const isScanning = useReflectChartsIsScanning();

    return (
        <div className="h-full overflow-y-auto pb-4 pt-1">
            <div className="mb-2 flex justify-end">
                <button onClick={scanNow} disabled={isScanning} className={reflectConstants.scanButtonClass}>
                    {isScanning ? reflectConstants.scanningLabel : reflectConstants.scanLabel}
                </button>
            </div>
            {!isLoading && series.length === 0 && <div className={reflectConstants.chartsEmptyClass}>{reflectConstants.chartsEmpty}</div>}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {series.map((s) => (
                    <ReflectChartCard key={s.code} code={s.code} />
                ))}
            </div>
        </div>
    );
}
