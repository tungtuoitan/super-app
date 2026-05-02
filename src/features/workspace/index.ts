/**
 * Workspace Feature Public API
 * Only import from this file when crossing feature boundaries.
 * Internal imports within the workspace feature should use relative paths.
 *
 * ─── Cluster note ────────────────────────────────────────────────────────────
 * `workspace` and `note` form a tightly-coupled cluster:
 *
 *  • `workspace` is the **host**: it owns the tree UI, item CRUD, and the
 *    moving-tree panel. It imports `noteService`, `useNoteDetailStore`, and
 *    `Note` type from `note` to render note nodes inside the tree.
 *
 *  • `note` is the **content**: NoteDetailContent, NoteBodyInPanel and the
 *    note save pipeline all reach into `workspace` for `useWorkspaceStore`,
 *    `useWorkspaceItemHelper`, `useWorkspaceLoader`, and `WorkspaceItemAction`
 *    to link saved notes to workspace items.
 *
 *  • The coupling is domain-inherent — a note is a workspace item; you cannot
 *    meaningfully render or save a note without workspace context. Trying to
 *    fully decouple them would require an event/callback inversion layer that
 *    adds more complexity than it removes.
 *
 *  • Cross-imports within the cluster are intentional and expected.
 *    The ESLint "no-restricted-imports" rule still enforces barrel-only access
 *    (`@/features/workspace`, `@/features/note`) to prevent deep coupling to
 *    internal file paths.
 *
 *  • Any refactor that tries to fully decouple the two features should treat
 *    them as a single bounded context and extract a shared `workspaceCore`
 *    layer rather than trying to sever individual imports one by one.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Stores
export { useWorkspaceStore } from "./store/workspace.store";
export { useMovingTreeStore } from "./store/MovingTree.store";
export { useTreeStatusHelper } from "./hooks/useTreeStatusHelper";
// Types
export type { Ws } from "./types/workspace.types";
export { WorkspaceItemAction } from "./types/workspace.types";
export type { Folder } from "./types/folder.types";


// Providers / Stores
export { WorkspaceProviders } from "./store/WorkspaceProviders";
export { WsProviders } from "./store/ws/WsProviders";
export { useWsStore } from "./store/ws/useWs.store";

// Types
export type { WorkspaceItemV2 } from "./types/workspace-v2.types";
export type { WorkspaceFileItem } from "./types/workspace-v2.types";
export type { NoteEntity } from "./types/workspace-v2.types";
// Services
export { wsService } from "./service/ws.service";
export { workspaceService } from "./service/workspace.service";
export type { WsDTO } from "./service/ws.service";

// Hooks
export { useWorkspaceItemHelper } from './hooks/useWorkspaceItemHelper'
export { useWorkspaceHelper } from "./hooks/useWorkspaceHelper";
export { useWsSaveActions } from "./hooks/ws/useWsSaveActions";

// shell module

export type { WorkspaceNoteItem, WorkspaceFolderItem } from './types/workspace-v2.types'
export type { WorkspaceDTO } from './types/workspace-dto.types'
export { treeMiniHelper } from './utils/workspace.tree.utils'
export { useWorkspaceLoader } from './hooks/useWorkspace.helper'

// Context menus
export { WorkspaceFolderNodeMenu } from "./Components/small/WorkspaceFolderNodeMenu";
export { WorkspaceChildNodeMenu } from "./Components/small/WorkspaceChildNodeMenu";
export { WorkspaceSelectorMenu } from "./Components/small/WorkspaceSelectorMenu";
export { WsGridMenu } from "./Components/small/WsGridMenu";

// Utils
export { generateTempId, collectIdsFromTabs, generateUnsavedName, collectIdsFromTree, SPECIAL_IDS } from "./utils/temp-id.utils";

export { registerWorkspaceFilters } from "./shell/workspace.filterConfig";
export { WorkspaceKeywordPluginInit } from "./shell/workspace.keywordPlugin";

