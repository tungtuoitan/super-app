/**
 * Task Custom Tab Selector
 * Derived values for the custom tabs of the selected task.
 */

import { useMemo } from "react";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { parseCustomTabs } from "@/utils/task/customTab.utils";

export const useTaskCustomTabSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const customTabs = useMemo(
        () => parseCustomTabs(selectedTask?.customTabsJson),
        [selectedTask?.customTabsJson],
    );
    return { customTabs };
};
