/**
 * TaskProcess Component
 *
 * Inline display within the Process tab section.
 * Shows progress bar header + checklist items directly (no popup).
 * Process steps are always sequential (locked until previous is done).
 */

import { flatItemIndex } from "@/utils/checklist.utils";
import {
    CheckCircle2,
    Circle,
    ChevronDown,
    ChevronRight,
    Edit2,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskProcessProvider, useTaskProcessStore } from "../store/useTaskProcess.store";
import { useTaskProcessSelector } from "../Selectors/TaskProcessSelector";
import { useTaskDetailProcessSelector } from "../Selectors/TaskDetailProcessSelector";
import { useTaskProcessHelper } from "../hooks/useTaskProcess.helper";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskProcessHeadless } from "../HeadlessComponents/useTaskProcess.headless";

export function TaskProcess() {
    return (
        <TaskProcessProvider>
            <TaskProcessInner />
        </TaskProcessProvider>
    );
}

function TaskProcessInner() {
    useTaskProcessHeadless();
    const {
        progress, allDone, nextRequiredIndex,
    } = useTaskProcessSelector();

    const { parsedProcess } = useTaskDetailProcessSelector();

    const {
        isProcessEditing,
        editText,
        editErrors,
        collapsedGroups,
        editCursorPos,
        setEditCursorPos,
    } = useTaskProcessStore();

    const { isDisabled } = useTaskDetailSelector();

    const {
        handleToggle,
        toggleGroup,
        handleStartEdit,
        handleStartEditAt,
        handleEditChange,
    } = useTaskProcessHelper();

    // ── No process yet — show "Create" button ─────────────────────────────────
    if (!parsedProcess && !isProcessEditing) {
        return (
            <button
                onClick={handleStartEdit}
                disabled={isDisabled}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" />
                Create process
            </button>
        );
    }

    // ── Edit mode ─────────────────────────────────────────────────────────────
    if (isProcessEditing) {
        return (
            <div className="flex flex-col h-full gap-1 mt-2">
                <textarea
                    ref={(el) => {
                        if (el && editCursorPos >= 0) {
                            el.selectionStart = editCursorPos;
                            el.selectionEnd = editCursorPos;
                            el.focus();
                            setEditCursorPos(-1);
                        }
                    }}
                    value={editText}
                    onChange={(e) => handleEditChange(e.target.value)}
                    className={cn(
                        "flex-1 min-h-[600px] w-full text-xs font-mono rounded border bg-muted/30 px-3 py-2 resize-none outline-none focus:border-primary transition-colors leading-6",
                        editErrors.length > 0 ? "border-destructive" : "border-border"
                    )}
                    placeholder={"# Phase Name\n- Step one\n- Optional step-o"}
                    spellCheck={false}
                    autoFocus={editCursorPos < 0}
                />
                {editErrors.length > 0 && (
                    <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 space-y-0.5 shrink-0">
                        {editErrors.map((e, i) => (
                            <p key={i} className="text-xs text-destructive leading-relaxed">{e}</p>
                        ))}
                    </div>
                )}
                <p className="text-[10px] text-muted-foreground shrink-0">
                    <code className="bg-muted px-0.5 rounded"># Phase</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">## Sub</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">### Detail</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">- Step</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">-o</code> optional{" · "}
                    <code className="bg-muted px-0.5 rounded">--</code> close group
                </p>
            </div>
        );
    }

    // ── View mode (inline) ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full">
            {/* Header: progress bar + edit button — fixed */}
            <div className="flex items-center gap-2 shrink-0 pb-2">
                <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-300",
                            allDone ? "bg-purple-500" : "bg-purple-500"
                        )}
                        style={{ width: progress ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                    />
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {progress?.done}/{progress?.total}
                </span>
                {!isDisabled && (
                    <button
                        onClick={handleStartEdit}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit process"
                    >
                        <Edit2 className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Items — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                {parsedProcess!.groups.map((group, gi) => {
                    const collapsed = collapsedGroups.has(group.name);
                    const groupDone = group.items.every((i) => i.isChecked || i.isSkipped);
                    const level = group.level ?? 1;
                    const headerIndent = level === 1 ? "" : level === 2 ? "pl-6" : "pl-12";
                    const itemIndent = level === 1 ? "pl-5" : level === 2 ? "pl-11" : "pl-[4.25rem]";
                    return (
                        <div key={gi} className="space-y-0.5">
                            {/* Continuation groups skip the header */}
                            {!group.isContinuation && (
                                <button
                                    onClick={() => toggleGroup(group.name)}
                                    onDoubleClick={() => !isDisabled && handleStartEditAt(gi, -1)}
                                    className={cn(
                                        "flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground w-full text-left transition-colors py-0.5",
                                        headerIndent,
                                        level >= 2 && "font-normal",
                                    )}
                                >
                                    {collapsed
                                        ? <ChevronRight className="h-3 w-3 shrink-0" />
                                        : <ChevronDown className="h-3 w-3 shrink-0" />}
                                    <span className={cn(groupDone && "line-through opacity-50")}>
                                        {group.name}
                                    </span>
                                </button>
                            )}

                            {!collapsed && group.items.map((item, ii) => {
                                const fi = flatItemIndex(parsedProcess!, gi, ii);
                                // Optional items never block sequential progress
                                const isLocked = !item.isOptional && !item.isChecked && !item.isSkipped && fi > nextRequiredIndex;
                                return (
                                    <div
                                        key={ii}
                                        onDoubleClick={() => !isDisabled && handleStartEditAt(gi, ii)}
                                        className={cn(
                                            "flex items-start gap-1.5 py-0.5 rounded",
                                            itemIndent,
                                            isLocked ? "opacity-35" : "hover:bg-muted/40"
                                        )}
                                    >
                                        <button
                                            onClick={() => handleToggle(gi, ii, "check")}
                                            disabled={isDisabled || isLocked}
                                            className="mt-1 shrink-0 text-muted-foreground hover:text-purple-500 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {item.isChecked
                                                ? <CheckCircle2 className="h-3.5 w-3.5 text-purple-500" />
                                                : <Circle className="h-3.5 w-3.5" />}
                                        </button>

                                        <span
                                            onClick={() => !isDisabled && !isLocked && handleToggle(gi, ii, "check")}
                                            className={cn(
                                                "flex-1 text-xs leading-5 text-left select-none",
                                                isDisabled || isLocked ? "cursor-default" : "cursor-pointer",
                                                (item.isChecked || item.isSkipped) && "line-through text-muted-foreground opacity-70"
                                            )}
                                        >
                                            {item.name}
                                            {item.isOptional && (
                                                <span className="ml-1 text-[10px] opacity-40">-o</span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {allDone && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-500 font-medium pt-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        All steps complete!
                    </div>
                )}
            </div>
        </div>
    );
}
