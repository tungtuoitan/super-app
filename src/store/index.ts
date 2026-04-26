/**
 * Store exports
 * Central export point for all application stores
 */

export { AuthStore, AuthStoreProvider, useAuthStore } from "../shell/store/Auth.store";
export type { AuthStoreData, User } from "../shell/store/Auth.store";


export { EditorTabBarStore, EditorTabBarProvider, useEditorTabBarStore } from "../shell/store/EditorTab.store";

export { ActivityBarProvider, useActivityBarStore } from "../shell/store/ActivityBar.store";
export type { ActivityBarContextData } from "../shell/store/ActivityBar.store";

export { AuthCallbackProvider, useAuthCallbackStore } from "../shell/store/AuthCallback.store";
export type { AuthCallbackContextData } from "../shell/store/AuthCallback.store";

export { GeneralStore, GeneralProvider, useGeneralStore } from "../shared/store/General.store";

export { CommandPaletteStore, CommandPaletteProvider, useCommandPaletteStore } from "../shell/store/useCommandPalette.store";
export type { CommandPaletteContextData } from "../shell/store/useCommandPalette.store";

export { ConsoleStore, ConsoleProvider, useConsoleStore } from "../shell/store/useConsole.store";
export type { ConsoleContextData, ConsoleMessage, ConsoleMessageType } from "../shell/store/useConsole.store";


