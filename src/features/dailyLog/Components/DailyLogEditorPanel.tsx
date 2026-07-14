import { useDailyLogStore } from "../store/useDailyLog.store";
import { useDailyLogDetailStore } from "../store/useDailyLogDetail.store";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import { useDailyLogHelper } from "../hooks/useDailyLog.helper";
import { useDailyLogDetailHeadless } from "../hooks/useDailyLog.headless";
import { DailyLogSection } from "./DailyLogSection";
import { formatDayMonth, isSameLocalDay, startOfLocalDay, addDays } from "../utils/dailyLog.utils";
import { dailyLogConstants } from "../dailyLog.constants";
import type { DailyLogFieldTemplate, DailyLogFieldType, DailyLogSection as DailyLogSectionType } from "../types/dailyLog.types";
import { useMemo } from "react";
import { Lock } from "lucide-react";

/** Rehydrate a persisted template snapshot back into an array of field templates. */
function parseTemplateSnapshot(templateJson: string | null): DailyLogFieldTemplate[] | null {
    if (!templateJson) return null;
    try {
        const parsed = JSON.parse(templateJson);
        if (!Array.isArray(parsed)) return null;
        return parsed.map((f: any) => ({
            id: Number(f.id ?? 0),
            userId: Number(f.userId ?? 0),
            section: (f.section ?? "input") as DailyLogSectionType,
            fieldKey: String(f.fieldKey ?? ""),
            label: String(f.label ?? ""),
            fieldType: (f.fieldType ?? "text") as DailyLogFieldType,
            groupOrder: f.groupOrder ?? null,
            groupLabel: f.groupLabel ?? null,
            lineOrder: f.lineOrder ?? null,
            rangeMin: f.rangeMin ?? null,
            rangeMax: f.rangeMax ?? null,
            sortOrder: Number(f.sortOrder ?? 0),
            createdAt: new Date(),
            updatedAt: null,
            deletedAt: null,
        }));
    } catch {
        return null;
    }
}

function displayHeader(d: Date): string {
    const today = startOfLocalDay(new Date());
    if (isSameLocalDay(d, today)) return `Today · ${formatDayMonth(d)}`;
    if (isSameLocalDay(d, addDays(today, -1))) return `Yesterday · ${formatDayMonth(d)}`;
    if (isSameLocalDay(d, addDays(today, 1))) return `Tomorrow · ${formatDayMonth(d)}`;
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${dayNames[d.getDay()]} · ${formatDayMonth(d)}`;
}

export function DailyLogEditorPanel() {
    useDailyLogDetailHeadless();
    const { logs } = useDailyLogStore();
    const { selectedDate, isDirty, isSaving } = useDailyLogDetailStore();
    const { fields } = useDailyLogTemplateStore();
    const { upsertLog } = useDailyLogHelper();

    const isToday = selectedDate ? isSameLocalDay(selectedDate, startOfLocalDay(new Date())) : false;
    const readOnly = !isToday;
    const activeFields = useMemo<DailyLogFieldTemplate[]>(() => {
        const liveFields = fields.filter((f) => f.deletedAt == null);
        if (isToday || !selectedDate) return liveFields;
        const log = logs.find((l) => isSameLocalDay(l.logDate, selectedDate));
        const snapshot = log ? parseTemplateSnapshot(log.templateJson) : null;
        return snapshot && snapshot.length > 0 ? snapshot : liveFields;
    }, [fields, logs, selectedDate, isToday]);

    if (!selectedDate) {
        return (
            <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground bg-background">
                Select a day from the grid to start logging.
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col overflow-hidden bg-background">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <div className="text-base font-semibold text-foreground tracking-tight">
                        {displayHeader(selectedDate)}
                    </div>
                    {readOnly && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground/70">
                            <Lock className="w-3 h-3" /> read-only
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {isToday && (
                        <button
                            onClick={() => {
                                const snapshot = JSON.stringify(fields.filter((f) => f.deletedAt == null));
                                upsertLog(selectedDate, snapshot);
                            }}
                            disabled={!isDirty || isSaving}
                            className={
                                "text-[11px] px-3 py-1 rounded-md transition-colors " +
                                (isDirty && !isSaving
                                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                    : "text-muted-foreground/50 cursor-default")
                            }
                        >
                            {isSaving ? "Saving…" : isDirty ? "Save" : "Saved"}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                <div className="h-full grid grid-cols-2 overflow-hidden">
                    {dailyLogConstants.sections.map((section, i) => (
                        <div
                            key={section}
                            className={
                                "min-h-0 overflow-y-auto px-6 py-4 " +
                                (i === 0 ? "border-r border-border/40" : "")
                            }
                        >
                            <DailyLogSection
                                section={section}
                                label={dailyLogConstants.sectionLabels[section]}
                                fields={activeFields.filter((f) => f.section === section)}
                                readOnly={readOnly}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
