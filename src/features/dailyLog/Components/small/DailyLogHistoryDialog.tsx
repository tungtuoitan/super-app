import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDailyLogHelper } from "../../hooks/useDailyLog.helper";
import type { DailyLogFieldTemplate, DailyLogHistoryPoint } from "../../types/dailyLog.types";
import { buildFieldPath, addDays, startOfLocalDay } from "../../utils/dailyLog.utils";
import { dailyLogConstants } from "../../dailyLog.constants";
import { DailyLogHistoryTextTimeline } from "./DailyLogHistoryTextTimeline";
import { DailyLogHistoryLineChart } from "./DailyLogHistoryLineChart";
import { DailyLogHistoryHeatmap } from "./DailyLogHistoryHeatmap";

interface DailyLogHistoryDialogProps {
    field: DailyLogFieldTemplate;
    onClose: () => void;
}

export function DailyLogHistoryDialog({ field, onClose }: DailyLogHistoryDialogProps) {
    const { loadFieldHistory } = useDailyLogHelper();
    const [points, setPoints] = useState<DailyLogHistoryPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const to = startOfLocalDay(new Date());
        const from = addDays(to, -(dailyLogConstants.historyDefaultDays - 1));
        setIsLoading(true);
        loadFieldHistory(buildFieldPath(field.section, field.fieldKey), from, to)
            .then((data) => setPoints(data))
            .finally(() => setIsLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [field.id]);

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div>
                        <h3 className="text-sm font-semibold">{field.label} · history</h3>
                        <p className="text-[11px] text-muted-foreground">
                            {dailyLogConstants.sectionLabels[field.section]} · last {dailyLogConstants.historyDefaultDays} days
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
                    {!isLoading && points.length === 0 && (
                        <div className="text-xs italic text-muted-foreground">No history recorded for this field.</div>
                    )}
                    {!isLoading && points.length > 0 && (
                        <>
                            {(field.fieldType === "text" || field.fieldType === "longText") && (
                                <DailyLogHistoryTextTimeline points={points} />
                            )}
                            {(field.fieldType === "number" || field.fieldType === "range") && <DailyLogHistoryLineChart points={points} />}
                            {field.fieldType === "checkbox" && <DailyLogHistoryHeatmap points={points} days={dailyLogConstants.historyDefaultDays} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
