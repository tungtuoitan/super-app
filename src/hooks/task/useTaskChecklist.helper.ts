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
} from "@/utils/checklist.utils";
import { useTaskChecklistStore } from "@/store/task/useTaskChecklist.store";
import { useTaskChecklistSelector } from "@/Selectors/task/TaskChecklistSelector";
import { useTaskDetailChecklistSelector } from "@/Selectors/task/TaskDetailChecklistSelector";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskDetailChecklistHelper } from "@/hooks/task/useTaskDetailChecklist.helper";

export const useTaskChecklistHelper = () => {
    // ── Read from selectors ───────────────────────────────────────────────────
    const { parsedChecklist, checklistTemplate } = useTaskDetailChecklistSelector();
    const { nextRequiredIndex } = useTaskChecklistSelector();
    const { isDisabled } = useTaskDetailSelector();

    // ── Read from store ───────────────────────────────────────────────────────
    const {
        editText, setEditText,
        editErrors, setEditErrors,
        setIsExpanded, setIsEditing,
        setCollapsedGroups, setSettingDefault,
    } = useTaskChecklistStore();

    // ── Read from task-level checklist helper (persistence) ───────────────────
    const { handleChecklistChange, handleChecklistSave, persistDefaultTemplate } =
        useTaskDetailChecklistHelper();

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggle = useCallback(
        (gi: number, ii: number, action: "check" | "skip") => {
            if (!parsedChecklist || isDisabled) return;
            const fi = flatItemIndex(parsedChecklist, gi, ii);
            const item = parsedChecklist.groups[gi].items[ii];
            if (!item.isChecked && !item.isSkipped && fi > nextRequiredIndex) return;
            handleChecklistChange(toggleChecklistItem(parsedChecklist, gi, ii, action));
        },
        [parsedChecklist, isDisabled, nextRequiredIndex, handleChecklistChange],
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
        setIsEditing(true);
        setIsExpanded(true);
    }, [parsedChecklist, checklistTemplate, setEditText, setEditErrors, setIsEditing, setIsExpanded]);

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
        handleChecklistSave(parseTextToChecklist(editText, parsedChecklist ?? undefined));
        setIsEditing(false);
        setEditErrors([]);
    }, [editText, parsedChecklist, handleChecklistSave, setEditErrors, setIsEditing]);

    const handleSetAsDefault = useCallback(async () => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        setSettingDefault(true);
        try { await persistDefaultTemplate(editText); }
        finally { setSettingDefault(false); }
    }, [editText, persistDefaultTemplate, setEditErrors, setSettingDefault]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setEditErrors([]);
    }, [setIsEditing, setEditErrors]);

    return {
        handleToggle,
        toggleGroup,
        handleStartEdit,
        handleEditChange,
        handleSaveEdit,
        handleSetAsDefault,
        handleCancelEdit,
    };
};
