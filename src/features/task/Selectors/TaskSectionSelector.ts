/**
 * Task Section Selector
 * Derived values for the active section tab's dirty state.
 */

import { useMemo } from "react";
import { useTaskDetailSectionStore } from "../store/useTaskDetailSection.store";
import { useTaskSectionStore } from "../store/useTaskSection.store";
import { isCustomTab } from "../utils/taskDetailSection.utils";

export const useTaskSectionSelector = () => {
    const { activeSection } = useTaskDetailSectionStore();
    const { descDirty, customTabDirty, isChecklistDirty, isProcessDirty } = useTaskSectionStore();

    const isSectionDirty = useMemo(() =>
        (activeSection === "process" && isProcessDirty) ||
        (activeSection === "checklist" && isChecklistDirty) ||
        (activeSection === "desc" && descDirty) ||
        (isCustomTab(activeSection) && customTabDirty),
        [activeSection, isProcessDirty, isChecklistDirty, descDirty, customTabDirty],
    );

    return { isSectionDirty };
};
