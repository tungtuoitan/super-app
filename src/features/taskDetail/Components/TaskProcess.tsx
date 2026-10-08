/**
 * TaskProcess Component
 *
 * Inline display within the Process tab section.
 * Shows progress bar header + checklist items directly (no popup).
 * Process steps are always sequential (locked until previous is done).
 */

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
import { useTaskProcessHelper } from "../hooks/taskProcess/useTaskProcess.helper";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskProcessHeadless } from "../hooks/taskProcess/useTaskProcess.headless";
import {flatItemIndex} from "../utils/checklist.utils";

export function TaskProcess() {
    return (
            <TaskProcessInner />
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
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground disabled:opacity-40"
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
                        "flex-1 min-h-[600px] w-full resize-none rounded-xl border bg-transparent px-3 py-2 font-mono text-xs leading-6 outline-none transition-colors duration-100 focus:border-sa-border-strong",
                        editErrors.length > 0 ? "border-sa-danger/60" : "border-sa-border"
                    )}
                    placeholder={"# Phase Name\n- Step one\n- Optional step-o"}
                    spellCheck={false}
                    autoFocus={editCursorPos < 0}
                />
                {editErrors.length > 0 && (
                    <div className="shrink-0 space-y-0.5 rounded-lg border border-sa-danger/35 bg-sa-danger/10 px-3 py-2">
                        {editErrors.map((e, i) => (
                            <p key={i} className="text-xs leading-relaxed text-sa-danger">{e}</p>
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
            <div className="flex h-8 shrink-0 items-center gap-2 pb-1">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-sa-hover-strong">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-300",
                            allDone ? "bg-sa-good" : "bg-sa-amber"
                        )}
                        style={{ width: progress ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                    />
                </div>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {progress?.done}/{progress?.total}
                </span>
                {!isDisabled && (
                    <button
                        onClick={handleStartEdit}
                        className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                        title="Edit process"
                    >
                        <Edit2 className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Items — scrollable */}
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
                {parsedProcess!.groups.map((group, gi) => {
                    const collapsed = collapsedGroups.has(group.name);
                    const groupDone = group.items.every((i) => i.isChecked || i.isSkipped);
                    const level = group.level ?? 1;
                    const headerIndent = level === 1 ? "" : level === 2 ? "pl-6" : "pl-12";
                    const itemIndent = level === 1 ? "pl-5" : level === 2 ? "pl-11" : "pl-[4.25rem]";
                    return (
                        <div key={gi} className="space-y-px">
                            {/* Continuation groups skip the header */}
                            {!group.isContinuation && (
                                <button
                                    onClick={() => toggleGroup(group.name)}
                                    onDoubleClick={() => !isDisabled && handleStartEditAt(gi, -1)}
                                    className={cn(
                                        "flex h-7 w-full items-center gap-1 rounded-md text-left text-xs font-medium text-muted-foreground transition-colors duration-100 hover:text-foreground",
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
                                            "flex min-h-7 items-start gap-2 rounded-md py-1 pr-1.5 transition-colors duration-100",
                                            itemIndent,
                                            isLocked ? "opacity-35" : "hover:bg-sa-hover"
                                        )}
                                    >
                                        <button
                                            onClick={() => handleToggle(gi, ii, "check")}
                                            disabled={isDisabled || isLocked}
                                            className="mt-[3px] shrink-0 text-muted-foreground transition-colors duration-100 hover:text-foreground disabled:cursor-not-allowed"
                                        >
                                            {item.isChecked
                                                ? <CheckCircle2 className="h-3.5 w-3.5 text-sa-good" />
                                                : <Circle className="h-3.5 w-3.5" />}
                                        </button>

                                        <span
                                            onClick={() => !isDisabled && !isLocked && handleToggle(gi, ii, "check")}
                                            className={cn(
                                                "flex-1 select-none text-left text-[13px] leading-5",
                                                isDisabled || isLocked ? "cursor-default" : "cursor-pointer",
                                                (item.isChecked || item.isSkipped) && "line-through text-muted-foreground opacity-70"
                                            )}
                                        >
                                            {item.name}
                                            {item.isOptional && (
                                                <span className="ml-1.5 font-mono text-[10px] text-muted-foreground/60">-o</span>
                                            )}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}

                {allDone && (
                    <div className="flex items-center gap-1.5 pt-1 text-xs font-medium text-sa-good">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        All steps complete!
                    </div>
                )}
            </div>
        </div>
    );
}
