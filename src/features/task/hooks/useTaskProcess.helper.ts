/**
 * Task Process Helper
 * Event handlers for process UI interactions.
 * Functions only (useCallback) — no state, no useMemo, no useEffect.
 *
 * Mirrors useTaskChecklist.helper — same pattern, uses process store/selectors.
 */


import {
    validateChecklistText,
    parseTextToChecklist,
    checklistToText,
    toggleChecklistItem,
    flatItemIndex,
    findItemCursorOffset,
    getFlatItems,
} from "@/utils/checklist.utils";
import { useTaskProcessStore } from "../store/useTaskProcess.store";
import { useTaskProcessSelector } from "../Selectors/TaskProcessSelector";
import { useTaskDetailProcessSelector } from "../Selectors/TaskDetailProcessSelector";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { useTaskDetailProcessHelper } from "../hooks/useTaskDetailProcess.helper";
import { useTaskCommentHelper } from "../hooks/useTaskComment.helper";
import { useTaskSectionStore } from "../store/useTaskSection.store";

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
    const { setIsProcessDirty } = useTaskSectionStore();

    // ── Read from task-level process helper (persistence) ─────────────────────
    const { handleProcessChange, handleProcessSave } = useTaskDetailProcessHelper();
    const { submitVersionComment } = useTaskCommentHelper();

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggle = 
        (gi: number, ii: number, action: "check" | "skip") => {
            if (isDisabled) return;
            // Transform fn: always applied to the LATEST process state inside
            // setOpenTabs' functional updater — prevents rapid-click overwrites.
            handleProcessChange((current) => {
                const item = current.groups[gi]?.items[ii];
                if (!item) return current;
                if (!item.isOptional) {
                    const fi = flatItemIndex(current, gi, ii);
                    if (!item.isChecked && !item.isSkipped) {
                        const flat = getFlatItems(current);
                        let nextReq = flat.length;
                        for (let i = 0; i < flat.length; i++) {
                            if (flat[i].isOptional) continue;
                            if (!flat[i].isChecked && !flat[i].isSkipped) { nextReq = i; break; }
                        }
                        if (fi > nextReq) return current;
                    }
                }
                return toggleChecklistItem(current, gi, ii, action);
            });
        }

    const toggleGroup = 
        (name: string) => {
            setCollapsedGroups((prev) => {
                const next = new Set(prev);
                next.has(name) ? next.delete(name) : next.add(name);
                return next;
            });
        }

    const handleStartEdit = () => {
        setEditText(parsedProcess ? checklistToText(parsedProcess) : "");
        setEditErrors([]);
        setEditCursorPos(-1);
        setIsEditing(true);
        setIsExpanded(true);
        setIsProcessDirty(true);
    }
    /** Double-click on a row → edit with cursor at that line */
    const handleStartEditAt = 
        (gi: number, ii: number) => {
            const text = parsedProcess ? checklistToText(parsedProcess) : "";
            setEditText(text);
            setEditErrors([]);
            setEditCursorPos(findItemCursorOffset(text, gi, ii));
            setIsEditing(true);
            setIsExpanded(true);
            setIsProcessDirty(true);
        }

    const handleEditChange = 
        (text: string) => {
            setEditText(text);
            if (editErrors.length > 0) setEditErrors(validateChecklistText(text).errors);
        }

    const handleProcessSaveEdit = () => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        const newChecklist = parseTextToChecklist(editText, parsedProcess ?? undefined);
        // Auto-create version comment (fire-and-forget)
        const oldText = parsedProcess ? checklistToText(parsedProcess) : "";
        const newText = checklistToText(newChecklist);
        submitVersionComment("process", oldText, newText);
        handleProcessSave(newChecklist);
        setIsEditing(false);
        setIsProcessDirty(false);
        setEditErrors([]);
    }

    const handleProcessCancelEdit = () => {
        setIsEditing(false);
        setIsProcessDirty(false);
        setEditErrors([]);
    }
    return {
        handleToggle,
        toggleGroup,
        handleStartEdit,
        handleStartEditAt,
        handleEditChange,
        handleProcessSaveEdit,
        handleProcessCancelEdit,
    };
};
