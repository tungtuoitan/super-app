/**
 * Workspace Feature - Public API
 * Only export what other features/layers need to use.
 * Internal implementation details stay private.
 */

import {useWorkspaceLoader} from "./hooks";
import {WorkspaceFileItem} from "./types/workspace-v2.types";

// Stores
export { useWorkspaceStore } from "./store/Workspace.store";
export { useMovingTreeStore } from "./store/MovingTree.store";
export { useTreeStatusHelper } from "./hooks/useTreeStatusHelper";
// Types
export type { Ws } from "./types/workspace.types";
export { WorkspaceItemAction } from "./types/workspace.types";


// Providers / Stores
export { WorkspaceProviders } from "./store/WorkspaceProviders";
export { WsProviders } from "./store/ws/WsProviders";
export { useWsStore } from "./store/ws/useWs.store";

// Types
export type { WorkspaceItemV2 } from "./types/workspace-v2.types";
export type { WorkspaceFileItem } from "./types/workspace-v2.types";

// Services
export { wsService } from "./service/ws.service";
export { workspaceService } from "./service/workspace.service";
export type { WsDTO } from "./service/ws.service";

// Hooks
export { useWorkspaceItemHelper } from './hooks/useWorkspaceItemHelper'
export { useWorkspaceHelper } from "./hooks/useWorkspaceHelper";
export { useWsSaveActions } from "./hooks/ws/useWsSaveActions";

// shell module
export { workspaceModule } from "./shell/workspace.module";

export type { WorkspaceNoteItem, WorkspaceFolderItem } from './types/workspace-v2.types'
export type { WorkspaceDTO } from './types/workspace-dto.types'
export { treeMiniHelper } from './hooks/tree.miniHelper'
export { useWorkspaceLoader } from './hooks/useWorkspace.loader'

// Context menus
export { WorkspaceFolderNodeMenu } from "./contexts/menus/WorkspaceFolderNodeMenu";
export { WorkspaceChildNodeMenu } from "./contexts/menus/WorkspaceChildNodeMenu";
export { WorkspaceSelectorMenu } from "./contexts/menus/WorkspaceSelectorMenu";
export { WsGridMenu } from "./contexts/menus/WsGridMenu";

