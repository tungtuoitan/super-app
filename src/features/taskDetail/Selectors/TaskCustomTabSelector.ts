/**
 * Task Custom Tab Selector
 * Derived values for the custom tabs of the selected task.
 */

import { useMemo } from "react";
import { useTaskDetailSelector } from "../Selectors/TaskDetailSelector";
import { parseCustomTabs } from "../utils/customTab.utils";

export const useTaskCustomTabSelector = () => {
    const { selectedTask } = useTaskDetailSelector();
    const customTabs = parseCustomTabs(selectedTask?.customTabsJson)
    return { customTabs };
};
