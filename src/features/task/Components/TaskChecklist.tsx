/**
 * TaskChecklist Component
 *
 * Inline display within the Checklist tab section.
 * Shows progress bar header + checklist items directly (no popup).
 * For testcase type: shows environment tabs (LOCAL/DEV/UAT/PROD).
 *
 * Item row layout: [check] [skip?] item text
 * Skip button is shown inline next to check (not hover-only on the right).
 */

import { flatItemIndex, getChecklistTypeLabel, getItemCheckState, checklistProgress } from "@/utils/checklist.utils";
import type { ChecklistType } from "../types/checklist.types";
import { REQUIRED_ENVIRONMENTS, OPTIONAL_ENVIRONMENTS } from "../task.constants";
import type { TestcaseEnvironment } from "../task.constants";
import {
    CheckSquare2,
    Square,
    ChevronDown,
    ChevronRight,
    Edit2,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskChecklistStore } from "../store/useTaskChecklist.store";
import { useTaskChecklistSelector } from "../Selectors/TaskChecklistSelector";
import { useTaskDetailChecklistSelector } from "../Selectors/TaskDetailChecklistSelector";
import { useTaskChecklistHelper } from "../hooks/useTaskChecklist.helper";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskChecklistHeadless } from "../HeadlessComponents/useTaskChecklist.headless";

export function TaskChecklist() {
    useTaskChecklistHeadless();
    return <TaskChecklistInner />;
}

function TaskChecklistInner() {
    const {
        progress, allDone, nextRequiredIndex,
    } = useTaskChecklistSelector();

    const { parsedChecklist } = useTaskDetailChecklistSelector();

    const {
        isChecklistEditing,
        editText,
        editErrors,
        collapsedGroups,
        settingDefault,
        editCursorPos,
        setEditCursorPos,
        editChecklistType,
        setEditChecklistType,
        activeEnv,
        setActiveEnv,
        enabledOptionalEnvs,
        setEnabledOptionalEnvs,
    } = useTaskChecklistStore();

    const { isDisabled } = useTaskDetailSelector();

    const {
        handleToggle,
        toggleGroup,
        handleStartEdit,
        handleStartEditAt,
        handleEditChange,
        handleSetAsDefault,
    } = useTaskChecklistHelper();

    const isTestcase = parsedChecklist?.checklistType === "testcase";
    const env = isTestcase ? activeEnv : undefined;

    // ── No checklist yet — show "Create" button ─────────────────────────────────
    if (!parsedChecklist && !isChecklistEditing) {
        return (
            <button
                onClick={handleStartEdit}
                disabled={isDisabled}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            >
                <Plus className="h-3.5 w-3.5" />
                Create checklist
            </button>
        );
    }

    // ── Edit mode ─────────────────────────────────────────────────────────────
    if (isChecklistEditing) {
        return (
            <div className="flex flex-col h-full gap-1 mt-2">
                {/* Type selector */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">Type:</span>
                    {(["checklist", "testcase", "repeat-checklist"] as ChecklistType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setEditChecklistType(t)}
                            className={cn(
                                "text-[10px] px-2 py-0.5 rounded border transition-colors",
                                editChecklistType === t
                                    ? "border-primary text-primary bg-primary/10"
                                    : "border-border text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {getChecklistTypeLabel(t)}
                        </button>
                    ))}
                </div>
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
                    placeholder={"# Group Name\n- Item one\n- Optional item-o"}
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
                    <code className="bg-muted px-0.5 rounded"># Group</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">## Sub</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">### Detail</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">- Item</code>{" · "}
                    <code className="bg-muted px-0.5 rounded">-o</code> optional{" · "}
                    <code className="bg-muted px-0.5 rounded">--</code> close group
                </p>
            </div>
        );
    }

    // ── Visible environments for testcase ────────────────────────────────────
    const visibleEnvs: TestcaseEnvironment[] = isTestcase
        ? [...REQUIRED_ENVIRONMENTS, ...OPTIONAL_ENVIRONMENTS.filter((e) => enabledOptionalEnvs.includes(e))]
        : [];
    const hiddenOptionalEnvs = isTestcase
        ? OPTIONAL_ENVIRONMENTS.filter((e) => !enabledOptionalEnvs.includes(e))
        : [];

    // ── View mode (inline) ────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full">
            {/* Header: progress bar + edit button — fixed */}
            <div className="flex items-center gap-2 shrink-0 pb-2">
                <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-300",
                            "bg-amber-500"
                        )}
                        style={{ width: progress ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                    />
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {progress?.done}/{progress?.total}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {getChecklistTypeLabel(parsedChecklist?.checklistType)}
                </span>
                {!isDisabled && (
                    <button
                        onClick={handleStartEdit}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit checklist"
                    >
                        <Edit2 className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Env tabs — only for testcase */}
            {isTestcase && (
                <div className="flex items-center gap-1 shrink-0 pb-2">
                    {visibleEnvs.map((e) => {
                        const ep = checklistProgress(parsedChecklist!, e);
                        const isActive = e === activeEnv;
                        return (
                            <button
                                key={e}
                                onClick={() => setActiveEnv(e)}
                                className={cn(
                                    "text-[10px] px-2 py-0.5 rounded border transition-colors tabular-nums",
                                    isActive
                                        ? "border-amber-500 text-amber-500 bg-amber-500/10"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {e}
                                <span className="ml-1 opacity-60">{ep.done}/{ep.total}</span>
                            </button>
                        );
                    })}
                    {hiddenOptionalEnvs.map((e) => (
                        <button
                            key={`add-${e}`}
                            onClick={() => setEnabledOptionalEnvs((prev) => [...prev, e])}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground/50 hover:text-foreground hover:border-foreground transition-colors"
                            title={`Enable ${e} environment`}
                        >
                            + {e}
                        </button>
                    ))}
                </div>
            )}

            {/* Items — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
                {parsedChecklist!.groups.map((group, gi) => {
                    const collapsed = collapsedGroups.has(group.name);
                    const groupDone = group.items.every((i) => {
                        const s = getItemCheckState(i, env);
                        return s.isChecked || s.isSkipped;
                    });
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
                                const fi = flatItemIndex(parsedChecklist!, gi, ii);
                                const s = getItemCheckState(item, env);
                                // Optional items never block sequential progress
                                const isLocked = !item.isOptional && !s.isChecked && !s.isSkipped && fi > nextRequiredIndex;
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
                                            className="mt-1 shrink-0 text-muted-foreground hover:text-amber-500 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {s.isChecked
                                                ? <CheckSquare2 className="h-3.5 w-3.5 text-amber-500" />
                                                : <Square className="h-3.5 w-3.5" />}
                                        </button>

                                        <span
                                            onClick={() => !isDisabled && !isLocked && handleToggle(gi, ii, "check")}
                                            className={cn(
                                                "flex-1 text-xs leading-5 text-left select-none",
                                                isDisabled || isLocked ? "cursor-default" : "cursor-pointer",
                                                (s.isChecked || s.isSkipped) && "line-through text-muted-foreground opacity-70"
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
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium pt-1">
                        <CheckSquare2 className="h-3.5 w-3.5" />
                        All checks complete — task can now be closed.
                    </div>
                )}
            </div>
        </div>
    );
}
