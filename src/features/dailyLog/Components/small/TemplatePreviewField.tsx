import type { DraftField } from "../../types/dailyLogTemplate.types";

export function PreviewField({ field }: { field: DraftField }) {
    const inlineCls = "w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 border-0 border-b border-transparent px-0 py-1 cursor-default";

    if (field.fieldType === "checkbox") {
        return (
            <div className="flex items-center gap-2 py-1">
                <input type="checkbox" disabled className="accent-sa-amber w-3.5 h-3.5 shrink-0" />
                <span className="text-sm text-foreground/85">{field.label}</span>
            </div>
        );
    }

    return (
        <div>
            <div className="text-[11px] font-medium text-muted-foreground/80 tracking-wide mb-1">{field.label}</div>
            {field.fieldType === "text" && (
                <input type="text" disabled placeholder="—" className={inlineCls} />
            )}
            {field.fieldType === "longText" && (
                <textarea rows={2} disabled placeholder="—" className={inlineCls + " resize-none leading-relaxed"} />
            )}
            {field.fieldType === "number" && (
                <input type="number" disabled placeholder="0" className={inlineCls + " w-24"} />
            )}
            {field.fieldType === "range" && (
                <div className="flex items-center gap-3 py-1">
                    <input type="range" disabled min={field.rangeMin ?? 0} max={field.rangeMax ?? 10} defaultValue={field.rangeMin ?? 0} className="flex-1 accent-sa-amber h-1" />
                    <div className="min-w-[3rem] text-right text-[13px] font-mono">
                        <span className="font-medium text-foreground">{field.rangeMin ?? 0}</span>
                        <span className="text-muted-foreground ml-1">/{field.rangeMax ?? 10}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
