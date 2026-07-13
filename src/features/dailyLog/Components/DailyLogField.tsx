import { useState } from "react";
import { LineChart } from "lucide-react";
import { useDailyLogDetailStore } from "../store/useDailyLogDetail.store";
import { useDailyLogHelper } from "../hooks/useDailyLog.helper";
import type { DailyLogFieldTemplate } from "../types/dailyLog.types";
import { buildFieldPath, coerceFieldValue } from "../utils/dailyLog.utils";
import { DailyLogHistoryDialog } from "./small/DailyLogHistoryDialog";

interface DailyLogFieldProps {
    field: DailyLogFieldTemplate;
    /** When true, all inputs are disabled. Used for non-today logs. */
    readOnly?: boolean;
}

export function DailyLogField({ field, readOnly }: DailyLogFieldProps) {
    const { draftValues } = useDailyLogDetailStore();
    const { patchDraftValue } = useDailyLogHelper();
    const [historyOpen, setHistoryOpen] = useState(false);

    const path = buildFieldPath(field.section, field.fieldKey);
    const raw = draftValues[path];
    const value = coerceFieldValue(raw, field.fieldType);

    const readOnlyTail = readOnly ? " disabled:cursor-default disabled:hover:border-transparent" : "";
    const inlineCls =
        "w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 " +
        "border-0 border-b border-transparent hover:border-border focus:border-primary/60 " +
        "focus:outline-none focus:ring-0 px-0 py-1 transition-colors" +
        readOnlyTail;

    // Checkbox: label + input INLINE, no top label. Everything else: top label + control.
    const isCheckbox = field.fieldType === "checkbox";

    return (
        <div className="group">
            {!isCheckbox && (
                <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-muted-foreground/80 tracking-wide">
                        {field.label}
                    </label>
                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="p-0.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground rounded transition-opacity"
                        title="Show history"
                    >
                        <LineChart className="w-3 h-3" />
                    </button>
                </div>
            )}

            {field.fieldType === "text" && (
                <input
                    type="text"
                    value={value as string}
                    onChange={(e) => patchDraftValue(path, e.target.value)}
                    disabled={readOnly}
                    placeholder="—"
                    className={inlineCls}
                />
            )}

            {field.fieldType === "longText" && (
                <textarea
                    value={value as string}
                    onChange={(e) => patchDraftValue(path, e.target.value)}
                    onInput={(e) => {
                        const el = e.currentTarget;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                    }}
                    ref={(el) => {
                        if (!el) return;
                        el.style.height = "auto";
                        el.style.height = `${el.scrollHeight}px`;
                    }}
                    disabled={readOnly}
                    rows={1}
                    placeholder="—"
                    className={
                        "w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 " +
                        "border-0 border-b border-transparent hover:border-border focus:border-primary/60 " +
                        "focus:outline-none focus:ring-0 px-0 py-1 resize-none leading-relaxed overflow-hidden transition-colors" +
                        readOnlyTail
                    }
                />
            )}

            {isCheckbox && (
                <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none py-1">
                        <input
                            type="checkbox"
                            checked={value as boolean}
                            onChange={(e) => patchDraftValue(path, e.target.checked)}
                            disabled={readOnly}
                            className="w-3.5 h-3.5 accent-primary"
                        />
                        <span className="text-sm text-foreground/85">{field.label}</span>
                    </label>
                    <button
                        onClick={() => setHistoryOpen(true)}
                        className="p-0.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-foreground rounded transition-opacity"
                        title="Show history"
                    >
                        <LineChart className="w-3 h-3" />
                    </button>
                </div>
            )}

            {field.fieldType === "number" && (
                <input
                    type="number"
                    value={value as number}
                    onChange={(e) => patchDraftValue(path, Number(e.target.value))}
                    disabled={readOnly}
                    placeholder="0"
                    className={inlineCls + " w-24"}
                />
            )}

            {field.fieldType === "range" && (() => {
                const min = field.rangeMin ?? 0;
                const max = field.rangeMax ?? 10;
                const step = max - min > 100 ? 1 : max - min > 20 ? 0.5 : 1;
                return (
                    <div className="flex items-center gap-3 py-1">
                        <input
                            type="range"
                            min={min}
                            max={max}
                            step={step}
                            value={value as number}
                            onChange={(e) => patchDraftValue(path, Number(e.target.value))}
                            disabled={readOnly}
                            className="flex-1 accent-primary h-1"
                        />
                        <div className="min-w-[3rem] text-right text-xs">
                            <span className="font-medium text-foreground">{value as number}</span>
                            <span className="text-muted-foreground/50 ml-1">/{max}</span>
                        </div>
                    </div>
                );
            })()}

            {historyOpen && (
                <DailyLogHistoryDialog field={field} onClose={() => setHistoryOpen(false)} />
            )}
        </div>
    );
}
