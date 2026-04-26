/**
 * Task Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the task feature should use relative paths.
 */

// Components
export { TaskGrid } from "./Components/TaskGrid";
export { TaskKanbanView } from "./Components/TaskKanbanView";
export { TaskTimelineView } from "./Components/TaskTimelineView";
export { TaskFilterPopup } from "./Components/TaskFilterPopup";
export { TaskSearchInput } from "./Components/small/TaskSearchInput";
export { TaskBar } from "./Components/TaskBar";
export { TaskEditorPanel } from "./Components/TaskEditorPanel";

// Types
export type { Task } from "./store/useTask.store";
export type { TaskDragItem } from "./types/taskGrid.types";
export type { TaskDTO } from "./service/task.service";

// Utils
export { getTaskStatusColors, getTaskPriorityColors } from "./utils/TaskDetail.utils";
export {
    generateDateRange,
    formatMonthHeader,
    sortTasksHierarchically,
    getSubtasksOutsideRange,
    validateDropTaskOntoTask,
    validateMakeIndependent,
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

// Stores (only expose hooks needed by other features)
export { useTaskStore } from "./store/useTask.store";
export { useTaskGridStore } from "./store/useTaskGrid.store";

// Helpers (only expose hooks needed by other features)
export { useTaskTabHelper } from "./hooks/useTaskTab.helper";
export { useTaskGridHelper } from "./hooks/taskList/useTaskGrid.helper";
export { useTaskDetailHelper } from "./hooks/useTaskDetail.helper";

// Services (only expose what other features need)
export { taskService } from "./service/task.service";
