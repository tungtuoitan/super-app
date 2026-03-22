/**
 * Task Process Helper
 * Event handlers for process UI interactions.
 * Functions only (useCallback) — no state, no useMemo, no useEffect.
 *
 * Mirrors useTaskChecklist.helper — same pattern, uses process store/selectors.
 */

import { useCallback } from "react";
import {
    validateChecklistText,
    parseTextToChecklist,
    checklistToText,
    toggleChecklistItem,
    flatItemIndex,
    findItemCursorOffset,
} from "@/utils/checklist.utils";
import { useTaskProcessStore } from "@/store/task/useTaskProcess.store";
import { useTaskProcessSelector } from "@/Selectors/task/TaskProcessSelector";
import { useTaskDetailProcessSelector } from "@/Selectors/task/TaskDetailProcessSelector";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskDetailProcessHelper } from "@/hooks/task/useTaskDetailProcess.helper";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";

export const useTaskProcessHelper = () => {
    // ── Read from selectors ───────────────────────────────────────────────────
    const { parsedProcess } = useTaskDetailProcessSelector();
    const { nextRequiredIndex } = useTaskProcessSelector();
    const { isDisabled } = useTaskDetailSelector();

    // ── Read from store ───────────────────────────────────────────────────────
    const {
        editText, setEditText,
        editErrors, setEditErrors,
        setEditCursorPos,
        setIsExpanded, setIsEditing,
        setCollapsedGroups,
    } = useTaskProcessStore();

    // ── Read from task-level process helper (persistence) ─────────────────────
    const { handleProcessChange, handleProcessSave } = useTaskDetailProcessHelper();
    const { submitVersionComment } = useTaskCommentHelper();

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggle = useCallback(
        (gi: number, ii: number, action: "check" | "skip") => {
            if (!parsedProcess || isDisabled) return;
            const item = parsedProcess.groups[gi].items[ii];
            // Optional items are never locked by sequential progress
            if (!item.isOptional) {
                const fi = flatItemIndex(parsedProcess, gi, ii);
                if (!item.isChecked && !item.isSkipped && fi > nextRequiredIndex) return;
            }
            handleProcessChange(toggleChecklistItem(parsedProcess, gi, ii, action));
        },
        [parsedProcess, isDisabled, nextRequiredIndex, handleProcessChange],
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
        setEditText(parsedProcess ? checklistToText(parsedProcess) : "");
        setEditErrors([]);
        setEditCursorPos(-1);
        setIsEditing(true);
        setIsExpanded(true);
    }, [parsedProcess, setEditText, setEditErrors, setEditCursorPos, setIsEditing, setIsExpanded]);

    /** Double-click on a row → edit with cursor at that line */
    const handleStartEditAt = useCallback(
        (gi: number, ii: number) => {
            const text = parsedProcess ? checklistToText(parsedProcess) : "";
            setEditText(text);
            setEditErrors([]);
            setEditCursorPos(findItemCursorOffset(text, gi, ii));
            setIsEditing(true);
            setIsExpanded(true);
        },
        [parsedProcess, setEditText, setEditErrors, setEditCursorPos, setIsEditing, setIsExpanded],
    );

    const handleEditChange = useCallback(
        (text: string) => {
            setEditText(text);
            if (editErrors.length > 0) setEditErrors(validateChecklistText(text).errors);
        },
        [editErrors.length, setEditText, setEditErrors],
    );

    const handleSaveEdit = useCallback(() => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        const newChecklist = parseTextToChecklist(editText, parsedProcess ?? undefined);
        // Auto-create version comment (fire-and-forget)
        const oldText = parsedProcess ? checklistToText(parsedProcess) : "";
        const newText = checklistToText(newChecklist);
        submitVersionComment("process", oldText, newText);
        handleProcessSave(newChecklist);
        setIsEditing(false);
        setEditErrors([]);
    }, [editText, parsedProcess, handleProcessSave, submitVersionComment, setEditErrors, setIsEditing]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setEditErrors([]);
    }, [setIsEditing, setEditErrors]);

    return {
        handleToggle,
        toggleGroup,
        handleStartEdit,
        handleStartEditAt,
        handleEditChange,
        handleSaveEdit,
        handleCancelEdit,
    };
};
