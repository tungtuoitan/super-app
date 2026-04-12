/**
 * Store exports
 * Central export point for all application stores
 */

export { AuthStore, AuthStoreProvider, useAuthStore } from "./auth/Auth.store";
export type { AuthStoreData, User } from "./auth/Auth.store";

export { DialogStore, DialogProvider, useDialogStore } from "./dialog/Dialog.store";
export type { DialogContextData } from "./dialog/Dialog.store";

export { EditorTabStore, EditorTabProvider, useEditorTabsStore } from "./editor/EditorTab.store";

export { EditorStore, EditorProvider, useEditorStore } from "./editor/Editor.store";
export type { EditorContextData } from "./editor/Editor.store";

export { HashtagUIStore, HashtagUIStoreProvider, useHashtagUIStore } from "./hashtagUI/HashtagUI.store";
export type { HashtagUIStoreData } from "./hashtagUI/HashtagUI.store";

export { WorkspaceStore, WorkspaceProvider, useWorkspaceStore } from "@/features/workspace/store/Workspace.store";
export type { WorkspaceContextData } from "@/features/workspace/store/Workspace.store";

export { FolderDialogStore, FolderDialogProvider, useFolderDialogStore } from "@/features/workspace/store/FolderDialog.store";
export type { FolderDialogContextData, FolderDialogFormErrors, ItemType } from "@/features/workspace/store/FolderDialog.store";


export { MovingTreeProvider, useMovingTreeStore } from "@/features/workspace/store/MovingTree.store";
export type { MovingTreeContextData } from "@/features/workspace/store/MovingTree.store";

export { ActivityBarProvider, useActivityBarStore } from "./activityBar/ActivityBar.store";
export type { ActivityBarContextData } from "./activityBar/ActivityBar.store";

export { AuthCallbackProvider, useAuthCallbackStore } from "./authCallback/AuthCallback.store";
export type { AuthCallbackContextData } from "./authCallback/AuthCallback.store";

export { GeneralStore, GeneralProvider, useGeneralStore } from "./general/General.store";

export { NavigationHistoryStore, NavigationHistoryProvider, useNavigationHistoryStore } from "./editor/NavigationHistory.store";
export type { NavigationHistoryContextData, HistoryEntry, ScrollPosition, CursorPosition } from "./editor/NavigationHistory.store";

export { CommandPaletteStore, CommandPaletteProvider, useCommandPaletteStore } from "./commandPalette/useCommandPalette.store";
export type { CommandPaletteContextData } from "./commandPalette/useCommandPalette.store";

export { ConsoleStore, ConsoleProvider, useConsoleStore } from "./console/useConsole.store";
export type { ConsoleContextData, ConsoleMessage, ConsoleMessageType } from "./console/useConsole.store";

export { TrackingGraphStore, TrackingGraphProvider, useTrackingGraphStore } from "./tracking/TrackingGraph.store";
export type { TrackingGraphContextData } from "./tracking/TrackingGraph.store";

