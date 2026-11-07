import { useEffect, useState, useCallback } from "react";
import { X, Plus } from "lucide-react";
import { ShadcnButton } from "@/shared";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useDailyLogTemplateStore } from "../store/useDailyLogTemplate.store";
import { useDailyLogTemplateHelper } from "../hooks/useDailyLog.helper";
import { dailyLogConstants } from "../dailyLog.constants";
import { slugify } from "../utils/dailyLogTemplate.utils";
import type { DailyLogSection } from "../types/dailyLog.types";
import type { DraftField } from "../types/dailyLogTemplate.types";
import { FieldRow } from "./small/TemplateFieldRow";
import { TrashZone } from "./small/TemplateTrashZone";
import { PreviewSection } from "./small/TemplatePreviewSection";

interface DailyLogTemplateDialogProps {
    onClose: () => void;
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
            <div className="absolute inset-0 bg-background/80" />
            <div
                className="relative bg-popover border border-sa-border-strong rounded-xl sa-shadow-pop w-[96vw] h-[94vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
                    <h3 className="text-sm font-medium text-foreground">Form template</h3>
                    <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:bg-sa-hover hover:text-foreground transition-colors duration-100">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body — 2 columns */}
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {/* Left: Editor */}
                    <div className="w-80 shrink-0 overflow-y-auto px-4 pb-4 space-y-5 border-r border-sa-border">
                        {dailyLogConstants.sections.map((section) => {
                            const visible = getVisible(section);
                            return (
                                <div key={section}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <h4 className="text-[11px] uppercase font-medium tracking-wide text-muted-foreground">
                                            {dailyLogConstants.sectionLabels[section]}
                                        </h4>
                                        <button
                                            onClick={() => addField(section)}
                                            className="text-[13px] flex items-center gap-1 px-1.5 h-6 hover:bg-sa-hover rounded-md text-muted-foreground hover:text-foreground transition-colors duration-100"
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
                                        className={`min-h-0 overflow-y-auto px-6 py-4 text-left ${i === 0 ? "border-r border-sa-border" : ""}`}
                                    >
                                        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-4">
                                            {dailyLogConstants.sectionLabels[section]}
                                        </h3>
                        {visible.length === 0 ? (
                                            <div className="text-[13px] text-muted-foreground/70">No fields</div>
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
                <div className="px-6 py-3 flex items-center justify-end gap-2 border-t border-sa-border shrink-0">
                    <ShadcnButton variant="ghost" size="sm" onClick={onClose}>Cancel</ShadcnButton>
                    <ShadcnButton size="sm" onClick={save} disabled={isSaving}>
                        {isSaving ? "Saving…" : "Save"}
                    </ShadcnButton>
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