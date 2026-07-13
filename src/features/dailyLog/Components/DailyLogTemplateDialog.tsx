import { useEffect, useState } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import { useDailyLogTemplateHelper } from "../hooks/useDailyLog.helper";
import { dailyLogConstants } from "../dailyLog.constants";
import type { DailyLogFieldTemplate, DailyLogFieldType, DailyLogSection } from "../types/dailyLog.types";

interface DailyLogTemplateDialogProps {
    onClose: () => void;
}

type DraftField = Omit<DailyLogFieldTemplate, "createdAt" | "updatedAt">;

function slugify(input: string): string {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

export function DailyLogTemplateDialog({ onClose }: DailyLogTemplateDialogProps) {
    const { fields } = useDailyLogTemplateStore();
    const { upsertTemplate } = useDailyLogTemplateHelper();

    const [drafts, setDrafts] = useState<DraftField[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDrafts(fields.map((f) => ({ ...f })));
    }, [fields]);

    const addField = (section: DailyLogSection) => {
        const maxOrder = drafts.filter((d) => d.section === section && d.deletedAt == null)
            .reduce((max, d) => Math.max(max, d.sortOrder), -1);
        setDrafts((prev) => [
            ...prev,
            {
                id: 0,
                userId: 0,
                section,
                fieldKey: `field_${Date.now()}`,
                label: "New field",
                fieldType: "text",
                rangeMin: null,
                rangeMax: null,
                sortOrder: maxOrder + 1,
                deletedAt: null,
            },
        ]);
    };

    const patchDraft = (idx: number, patch: Partial<DraftField>) => {
        setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
    };

    const deleteDraft = (idx: number) => {
        setDrafts((prev) => {
            const target = prev[idx];
            if (target.id === 0) {
                return prev.filter((_, i) => i !== idx);
            }
            return prev.map((d, i) => (i === idx ? { ...d, deletedAt: new Date() } : d));
        });
    };

    const save = async () => {
        setIsSaving(true);
        try {
            await upsertTemplate(
                drafts.map((d) => ({
                    id: d.id > 0 ? d.id : undefined,
                    section: d.section,
                    fieldKey: d.fieldKey || slugify(d.label),
                    label: d.label,
                    fieldType: d.fieldType,
                    rangeMin: d.fieldType === "range" ? (d.rangeMin ?? 0) : null,
                    rangeMax: d.fieldType === "range" ? (d.rangeMax ?? 10) : null,
                    sortOrder: d.sortOrder,
                    deletedAt: d.deletedAt ? d.deletedAt.toISOString() : null,
                }))
            );
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const visible = drafts.map((d, idx) => ({ d, idx })).filter((x) => x.d.deletedAt == null);

    const rowInput = "w-full bg-transparent text-sm border-0 border-b border-transparent hover:border-border focus:border-primary/60 focus:outline-none focus:ring-0 px-0 py-1 transition-colors";

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 pt-5 pb-3">
                    <h3 className="text-sm font-semibold tracking-tight">Form template</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground/70 hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
                    {dailyLogConstants.sections.map((section) => (
                        <div key={section}>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] uppercase font-semibold tracking-[0.12em] text-muted-foreground/70">
                                    {dailyLogConstants.sectionLabels[section]}
                                </h4>
                                <button
                                    onClick={() => addField(section)}
                                    className="text-[11px] flex items-center gap-1 px-1.5 py-0.5 hover:bg-muted rounded text-muted-foreground/70 hover:text-foreground transition-colors"
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>
                            <ul className="divide-y divide-border/40">
                                {visible.filter((x) => x.d.section === section).map(({ d, idx }) => (
                                    <li key={idx} className="group py-2">
                                        <div className="flex items-center gap-3">
                                            <input
                                                value={d.label}
                                                onChange={(e) => patchDraft(idx, { label: e.target.value })}
                                                placeholder="Field label"
                                                className={rowInput + " flex-1"}
                                            />
                                            <select
                                                value={d.fieldType}
                                                onChange={(e) => {
                                                    const nextType = e.target.value as DailyLogFieldType;
                                                    const patch: Partial<DraftField> = { fieldType: nextType };
                                                    if (nextType === "range") {
                                                        patch.rangeMin = d.rangeMin ?? dailyLogConstants.rangeDefaults.min;
                                                        patch.rangeMax = d.rangeMax ?? dailyLogConstants.rangeDefaults.max;
                                                    }
                                                    patchDraft(idx, patch);
                                                }}
                                                className="bg-background text-xs text-muted-foreground/80 border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:text-foreground py-1 px-1.5"
                                            >
                                                {dailyLogConstants.fieldTypes.map((t) => (
                                                    <option key={t} value={t} className="bg-background text-foreground">{dailyLogConstants.fieldTypeLabels[t]}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => deleteDraft(idx)}
                                                className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        {d.fieldType === "range" && (
                                            <div className="flex items-center gap-4 pl-0 pt-1 text-xs text-muted-foreground/70">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span>min</span>
                                                    <input
                                                        type="number"
                                                        value={d.rangeMin ?? 0}
                                                        onChange={(e) => patchDraft(idx, { rangeMin: Number(e.target.value) })}
                                                        className={rowInput + " w-14 text-right"}
                                                    />
                                                </span>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span>max</span>
                                                    <input
                                                        type="number"
                                                        value={d.rangeMax ?? 10}
                                                        onChange={(e) => patchDraft(idx, { rangeMax: Number(e.target.value) })}
                                                        className={rowInput + " w-14 text-right"}
                                                    />
                                                </span>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-3 flex items-center justify-end gap-1">
                    <button onClick={onClose} className="text-xs px-3 py-1.5 rounded hover:bg-muted text-muted-foreground/80 hover:text-foreground transition-colors">Cancel</button>
                    <button
                        onClick={save}
                        disabled={isSaving}
                        className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? "Saving…" : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}
