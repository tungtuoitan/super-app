/**
 * Project Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the project feature should use relative paths.
 */
// Components
export { DraggableRow } from "./Components/DraggableRow";
export { StatusCell } from "./Components/StatusCell";
export { PriorityCell } from "./Components/PriorityCell";
export { DateRangeCell } from "./Components/DateRangeCell";
// Types
export type { Project } from "./store/useProject.store";

// Store
export { useProjectStore } from "./store/useProject.store";

// Hooks
export { useProjectTabHelper } from "./hooks/useProjectTab.helper";

// Utils / Components used cross-feature
export { getProjectStatusColors } from "./Components/ProjectStatusBadge";

// Cross-feature helpers
export { useProjectTaskFolderHelper } from "./hooks/useProjectTaskFolderHelper";

// Service
export { projectService } from "./service/project.service";