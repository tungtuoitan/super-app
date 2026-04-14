/**
 * Task Section Selector
 * Derived values for the active section tab's dirty state.
 */

import { useMemo } from "react";
import { useTaskDetailSectionStore } from "../store/useTaskDetailSection.store";
import { useTaskProcessStore } from "../store/useTaskProcess.store";
import { useTaskChecklistStore } from "../store/useTaskChecklist.store";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { isCustomTab } from "../utils/taskDetailSection.utils";

export const useTaskSectionSelector = () => {
    const { activeSection } = useTaskDetailSectionStore();
    const { isProcessEditing } = useTaskProcessStore();
    const { isChecklistEditing } = useTaskChecklistStore();
    const { descDirty, customTabDirty } = useTaskSectionStore();

    const isSectionDirty = useMemo(() =>
        (activeSection === "process" && isProcessEditing) ||
        (activeSection === "checklist" && isChecklistEditing) ||
        (activeSection === "desc" && descDirty) ||
        (isCustomTab(activeSection) && customTabDirty),
        [activeSection, isProcessEditing, isChecklistEditing, descDirty, customTabDirty],
    );

    return { isSectionDirty };
};
