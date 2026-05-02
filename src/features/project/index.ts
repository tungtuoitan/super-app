/**
 * Project Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the project feature should use relative paths.
 * multiProject and project feature share alot of things, even state
 */
// Store
export { useProjectStore } from "./store/useProject.store";
export { usePTaskStore } from "./store/usePTask.store";


// Components
export { DraggableRow } from "./Components/DraggableRow";
export { ProjectGridMenu } from "./contexts/ProjectGridMenu";
export { StatusCell } from "./Components/StatusCell";
export { PriorityCell } from "./Components/PriorityCell";
export { DateRangeCell } from "./Components/DateRangeCell";

export { TaskSearchInput } from "./task/Components/TaskSearchInput";
export { TaskFilterPopup } from "./task/Components/TaskFilterPopup";

// Types
export type { Project } from "./types/project.types";


// Hooks
export { useProjectTabHelper } from "./hooks/useProjectTab.helper";

// Utils / Components used cross-feature
export { getProjectStatusColors } from "./Components/ProjectStatusBadge";

// Cross-feature helpers
export { useProjectTaskFolderHelper } from "./hooks/useProjectTaskFolderHelper";

// Service
export { projectService } from "./service/project.service";
export type { ProjectDTO } from "./service/project.service";

// Hooks
export { useProjectSaveActions } from "./hooks/useProjectSaveActions";

// Providers
export { ProjectProviders } from "./store/ProjectProviders";
export { PTaskProvider } from "./store/usePTask.store";

// shell module

// Context menus
export { TaskGridMenu } from "./task/contexts/menus/TaskGridMenu";
export { TaskFlowMenu } from "./task/contexts/menus/TaskFlowMenu";

export { projectConstants } from "./project.constants";
export { registerProjectFilters } from "./shell/project.filterConfig";
