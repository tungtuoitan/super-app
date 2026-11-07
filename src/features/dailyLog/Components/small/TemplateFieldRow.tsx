import { useRef } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import type { DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { dailyLogConstants } from "../../dailyLog.constants";
import { DRAG_TYPE } from "../../dailyLogTemplate.constants";
import type { DailyLogFieldType, DailyLogSection } from "../../types/dailyLog.types";
import type { DraftField, FieldDragItem } from "../../types/dailyLogTemplate.types";

interface FieldRowProps {
    field: DraftField;
    draftIdx: number;
    visibleIdx: number;
    onPatch: (idx: number, patch: Partial<DraftField>) => void;
    onDelete: (idx: number) => void;
    onMove: (fromVisibleIdx: number, toVisibleIdx: number, section: DailyLogSection) => void;
}

export function FieldRow({ field, draftIdx, visibleIdx, onPatch, onDelete, onMove }: FieldRowProps) {
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

    const rowInput = "w-full bg-transparent text-sm border-0 border-b border-transparent hover:border-sa-border-strong focus:border-sa-amber/60 focus:outline-none focus:ring-0 px-0 py-1 transition-colors duration-100";

    return (
        <li
            ref={ref}
            className={`group py-2 transition-colors ${isDragging ? "opacity-40" : ""} ${isOver ? "bg-sa-amber/5 rounded-md" : ""}`}
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
                    className="bg-background text-[13px] text-muted-foreground border border-sa-border-strong rounded-md focus:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer hover:text-foreground py-1 px-1.5 shrink-0"
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
                        className="w-8 bg-transparent border-0 border-b border-transparent hover:border-sa-border-strong focus:border-sa-amber/60 focus:outline-none focus:ring-0 px-0 py-0 text-center text-[11px] font-mono transition-colors duration-100"
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
                        className="w-8 bg-transparent border-0 border-b border-transparent hover:border-sa-border-strong focus:border-sa-amber/60 focus:outline-none focus:ring-0 px-0 py-0 text-center text-[11px] font-mono transition-colors duration-100"
                        title="Line order"
                    />
                </span>
                <button
                    onClick={() => onDelete(draftIdx)}
                    className="p-1 rounded-md opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-sa-danger hover:bg-sa-hover transition-opacity duration-100 shrink-0"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
            {field.fieldType === "range" && (
                <div className="flex items-center gap-4 pl-5 pt-1 text-[13px] text-muted-foreground">
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
