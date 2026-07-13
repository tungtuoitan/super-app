import { DailyLogField } from "./DailyLogField";
import type { DailyLogFieldTemplate, DailyLogSection as DailyLogSectionType } from "../types/dailyLog.types";

interface DailyLogSectionProps {
    section: DailyLogSectionType;
    label: string;
    fields: DailyLogFieldTemplate[];
    readOnly?: boolean;
}

export function DailyLogSection({ section: _section, label, fields, readOnly }: DailyLogSectionProps) {
    return (
        <section>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-4">
                {label}
            </h3>
            <div className="space-y-5">
                {fields.length === 0 && (
                    <div className="text-xs italic text-muted-foreground/50">No fields</div>
                )}
                {fields.map((f) => (
                    <DailyLogField key={f.id} field={f} readOnly={readOnly} />
                ))}
            </div>
        </section>
    );
}
