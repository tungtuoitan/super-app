/**
 * Task Checklist Helper
 * Event handlers for checklist UI interactions.
 * Functions only (useCallback) — no state, no useMemo, no useEffect.
 *
 * Reads from: TaskChecklistSelector, TaskChecklistStore, TaskDetailSelector,
 *             TaskDetailChecklistHelper — no params from outside.
 */

import {
    validateChecklistText,
    parseTextToChecklist,
    checklistToText,
    toggleChecklistItem,
    flatItemIndex,
    findItemCursorOffset,
    getItemCheckState,
    getFlatItems,
    migrateToTestcase,
    migrateFromTestcase,
} from "@/utils/checklist.utils";
import {useTaskDetailChecklistSelector} from "../../Selectors/TaskDetailChecklistSelector";
import {useTaskChecklistSelector} from "../../Selectors/TaskChecklistSelector";
import {useTaskDetailSelector} from "../../Selectors/TaskDetailSelector";
import {useTaskChecklistStore} from "../../store/useTaskChecklist.store";
import {useTaskSectionStore} from "../../store/useTaskSection.store";
import {useTaskDetailChecklistHelper} from "./useTaskDetailChecklist.helper";
import {useTaskCommentHelper} from "../taskComment/useTaskComment.helper";

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
    const { setIsChecklistDirty } = useTaskSectionStore();

    // ── Read from task-level checklist helper (persistence) ───────────────────
    const { handleChecklistChange, handleChecklistSave, persistDefaultTemplate } =
        useTaskDetailChecklistHelper();
    const { submitVersionComment } = useTaskCommentHelper();

    // ── Derived ──────────────────────────────────────────────────────────────
    const env = parsedChecklist?.checklistType === "testcase" ? activeEnv : undefined;

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleToggle = (gi: number, ii: number, action: "check" | "skip") => {
            if (isDisabled) return;
            // Pass a transform fn so the update is applied to the LATEST checklist
            // state inside setOpenTabs' functional updater — prevents stale-closure
            // overwrites when the user clicks multiple checkboxes rapidly.
            handleChecklistChange((current) => {
                const item = current.groups[gi]?.items[ii];
                if (!item) return current;
                // Resolve env from current state (testcase type)
                const currentEnv = current.checklistType === "testcase" ? activeEnv : undefined;
                // Guard: sequential progress — compute nextRequiredIndex from current
                if (!item.isOptional) {
                    const fi = flatItemIndex(current, gi, ii);
                    const s = getItemCheckState(item, currentEnv);
                    if (!s.isChecked && !s.isSkipped) {
                        const flat = getFlatItems(current);
                        let nextReq = flat.length;
                        for (let i = 0; i < flat.length; i++) {
                            if (flat[i].isOptional) continue;
                            const fs = getItemCheckState(flat[i], currentEnv);
                            if (!fs.isChecked && !fs.isSkipped) { nextReq = i; break; }
                        }
                        if (fi > nextReq) return current;
                    }
                }
                return toggleChecklistItem(current, gi, ii, action, currentEnv);
            });
        };

    const toggleGroup = (name: string) => {
            setCollapsedGroups((prev) => {
                const next = new Set(prev);
                next.has(name) ? next.delete(name) : next.add(name);
                return next;
            });
        };

    const handleStartEdit = () => {
        setEditText(parsedChecklist ? checklistToText(parsedChecklist) : checklistTemplate);
        setEditErrors([]);
        setEditCursorPos(-1);
        setEditChecklistType(parsedChecklist?.checklistType ?? "checklist");
        setIsEditing(true);
        setIsExpanded(true);
        setIsChecklistDirty(true);
    };

    /** Double-click on a row → edit with cursor at that line */
    const handleStartEditAt = (gi: number, ii: number) => {
            const text = parsedChecklist ? checklistToText(parsedChecklist) : checklistTemplate;
            setEditText(text);
            setEditErrors([]);
            setEditCursorPos(findItemCursorOffset(text, gi, ii));
            setEditChecklistType(parsedChecklist?.checklistType ?? "checklist");
            setIsEditing(true);
            setIsExpanded(true);
            setIsChecklistDirty(true);
        };

    const handleEditChange = (text: string) => {
            setEditText(text);
            if (editErrors.length > 0) setEditErrors(validateChecklistText(text).errors);
        };

    const handleChecklistSaveEdit = () => {
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
        setIsChecklistDirty(false);
        setEditErrors([]);
    };

    const handleSetAsDefault = async () => {
        const v = validateChecklistText(editText);
        if (!v.valid) { setEditErrors(v.errors); return; }
        setSettingDefault(true);
        try { await persistDefaultTemplate(editText); }
        finally { setSettingDefault(false); }
    };

    const handleChecklistCancelEdit = () => {
        setIsEditing(false);
        setIsChecklistDirty(false);
        setEditErrors([]);
    };

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
