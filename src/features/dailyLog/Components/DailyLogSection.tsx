import { DailyLogField } from "./DailyLogField";
import type { DailyLogFieldTemplate, DailyLogSection as DailyLogSectionType } from "../types/dailyLog.types";

interface DailyLogSectionProps {
    section: DailyLogSectionType;
    label: string;
    fields: DailyLogFieldTemplate[];
    readOnly?: boolean;
}

export function DailyLogSection({ section: _section, label, fields, readOnly }: DailyLogSectionProps) {
    // Group fields by groupOrder (null = standalone, rendered in sortOrder)
    const groups: Array<{ groupOrder: number | null; groupLabel: string | null; fields: DailyLogFieldTemplate[] }> = [];
    const seen = new Map<number, number>(); // groupOrder → index in groups

    for (const f of [...fields].sort((a, b) => a.sortOrder - b.sortOrder)) {
        if (f.groupOrder == null) {
            groups.push({ groupOrder: null, groupLabel: null, fields: [f] });
        } else {
            if (!seen.has(f.groupOrder)) {
                seen.set(f.groupOrder, groups.length);
                groups.push({ groupOrder: f.groupOrder, groupLabel: f.groupLabel ?? null, fields: [] });
            }
            groups[seen.get(f.groupOrder)!].fields.push(f);
        }
    }

    return (
        <section>
            <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-4">
                {label}
            </h3>
            <div className="space-y-5">
                {fields.length === 0 && (
                    <div className="text-[13px] text-muted-foreground/70">No fields</div>
                )}
                {groups.map((g, gi) => (
                    <div key={gi}>
                        {g.groupLabel && (
                            <div className="text-left text-[13px] font-medium text-muted-foreground mb-2 mt-1">
                                {g.groupLabel}
                            </div>
                        )}
                        <div className="space-y-3">
                            {g.fields.map((f) => (
                                <DailyLogField key={f.id || f.fieldKey} field={f} readOnly={readOnly} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
