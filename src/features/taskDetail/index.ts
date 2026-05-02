/**
 * Task Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the task feature should use relative paths.
 */

// Components
export { TaskEditorPanel } from "./Components/TaskEditorPanel";

// Types
export type { Task, TaskPaginationState } from "./types/task.types";
export type { TaskDragItem } from "./types/taskGrid.types";
export type { TaskDTO } from "./service/task.service";

// Utils
export { getTaskStatusColors, getTaskPriorityColors, transformTaskData } from "./utils/TaskDetail.utils";
export {
    parseChecklistJson,
    checklistProgress,
    toggleChecklistItem,
    getItemCheckState,
    flatItemIndex,
    getFlatItems,
} from "./utils/checklist.utils";
export {
    generateDateRange,
    formatMonthHeader,
    sortTasksHierarchically,
    getSubtasksOutsideRange,
    validateDropTaskOntoTask,
    validateMakeIndependent,
    getTaskBarColors,
    isStatusNonDraggable,
    getTaskStatusColorsWithBorder,
    getTaskPriorityDotColor,
    TIMELINE_TASK_BAR_HEIGHT,
    TIMELINE_SUBTASK_BAR_HEIGHT,
    TIMELINE_MIN_BAR_WIDTH,
    TIMELINE_EXTEND_DAYS,
    TIMELINE_ZOOM_STEP,
    TIMELINE_ROW_HEIGHT,
    TIMELINE_HEADER_HEIGHT,
    WEEKEND_STRIPE_BG,
    formatDateHeader,
    isWeekend,
    isToday,
    isFirstDayOfMonth,
} from "./utils/TaskGrid.utils";

// Stores / Providers (only expose what other features/shell need)
export { TaskDetailProvider } from "./store/useTaskDetail.store";
export { TaskSectionProvider } from "./store/useTaskSection.store";
export { TaskDetailSectionProvider } from "./store/useTaskDetailSection.store";

// Helpers (only expose hooks needed by other features)
export { useTaskTabHelper } from "./hooks/useTaskTab.helper";
export { useTaskDetailHelper } from "./hooks/useTaskDetail.helper";

// Services (only expose what other features need)
export { taskService } from "./service/task.service";
export { registerTaskFilters } from "./shell/task.filterConfig";
