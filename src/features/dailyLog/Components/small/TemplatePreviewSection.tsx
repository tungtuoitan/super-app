import type { DraftField } from "../../types/dailyLogTemplate.types";
import { PreviewField } from "./TemplatePreviewField";

export function PreviewSection({ fields }: { fields: DraftField[] }) {
    // Group fields by groupOrder (null = own group), then within each group by lineOrder
    const grouped = new Map<number | string, DraftField[]>();
    fields.forEach((f) => {
        const gKey = f.groupOrder ?? `solo_${f.sortOrder}`;
        if (!grouped.has(gKey)) grouped.set(gKey, []);
        grouped.get(gKey)!.push(f);
    });

    // Sort groups by first field's sortOrder
    const sortedGroups = [...grouped.entries()].sort(([, a], [, b]) => a[0].sortOrder - b[0].sortOrder);

    return (
        <div className="space-y-5">
            {sortedGroups.map(([gKey, groupFields]) => {
                const groupLabel = groupFields[0].groupLabel;
                // Sort fields within group by lineOrder, then sortOrder
                const sorted = [...groupFields].sort((a, b) => {
                    const la = a.lineOrder ?? a.sortOrder;
                    const lb = b.lineOrder ?? b.sortOrder;
                    return la !== lb ? la - lb : a.sortOrder - b.sortOrder;
                });

                // Split into lines
                const lines = new Map<number | string, DraftField[]>();
                sorted.forEach((f) => {
                    const lKey = f.lineOrder ?? `solo_${f.sortOrder}`;
                    if (!lines.has(lKey)) lines.set(lKey, []);
                    lines.get(lKey)!.push(f);
                });
                const sortedLines = [...lines.entries()].sort(([, a], [, b]) => {
                    const la = a[0].lineOrder ?? a[0].sortOrder;
                    const lb = b[0].lineOrder ?? b[0].sortOrder;
                    return la - lb;
                });

                return (
                    <div key={String(gKey)}>
                        {groupLabel && (
                            <div className="text-[13px] font-medium text-muted-foreground mb-2">{groupLabel}</div>
                        )}
                        <div className="space-y-4">
                            {sortedLines.map(([lKey, lineFields]) => {
                                if (lineFields.length === 1) {
                                    return <PreviewField key={String(lKey)} field={lineFields[0]} />;
                                }
                                return (
                                    <div key={String(lKey)} className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${lineFields.length}, 1fr)` }}>
                                        {lineFields.map((f, fi) => <PreviewField key={fi} field={f} />)}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
