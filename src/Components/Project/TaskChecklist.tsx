/**
 * TaskChecklist Component
 *
 * Two display modes:
 *  - Collapsed (default): progress bar + last checked item name
 *  - Expanded: floating popup with full checklist
 *
 * Item row layout: [check] [skip?] item text
 * Skip button is shown inline next to check (not hover-only on the right).
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
    ChecklistJSON,
    validateChecklistText,
    parseTextToChecklist,
    checklistToText,
    toggleChecklistItem,
    isChecklistAllDone,
    checklistProgress,
    flatItemIndex,
    getFlatItems,
} from "@/utils/checklist.utils";
import {
    CheckCircle2,
    Circle,
    SkipForward,
    ChevronDown,
    ChevronRight,
    Edit2,
    Plus,
    Save,
    X,
    Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskChecklistProps {
    checklist: ChecklistJSON | null;
    templateText: string;
    disabled?: boolean;
    onChange: (updated: ChecklistJSON) => void;
    onSave: (json: ChecklistJSON) => void;
    onSetAsDefault: (templateText: string) => Promise<void>;
}

export function TaskChecklist({
    checklist,
    templateText,
    disabled = false,
    onChange,
    onSave,
    onSetAsDefault,
}: TaskChecklistProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [editErrors, setEditErrors] = useState<string[]>([]);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const [settingDefault, setSettingDefault] = useState(false);

    // Anchor for popup positioning
    const barRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<HTMLDivElement>(null);

    const progress = useMemo(() => (checklist ? checklistProgress(checklist) : null), [checklist]);
    const allDone = useMemo(() => (checklist ? isChecklistAllDone(checklist) : false), [checklist]);

    const nextRequiredIndex = useMemo(() => {
        if (!checklist) return 0;
        const flat = getFlatItems(checklist);
        for (let i = 0; i < flat.length; i++) {
            if (!flat[i].isChecked && !flat[i].isSkipped) return i;
        }
        return flat.length;
    }, [checklist]);

    /** The last completed item name to show in collapsed bar */
    const lastCheckedName = useMemo(() => {
        if (!checklist) return null;
        const flat = getFlatItems(checklist);
        // Walk backwards to find last checked/skipped
        for (let i = flat.length - 1; i >= 0; i--) {
            if (flat[i].isChecked || flat[i].isSkipped) return flat[i].name;
        }
        return null;
    }, [checklist]);

    /** Next pending item name */
    const nextPendingName = useMemo(() => {
        if (!checklist) return null;
        const flat = getFlatItems(checklist);
        return flat[nextRequiredIndex]?.name ?? null;
    }, [checklist, nextRequiredIndex]);

    const handleToggle = useCallback(
        (gi: number, ii: number, action: "check" | "skip") => {
            if (!checklist || disabled) return;
            const fi = flatItemIndex(checklist, gi, ii);
            const item = checklist.groups[gi].items[ii];
            if (!item.isChecked && !item.isSkipped && fi > nextRequiredIndex) return;
            onChange(toggleChecklistItem(checklist, gi, ii, action));
        },
        [checklist, disabled, nextRequiredIndex, onChange]
    );

    const toggleGroup = (name: string) =>
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });

    const handleStartEdit = () => {
        setEditText(checklist ? checklistToText(checklist) : templateText);
        setEditErrors([]);
        setIsEditing(true);
        setIsExpanded(true);
    };

    const handleEditChange = (text: string) => {
        setEditText(text);
        if (editErrors.length > 0) setEditErrors(validateChecklistText(text).errors);
    };

    const handleSaveEdit = () => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        onSave(parseTextToChecklist(editText, checklist ?? undefined));
        setIsEditing(false);
        setEditErrors([]);
    };

    const handleSetAsDefault = async () => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        setSettingDefault(true);
        try { await onSetAsDefault(editText); }
        finally { setSettingDefault(false); }
    };

    const handleCancelEdit = () => { setIsEditing(false); setEditErrors([]); };

    // Close popup on outside click
    useEffect(() => {
        if (!isExpanded) return;
        const handler = (e: MouseEvent) => {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                barRef.current && !barRef.current.contains(e.target as Node)
            ) {
                setIsExpanded(false);
                setIsEditing(false);
                setEditErrors([]);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isExpanded]);

    // ── No checklist yet ──────────────────────────────────────────────────────
    if (!checklist && !isEditing) {
        return (
            <button
                onClick={handleStartEdit}
                disabled={disabled}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" />
                Create checklist
            </button>
        );
    }

    // ── Collapsed bar (always rendered when checklist exists) ─────────────────
    const collapsedBar = checklist && (
        <div
            ref={barRef}
            className="flex items-center gap-2 cursor-pointer group/bar"
            onClick={() => !isExpanded && setIsExpanded(true)}
        >
            {/* Progress bar */}
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                    className={cn(
                        "h-full rounded-full transition-all duration-300",
                        allDone ? "bg-green-500" : "bg-primary"
                    )}
                    style={{ width: progress ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                />
            </div>

            {/* Count */}
            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {progress?.done}/{progress?.total}
            </span>

            {/* Last / next item label */}
            {!isExpanded && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[160px] shrink-0">
                    {allDone
                        ? "✓ All done"
                        : lastCheckedName
                        ? `↳ ${nextPendingName ?? lastCheckedName}`
                        : nextPendingName ?? ""}
                </span>
            )}

            {/* Expand / collapse toggle */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded((v) => !v); }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title={isExpanded ? "Collapse" : "Expand checklist"}
            >
                {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5" />
                    : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
        </div>
    );

    // ── Popup content ─────────────────────────────────────────────────────────
    const popup = isExpanded && (
        <div
            ref={popupRef}
            className={cn(
                "absolute left-0 right-0 z-50 mt-1",
                "rounded-lg border border-border bg-[#222] shadow-xl",
                "w-[98%] max-h-[420px] overflow-y-auto"
            )}
        >
            {/* Popup header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border sticky top-0 bg-background z-10">
                <span className="text-xs font-medium text-foreground">Checklist</span>
                <div className="flex items-center gap-1">
                    {!disabled && !isEditing && (
                        <button
                            onClick={handleStartEdit}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit checklist"
                        >
                            <Edit2 className="h-3 w-3" />
                        </button>
                    )}
                    <button
                        onClick={() => { setIsExpanded(false); setIsEditing(false); setEditErrors([]); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Close"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <div className="px-3 py-2 space-y-1.5">
                {/* ── Edit mode ── */}
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editText}
                            onChange={(e) => handleEditChange(e.target.value)}
                            className={cn(
                                "w-full text-xs font-mono rounded border bg-muted/30 px-3 py-2 resize-y outline-none focus:border-primary transition-colors min-h-[180px]",
                                editErrors.length > 0 ? "border-destructive" : "border-border"
                            )}
                            placeholder={"# Group Name\n- Item one\n- Optional item (o)"}
                            spellCheck={false}
                            autoFocus
                        />
                        {editErrors.length > 0 && (
                            <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-0.5">
                                {editErrors.map((e, i) => (
                                    <p key={i} className="text-xs text-destructive leading-relaxed">{e}</p>
                                ))}
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                            <code className="bg-muted px-0.5 rounded"># Group</code>{" · "}
                            <code className="bg-muted px-0.5 rounded">- Item</code>{" · "}
                            end with <code className="bg-muted px-0.5 rounded">(o)</code> for optional
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={handleSaveEdit} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                                <Save className="h-3 w-3" /> Save
                            </button>
                            <button
                                onClick={handleSetAsDefault}
                                disabled={settingDefault}
                                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                                title="Save as the default checklist template for this task type"
                            >
                                <Star className="h-3 w-3" />
                                {settingDefault ? "Saving…" : "Set as default"}
                            </button>
                            <button onClick={handleCancelEdit} className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                                <X className="h-3 w-3" /> Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ── View mode ── */
                    <>
                        {checklist!.groups.map((group, gi) => {
                            const collapsed = collapsedGroups.has(group.name);
                            const groupDone = group.items.every((i) => i.isChecked || i.isSkipped);
                            return (
                                <div key={gi} className="space-y-0.5">
                                    {/* Group header */}
                                    <button
                                        onClick={() => toggleGroup(group.name)}
                                        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground w-full text-left transition-colors py-0.5"
                                    >
                                        {collapsed
                                            ? <ChevronRight className="h-3 w-3 shrink-0" />
                                            : <ChevronDown className="h-3 w-3 shrink-0" />}
                                        <span className={cn(groupDone && "line-through opacity-50")}>
                                            {group.name}
                                        </span>
                                    </button>

                                    {/* Items */}
                                    {!collapsed && group.items.map((item, ii) => {
                                        const fi = flatItemIndex(checklist!, gi, ii);
                                        const isLocked = !item.isChecked && !item.isSkipped && fi > nextRequiredIndex;
                                        const showSkip = item.isOptional && !item.isChecked && !disabled && !isLocked;

                                        return (
                                            <div
                                                key={ii}
                                                className={cn(
                                                    "flex items-start gap-1.5 pl-4 py-0.5 rounded",
                                                    isLocked ? "opacity-35" : "hover:bg-muted/40"
                                                )}
                                            >
                                                {/* Check button */}
                                                <button
                                                    onClick={() => handleToggle(gi, ii, "check")}
                                                    disabled={disabled || isLocked}
                                                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {item.isChecked
                                                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                        : <Circle className="h-3.5 w-3.5" />}
                                                </button>

                                                {/* Skip button — inline, right next to check */}
                                                {showSkip ? (
                                                    <button
                                                        onClick={() => handleToggle(gi, ii, "skip")}
                                                        className={cn(
                                                            "mt-0.5 shrink-0 transition-colors",
                                                            item.isSkipped
                                                                ? "text-amber-500"
                                                                : "text-muted-foreground/40 hover:text-amber-500"
                                                        )}
                                                        title={item.isSkipped ? "Un-skip" : "Skip (optional)"}
                                                    >
                                                        <SkipForward className="h-3 w-3" />
                                                    </button>
                                                ) : (
                                                    /* Placeholder to keep text alignment consistent */
                                                    <span className="w-4 shrink-0" />
                                                )}

                                                {/* Item text */}
                                                <span
                                                    className={cn(
                                                        "flex-1 text-xs leading-5 text-left",
                                                        (item.isChecked || item.isSkipped) && "line-through text-muted-foreground opacity-70"
                                                    )}
                                                >
                                                    {item.name}
                                                    {item.isOptional && (
                                                        <span className="ml-1 text-[10px] opacity-40">(o)</span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {allDone && (
                            <div className="flex items-center gap-1.5 text-xs text-green-500 font-medium pt-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                All checks complete — task can now be closed.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="relative">
            {collapsedBar}
            {popup}
        </div>
    );
}
