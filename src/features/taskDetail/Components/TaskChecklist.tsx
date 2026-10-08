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

import type { ChecklistType } from "../types/checklist.types";
import { REQUIRED_ENVIRONMENTS, OPTIONAL_ENVIRONMENTS } from "../task.constants";
import type { TestcaseEnvironment } from "../task.constants";
import {
    CheckSquare2,
    ChevronDown,
    ChevronRight,
    Edit2,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/shared";
import { TaskChecklistProvider, useTaskChecklistStore } from "../store/useTaskChecklist.store";
import { useTaskChecklistSelector } from "../Selectors/TaskChecklistSelector";
import { useTaskDetailChecklistSelector } from "../Selectors/TaskDetailChecklistSelector";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskChecklistHeadless } from "../hooks/taskChecklist/useTaskChecklist.headless";
import {useTaskChecklistHelper} from "../hooks/taskChecklist/useTaskChecklist.helper";
import {checklistProgress, flatItemIndex, getChecklistTypeLabel, getItemCheckState} from "../utils/checklist.utils";

export function TaskChecklist() {
    return <TaskChecklistInner />;
}

function TaskChecklistInner() {
    useTaskChecklistHeadless();
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
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-[13px] text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground disabled:opacity-40"
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
                    <span className="text-[11px] text-muted-foreground">Type</span>
                    {(["checklist", "testcase", "repeat-checklist"] as ChecklistType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setEditChecklistType(t)}
                            className={cn(
                                "h-6 rounded-md border px-2 text-[11px] transition-colors duration-100",
                                editChecklistType === t
                                    ? "border-sa-border-strong bg-sa-hover-strong text-foreground"
                                    : "border-transparent text-muted-foreground hover:bg-sa-hover hover:text-foreground"
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
                        "flex-1 min-h-[600px] w-full resize-none rounded-xl border bg-transparent px-3 py-2 font-mono text-xs leading-6 outline-none transition-colors duration-100 focus:border-sa-border-strong",
                        editErrors.length > 0 ? "border-sa-danger/60" : "border-sa-border"
                    )}
                    placeholder={"# Group Name\n- Item one\n- Optional item-o"}
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
                <span className="shrink-0 rounded-md border border-sa-border-strong px-1.5 text-[11px] leading-5 text-muted-foreground">
                    {getChecklistTypeLabel(parsedChecklist?.checklistType)}
                </span>
                {!isDisabled && (
                    <button
                        onClick={handleStartEdit}
                        className="rounded-md p-1 text-muted-foreground transition-colors duration-100 hover:bg-sa-hover hover:text-foreground"
                        title="Edit checklist"
                    >
                        <Edit2 className="h-3 w-3" />
                    </button>
                )}
            </div>

            {/* Env tabs — only for testcase */}
            {isTestcase && (
                <div className="flex shrink-0 items-center gap-1 pb-2">
                    {visibleEnvs.map((e) => {
                        const ep = checklistProgress(parsedChecklist!, e);
                        const isActive = e === activeEnv;
                        return (
                            <button
                                key={e}
                                onClick={() => setActiveEnv(e)}
                                className={cn(
                                    "h-6 rounded-md border px-2 font-mono text-[11px] transition-colors duration-100",
                                    isActive
                                        ? "border-sa-amber/50 bg-sa-amber/15 text-sa-amber-ink"
                                        : "border-sa-border text-muted-foreground hover:bg-sa-hover hover:text-foreground"
                                )}
                            >
                                {e}
                                <span className="ml-1.5 opacity-60">{ep.done}/{ep.total}</span>
                            </button>
                        );
                    })}
                    {hiddenOptionalEnvs.map((e) => (
                        <button
                            key={`add-${e}`}
                            onClick={() => setEnabledOptionalEnvs((prev) => [...prev, e])}
                            className="h-6 rounded-md border border-dashed border-sa-border-strong px-1.5 font-mono text-[11px] text-muted-foreground/60 transition-colors duration-100 hover:border-foreground/40 hover:text-foreground"
                            title={`Enable ${e} environment`}
                        >
                            + {e}
                        </button>
                    ))}
                </div>
            )}

            {/* Items — scrollable */}
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
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
                                const fi = flatItemIndex(parsedChecklist!, gi, ii);
                                const s = getItemCheckState(item, env);
                                // Optional items never block sequential progress
                                const isLocked = !item.isOptional && !s.isChecked && !s.isSkipped && fi > nextRequiredIndex;
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
                                        <Checkbox
                                            checked={s.isChecked}
                                            onCheckedChange={() => handleToggle(gi, ii, "check")}
                                            disabled={isDisabled || isLocked}
                                            className="mt-[3px]"
                                        />

                                        <span
                                            onClick={() => !isDisabled && !isLocked && handleToggle(gi, ii, "check")}
                                            className={cn(
                                                "flex-1 select-none text-left text-[13px] leading-5",
                                                isDisabled || isLocked ? "cursor-default" : "cursor-pointer",
                                                (s.isChecked || s.isSkipped) && "line-through text-muted-foreground opacity-70"
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
                        <CheckSquare2 className="h-3.5 w-3.5" />
                        All checks complete — task can now be closed.
                    </div>
                )}
            </div>
        </div>
    );
}
