/**
 * Shell Feature Public API
 * Core app framework, editor, stores, and utilities.
 * Only import from this file when crossing feature boundaries.
 * Internal imports within shell should use relative paths.
 */

// ── Stores ────────────────────────────────────────────────────────────────
export { useEditorTabBarStore, EditorTabBarProvider } from "./store/EditorTab.store";
export { useAuthStore } from "./store/Auth.store";
export { useActivityBarStore } from "./store/ActivityBar.store";
export { useCommandPaletteStore } from "./store/useCommandPalette.store";
export { useConsoleStore, ConsoleProvider } from "./store/useConsole.store";
export { useAuthCallbackStore } from "./store/AuthCallback.store";

// ── Services ──────────────────────────────────────────────────────────────
export { authApi } from "./services/auth.service";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { useEditorTabHelper } from "./hooks/useEditorTab.helper";
export { useActivityBarHelper } from "./hooks/useActivityBar.helper";
export { useCommandPaletteHelper } from "./hooks/useCommandPalette.helper";
export { useCommandPaletteKeyDown } from "./hooks/useCommandPaletteKeyDown";
export { useTabBarHelper } from "./hooks/useTabBarHelper";
export { useConsoleHelper } from "./hooks/useConsole.helper";
export { useCheckIsMobile } from "./hooks/useCheckIsMobile";
export { useEditorToolbarHelper } from "./hooks/useEditorToolbar.helper";
export { useGridAutoRegisterHelper } from "./hooks/useGridAutoRegister.helper";
export { useDebugLog, debugLog } from "./hooks/useDebugLog";
export { useAuthHelper } from "./hooks/useAuth.helpers";
export { useTabKeyboardShortcuts } from "./hooks/useTabKeyboardShortcuts";

// ── Types ─────────────────────────────────────────────────────────────────
export type { BaseTab, TabViewState, TabType, MultiProjectTabData } from "./types/tab.types";
export type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest } from "./types/auth.types";
export type { User } from "./types/auth.types";
export type { ModuleDefinition, TabMeta, PanelTabDefinition } from "./moduleRegistry";
export type { ConsoleMessageType } from "./types/console.types";
// ── Module Registry ───────────────────────────────────────────────────────
export { moduleRegistry } from "./moduleRegistry";

// ── Components ────────────────────────────────────────────────────────────
export { Main } from "./Main";
export { AuthCallback } from "./components/AuthCallback";
export { AuthGuard } from "./auth/AuthGuard";
export { ConfirmCloseDialog } from "./components/ConfirmCloseDialog";
export { EditorToolbar } from "./components/main/EditorToolbar";
export { ConfirmationPopoverContainer } from "./components/ConfirmationPopoverContainer";
