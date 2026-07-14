import { useEffect, useState, useRef, useCallback } from "react";
import { X, Trash2, Plus, GripVertical } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import type { DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import { useDailyLogTemplateHelper } from "../hooks/useDailyLog.helper";
import { dailyLogConstants } from "../dailyLog.constants";
import type { DailyLogFieldTemplate, DailyLogFieldType, DailyLogSection } from "../types/dailyLog.types";

interface DailyLogTemplateDialogProps {
    onClose: () => void;
}

type DraftField = Omit<DailyLogFieldTemplate, "createdAt" | "updatedAt">;

const DRAG_TYPE = "DAILY_LOG_FIELD";

interface FieldDragItem {
    type: typeof DRAG_TYPE;
    visibleIdx: number;
    section: DailyLogSection;
}

function slugify(input: string): string {
    return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field";
}

// ─── Draggable field row ──────────────────────────────────────────────────────

interface FieldRowProps {
    field: DraftField;
    draftIdx: number;
    visibleIdx: number;
    onPatch: (idx: number, patch: Partial<DraftField>) => void;
    onDelete: (idx: number) => void;
    onMove: (fromVisibleIdx: number, toVisibleIdx: number, section: DailyLogSection) => void;
}

function FieldRow({ field, draftIdx, visibleIdx, onPatch, onDelete, onMove }: FieldRowProps) {
    const ref = useRef<HTMLLIElement>(null);

    const [{ isDragging }, drag, preview] = useDrag<FieldDragItem, void, { isDragging: boolean }>({
        type: DRAG_TYPE,
        item: { type: DRAG_TYPE, visibleIdx, section: field.section },
        collect: (m: DragSourceMonitor) => ({ isDragging: m.isDragging() }),
    });

    const [{ isOver }, drop] = useDrop<FieldDragItem, void, { isOver: boolean }>({
        accept: DRAG_TYPE,
        canDrop: (item) => item.section === field.section,
        drop: (item) => {
            if (item.visibleIdx !== visibleIdx && item.section === field.section) {
                onMove(item.visibleIdx, visibleIdx, field.section);
            }
        },
        collect: (m: DropTargetMonitor) => ({ isOver: m.isOver() && m.canDrop() }),
    });

    preview(drop(ref));

    const rowInput = "w-full bg-transparent text-sm border-0 border-b border-transparent hover:border-border focus:border-primary/60 focus:outline-none focus:ring-0 px-0 py-1 transition-colors";

    return (
        <li
            ref={ref}
            className={`group py-2 transition-colors ${isDragging ? "opacity-40" : ""} ${isOver ? "bg-primary/5 rounded" : ""}`}
        >
            <div className="flex items-center gap-2">
                <span
                    ref={drag as unknown as React.RefObject<HTMLSpanElement>}
                    className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 shrink-0 transition-colors"
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </span>
                <input
                    value={field.label}
                    onChange={(e) => onPatch(draftIdx, { label: e.target.value })}
                    placeholder="Field label"
                    className={rowInput + " flex-1"}
                />
                <select
                    value={field.fieldType}
                    onChange={(e) => {
                        const nextType = e.target.value as DailyLogFieldType;
                        const patch: Partial<DraftField> = { fieldType: nextType };
                        if (nextType === "range") {
                            patch.rangeMin = field.rangeMin ?? dailyLogConstants.rangeDefaults.min;
                            patch.rangeMax = field.rangeMax ?? dailyLogConstants.rangeDefaults.max;
                        }
                        onPatch(draftIdx, patch);
                    }}
                    className="bg-background text-xs text-muted-foreground/80 border border-border/60 rounded focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:text-foreground py-1 px-1.5 shrink-0"
                >
                    {dailyLogConstants.fieldTypes.map((t) => (
                        <option key={t} value={t} className="bg-background text-foreground">
                            {dailyLogConstants.fieldTypeLabels[t]}
                        </option>
                    ))}
                </select>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/50 shrink-0">
                    <span>G:</span>
                    <input
                        type="number"
                        min={0}
                        value={field.groupOrder ?? ""}
                        onChange={(e) => onPatch(draftIdx, { groupOrder: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="—"
                        className="w-8 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary/60 focus:outline-none focus:ring-0 px-0 py-0 text-center text-[11px] transition-colors"
                        title="Group order"
                    />
                </span>
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground/50 shrink-0">
                    <span>L:</span>
                    <input
                        type="number"
                        min={0}
                        value={field.lineOrder ?? ""}
                        onChange={(e) => onPatch(draftIdx, { lineOrder: e.target.value === "" ? null : Number(e.target.value) })}
                        placeholder="—"
                        className="w-8 bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary/60 focus:outline-none focus:ring-0 px-0 py-0 text-center text-[11px] transition-colors"
                        title="Line order"
                    />
                </span>
                <button
                    onClick={() => onDelete(draftIdx)}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-destructive transition-opacity shrink-0"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
            {field.fieldType === "range" && (
                <div className="flex items-center gap-4 pl-5 pt-1 text-xs text-muted-foreground/70">
                    <span className="inline-flex items-center gap-1.5">
                        <span>min</span>
                        <input
                            type="number"
                            value={field.rangeMin ?? 0}
                            onChange={(e) => onPatch(draftIdx, { rangeMin: Number(e.target.value) })}
                            className={rowInput + " w-14 text-right"}
                        />
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span>max</span>
                        <input
                            type="number"
                            value={field.rangeMax ?? 10}
                            onChange={(e) => onPatch(draftIdx, { rangeMax: Number(e.target.value) })}
                            className={rowInput + " w-14 text-right"}
                        />
                    </span>
                </div>
            )}
            {field.groupOrder != null && (
                <div className="flex items-center gap-1.5 pl-5 pt-0.5">
                    <span className="text-[11px] text-muted-foreground/40 shrink-0">Group label:</span>
                    <input
                        value={field.groupLabel ?? ""}
                        onChange={(e) => onPatch(draftIdx, { groupLabel: e.target.value || null })}
                        placeholder="optional"
                        className={rowInput + " flex-1 text-[11px]"}
                    />
                </div>
            )}
        </li>
    );
}

// ─── Trash drop zone ──────────────────────────────────────────────────────────

interface TrashZoneProps {
    section: DailyLogSection;
    onDrop: (visibleIdx: number) => void;
}

function TrashZone({ section, onDrop }: TrashZoneProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver }, drop] = useDrop<FieldDragItem, void, { isOver: boolean }>({
        accept: DRAG_TYPE,
        canDrop: (item) => item.section === section,
        drop: (item) => onDrop(item.visibleIdx),
        collect: (m: DropTargetMonitor) => ({ isOver: m.isOver() && m.canDrop() }),
    });
    drop(ref);

    return (
        <div
            ref={ref}
            className={`mt-1 flex items-center justify-center gap-1.5 rounded border border-dashed px-2 py-1.5 text-[11px] transition-colors ${
                isOver
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border/40 text-muted-foreground/30"
            }`}
        >
            <Trash2 className="w-3 h-3" />
            <span>Drop to remove</span>
        </div>
    );
}

// ─── Preview field ────────────────────────────────────────────────────────────

function PreviewField({ field }: { field: DraftField }) {
    const inlineCls = "w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 border-0 border-b border-transparent px-0 py-1 cursor-default";

    if (field.fieldType === "checkbox") {
        return (
            <div className="flex items-center gap-2 py-1">
                <input type="checkbox" disabled className="accent-primary w-3.5 h-3.5 shrink-0" />
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
                    <input type="range" disabled min={field.rangeMin ?? 0} max={field.rangeMax ?? 10} defaultValue={field.rangeMin ?? 0} className="flex-1 accent-primary h-1" />
                    <div className="min-w-[3rem] text-right text-xs">
                        <span className="font-medium text-foreground">{field.rangeMin ?? 0}</span>
                        <span className="text-muted-foreground/50 ml-1">/{field.rangeMax ?? 10}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Preview section — renders fields with group/line layout logic ──────────

function PreviewSection({ fields }: { fields: DraftField[] }) {
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
                            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50 mb-2">{groupLabel}</div>
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

// ─── Main dialog ──────────────────────────────────────────────────────────────

function DialogContent({ onClose }: DailyLogTemplateDialogProps) {
    const { fields } = useDailyLogTemplateStore();
    const { upsertTemplate } = useDailyLogTemplateHelper();

    const [drafts, setDrafts] = useState<DraftField[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setDrafts(fields.map((f) => ({ ...f })));
    }, [fields]);

    const addField = (section: DailyLogSection) => {
        const maxOrder = drafts
            .filter((d) => d.section === section && d.deletedAt == null)
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
                groupOrder: null,
                groupLabel: null,
                lineOrder: null,
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
            if (target.id === 0) return prev.filter((_, i) => i !== idx);
            return prev.map((d, i) => (i === idx ? { ...d, deletedAt: new Date() } : d));
        });
    };

    const deleteByVisibleIdx = useCallback((section: DailyLogSection, visibleIdx: number) => {
        setDrafts((prev) => {
            const visible = prev.map((d, i) => ({ d, i })).filter(({ d }) => d.deletedAt == null && d.section === section);
            const target = visible[visibleIdx];
            if (!target) return prev;
            const { d, i } = target;
            if (d.id === 0) return prev.filter((_, idx) => idx !== i);
            return prev.map((dr, idx) => (idx === i ? { ...dr, deletedAt: new Date() } : dr));
        });
    }, []);

    const moveField = useCallback((fromVisibleIdx: number, toVisibleIdx: number, section: DailyLogSection) => {
        setDrafts((prev) => {
            const deleted = prev.filter((d) => d.deletedAt != null);
            const active = prev.filter((d) => d.deletedAt == null);
            const sectionItems = active.filter((d) => d.section === section);
            const otherItems = active.filter((d) => d.section !== section);

            const reordered = [...sectionItems];
            const [moved] = reordered.splice(fromVisibleIdx, 1);
            reordered.splice(toVisibleIdx, 0, moved);
            const withOrder = reordered.map((d, i) => ({ ...d, sortOrder: i }));

            return [...otherItems, ...withOrder, ...deleted];
        });
    }, []);

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
                    groupOrder: d.groupOrder ?? null,
                    groupLabel: d.groupLabel ?? null,
                    lineOrder: d.lineOrder ?? null,
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

    const getVisible = (section: DailyLogSection) =>
        drafts
            .map((d, idx) => ({ d, idx }))
            .filter(({ d }) => d.deletedAt == null && d.section === section)
            .sort((a, b) => a.d.sortOrder - b.d.sortOrder);

    return (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center" onClick={onClose}>
            {/* Backdrop — dark enough to clearly separate dialog from app */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
            <div
                className="relative bg-[#1c1c1e] border border-white/12 ring-1 ring-white/6 rounded-xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] w-[96vw] h-[94vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
                    <h3 className="text-sm font-semibold tracking-tight">Form template</h3>
                    <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground/70 hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body — 2 columns */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Left: Editor */}
                    <div className="w-80 shrink-0 overflow-y-auto px-4 pb-4 space-y-5 border-r border-border/40">
                        {dailyLogConstants.sections.map((section) => {
                            const visible = getVisible(section);
                            return (
                                <div key={section}>
                                    <div className="flex items-center justify-between mb-1.5">
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
                                        {visible.map(({ d, idx }, visibleIdx) => (
                                            <FieldRow
                                                key={idx}
                                                field={d}
                                                draftIdx={idx}
                                                visibleIdx={visibleIdx}
                                                onPatch={patchDraft}
                                                onDelete={deleteDraft}
                                                onMove={moveField}
                                            />
                                        ))}
                                    </ul>
                                    {visible.length > 0 && (
                                        <TrashZone
                                            section={section}
                                            onDrop={(visibleIdx) => deleteByVisibleIdx(section, visibleIdx)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Live preview — mirrors DailyLogEditorPanel layout exactly */}
                    <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
                        <div className="h-full grid grid-cols-2 overflow-hidden">
                            {dailyLogConstants.sections.map((section, i) => {
                                const visible = getVisible(section);
                                return (
                                    <div
                                        key={section}
                                        className={`min-h-0 overflow-y-auto px-6 py-4 text-left ${i === 0 ? "border-r border-border/40" : ""}`}
                                    >
                                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 mb-4">
                                            {dailyLogConstants.sectionLabels[section]}
                                        </h3>
                        {visible.length === 0 ? (
                                            <div className="text-xs italic text-muted-foreground/50">No fields</div>
                                        ) : (
                                            <PreviewSection fields={visible.map(x => x.d)} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 flex items-center justify-end gap-1 border-t border-border/40 shrink-0">
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

export function DailyLogTemplateDialog({ onClose }: DailyLogTemplateDialogProps) {
    return (
        <DndProvider backend={HTML5Backend}>
            <DialogContent onClose={onClose} />
        </DndProvider>
    );
}
