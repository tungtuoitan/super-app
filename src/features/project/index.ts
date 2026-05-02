/**
 * Project Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the project feature should use relative paths.
 *
 * ─── Cluster note ────────────────────────────────────────────────────────────
 * `project`, `multiProject`, and `taskDetail` form a tightly-coupled cluster:
 *
 *  • `project` is the **root** of the cluster.  It is the only one registered
 *    with the shell (module registry, save-actions, filters, tab types).
 *    `multiProject` and `taskDetail` are domain extensions of project — they
 *    did not grow into independent features.
 *
 *  • Shared state: `usePTaskStore` (task list) and `useProjectStore` are owned
 *    by `project` but consumed directly by `taskDetail` and `multiProject`.
 *    Splitting them into separate stores would require prop-drilling or a new
 *    shared context layer, which adds more complexity than it removes.
 *
 *  • Cross-imports within the cluster are intentional and expected.
 *    The ESLint "no-restricted-imports" rule still enforces barrel-only access
 *    (`@/features/project`, `@/features/taskDetail`) to prevent deep coupling
 *    to internal file paths.
 *
 *  • Any refactor that tries to fully decouple the three features should treat
 *    them as a single bounded context and extract a shared `projectCore` layer
 *    rather than trying to sever individual imports one by one.
 * ─────────────────────────────────────────────────────────────────────────────
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
export { useProjectWorkspaceResolver } from "./hooks/useProjectWorkspaceResolver";

// Utils / Components used cross-feature
export { getProjectStatusColors } from "./Components/ProjectStatusBadge";

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
