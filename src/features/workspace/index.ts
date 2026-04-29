/**
 * Workspace Feature - Public API
 * Only export what other features/layers need to use.
 * Internal implementation details stay private.
 */

// Stores
export { useWorkspaceStore } from "./store/Workspace.store";
export { useMovingTreeStore } from "./store/MovingTree.store";

// Types
export type { Ws } from "./types/workspace.types";


// Providers
export { WorkspaceProviders } from "./store/WorkspaceProviders";
export { WsProviders } from "./store/ws/WsProviders";

// Hooks
export { useWorkspaceHelper } from "./hooks/useWorkspaceHelper";

// shell module
export { workspaceModule } from "./shell/workspace.module";