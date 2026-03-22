/**
 * Task Checklist Helper
 * Event handlers for checklist UI interactions.
 * Functions only (useCallback) — no state, no useMemo, no useEffect.
 *
 * Reads from: TaskChecklistSelector, TaskChecklistStore, TaskDetailSelector,
 *             TaskDetailChecklistHelper — no params from outside.
 */

import { useCallback } from "react";
import {
    validateChecklistText,
    parseTextToChecklist,
    checklistToText,
    toggleChecklistItem,
    flatItemIndex,
    findItemCursorOffset,
    getItemCheckState,
    migrateToTestcase,
    migrateFromTestcase,
} from "@/utils/checklist.utils";
import { useTaskChecklistStore } from "@/store/task/useTaskChecklist.store";
import { useTaskChecklistSelector } from "@/Selectors/task/TaskChecklistSelector";
import { useTaskDetailChecklistSelector } from "@/Selectors/task/TaskDetailChecklistSelector";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskDetailChecklistHelper } from "@/hooks/task/useTaskDetailChecklist.helper";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";

export const useTaskChecklistHelper = () => {
    // ── Read from selectors ───────────────────────────────────────────────────
    const { parsedChecklist, checklistTemplate } = useTaskDetailChecklistSelector();
    const { nextRequiredIndex } = useTaskChecklistSelector();
    const { isDisabled } = useTaskDetailSelector();

    // ── Read from store ───────────────────────────────────────────────────────
    const {
        editText, setEditText,
        editErrors, setEditErrors,
        setEditCursorPos,
        setIsExpanded, setIsEditing,
        setCollapsedGroups, setSettingDefault,
        editChecklistType, setEditChecklistType,
        activeEnv,
    } = useTaskChecklistStore();

    // ── Read from task-level checklist helper (persistence) ───────────────────
    const { handleChecklistChange, handleChecklistSave, persistDefaultTemplate } =
        useTaskDetailChecklistHelper();
    const { submitVersionComment } = useTaskCommentHelper();

    // ── Derived ──────────────────────────────────────────────────────────────
    const env = parsedChecklist?.checklistType === "testcase" ? activeEnv : undefined;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggle = useCallback(
        (gi: number, ii: number, action: "check" | "skip") => {
            if (!parsedChecklist || isDisabled) return;
            const item = parsedChecklist.groups[gi].items[ii];
            // Optional items are never locked by sequential progress
            if (!item.isOptional) {
                const fi = flatItemIndex(parsedChecklist, gi, ii);
                const s = getItemCheckState(item, env);
                if (!s.isChecked && !s.isSkipped && fi > nextRequiredIndex) return;
            }
            handleChecklistChange(toggleChecklistItem(parsedChecklist, gi, ii, action, env));
        },
        [parsedChecklist, isDisabled, nextRequiredIndex, handleChecklistChange, env],
    );

    const toggleGroup = useCallback(
        (name: string) => {
            setCollapsedGroups((prev) => {
                const next = new Set(prev);
                next.has(name) ? next.delete(name) : next.add(name);
                return next;
            });
        },
        [setCollapsedGroups],
    );

    const handleStartEdit = useCallback(() => {
        setEditText(parsedChecklist ? checklistToText(parsedChecklist) : checklistTemplate);
        setEditErrors([]);
        setEditCursorPos(-1);
        setEditChecklistType(parsedChecklist?.checklistType ?? "checklist");
        setIsEditing(true);
        setIsExpanded(true);
    }, [parsedChecklist, checklistTemplate, setEditText, setEditErrors, setEditCursorPos, setEditChecklistType, setIsEditing, setIsExpanded]);

    /** Double-click on a row → edit with cursor at that line */
    const handleStartEditAt = useCallback(
        (gi: number, ii: number) => {
            const text = parsedChecklist ? checklistToText(parsedChecklist) : checklistTemplate;
            setEditText(text);
            setEditErrors([]);
            setEditCursorPos(findItemCursorOffset(text, gi, ii));
            setEditChecklistType(parsedChecklist?.checklistType ?? "checklist");
            setIsEditing(true);
            setIsExpanded(true);
        },
        [parsedChecklist, checklistTemplate, setEditText, setEditErrors, setEditCursorPos, setEditChecklistType, setIsEditing, setIsExpanded],
    );

    const handleEditChange = useCallback(
        (text: string) => {
            setEditText(text);
            if (editErrors.length > 0) setEditErrors(validateChecklistText(text).errors);
        },
        [editErrors.length, setEditText, setEditErrors],
    );

    const handleChecklistSaveEdit = useCallback(() => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }

        let result = parseTextToChecklist(editText, parsedChecklist ?? undefined);
        const oldType = parsedChecklist?.checklistType;
        result.checklistType = editChecklistType;

        // Migrate envStates when type changes to/from testcase
        if (editChecklistType === "testcase" && oldType !== "testcase") {
            result = migrateToTestcase(result);
        } else if (editChecklistType !== "testcase" && oldType === "testcase") {
            result = migrateFromTestcase(result, activeEnv);
        } else if (editChecklistType === "testcase") {
            // Testcase staying testcase — ensure new items get envStates
            result = migrateToTestcase(result);
        }

        // Auto-create version comment (fire-and-forget)
        const oldText = parsedChecklist ? checklistToText(parsedChecklist) : "";
        const newText = checklistToText(result);
        submitVersionComment("checklist", oldText, newText);

        handleChecklistSave(result);
        setIsEditing(false);
        setEditErrors([]);
    }, [editText, editChecklistType, parsedChecklist, activeEnv, handleChecklistSave, submitVersionComment, setEditErrors, setIsEditing]);

    const handleSetAsDefault = useCallback(async () => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        setSettingDefault(true);
        try { await persistDefaultTemplate(editText); }
        finally { setSettingDefault(false); }
    }, [editText, persistDefaultTemplate, setEditErrors, setSettingDefault]);

    const handleChecklistCancelEdit = useCallback(() => {
        setIsEditing(false);
        setEditErrors([]);
    }, [setIsEditing, setEditErrors]);

    return {
        handleToggle,
        toggleGroup,
        handleStartEdit,
        handleStartEditAt,
        handleEditChange,
        handleChecklistSaveEdit,
        handleSetAsDefault,
        handleChecklistCancelEdit,
    };
};
