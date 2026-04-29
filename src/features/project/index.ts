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
export type { Project } from "./types/project.types";

// Store
export { useProjectStore } from "./store/useProject.store";
export { usePTaskStore } from "./store/usePTask.store";

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
export { projectModule, projectKeywordPlugin } from "./shell/project.module";