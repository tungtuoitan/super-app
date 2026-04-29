/**
 * Shell Feature Public API
 * Core app framework, editor, stores, and utilities.
 * Only import from this file when crossing feature boundaries.
 * Internal imports within shell should use relative paths.
 */

import {keywordService} from "./commandPallete/keyword.service";
import {Keyword, KeywordType, UpsertExternalKeywordRequest} from "./commandPallete/keyword.types";
import {TargetKeywordTargetType} from "./commandPallete/targetKeyword.service";
import {useKeyboardShortcut} from "./commandPallete/useKeyboardShortcut";
import {findNoteByEntityId, useKeywordNavigationHelper} from "./commandPallete/useKeywordNavigation.helper";

// ── Stores ────────────────────────────────────────────────────────────────
export { useEditorTabBarStore, EditorTabBarProvider } from "./store/EditorTab.store";
export { useAuthStore } from "./auth/Auth.store";
export { useActivityBarStore } from "./store/ActivityBar.store";
export { useCommandPaletteStore } from "./commandPallete/useCommandPalette.store";
export { useConsoleStore, ConsoleProvider } from "./store/useConsole.store";
export { useAuthCallbackStore } from "./auth/AuthCallback.store";

// ── Services ──────────────────────────────────────────────────────────────
export { authApi } from "./auth/auth.service";
export { keywordService } from "./commandPallete/keyword.service";
export { targetKeywordService } from "./commandPallete/targetKeyword.service";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { useEditorTabHelper } from "./hooks/useEditorTab.helper";
export { useActivityBarHelper } from "./hooks/useActivityBar.helper";
export { useCommandPaletteHelper } from "./commandPallete/useCommandPalette.helper";
export { useCommandPaletteKeyDown } from "./commandPallete/useCommandPaletteKeyDown";
export { useTabBarHelper } from "./hooks/useTabBarHelper";
export { useConsoleHelper } from "./hooks/useConsole.helper";
export { useCheckIsMobile } from "./hooks/useCheckIsMobile";
export { useEditorToolbarHelper } from "./hooks/useEditorToolbar.helper";
export { useGridAutoRegisterHelper } from "./hooks/useGridAutoRegister.helper";
export { useDebugLog, debugLog } from "./hooks/useDebugLog";
export { useAuthHelper } from "./auth/useAuth.helpers";
export { useTabKeyboardShortcuts } from "./hooks/useTabKeyboardShortcuts";
export { useKeyboardShortcut } from "./commandPallete/useKeyboardShortcut";
export { findNoteByEntityId } from "./commandPallete/useKeywordNavigation.helper";
export { useKeywordNavigationHelper } from "./commandPallete/useKeywordNavigation.helper";

// ── Types ─────────────────────────────────────────────────────────────────
export type { BaseTab, TabViewState, TabType, MultiProjectTabData } from "./types/tab.types";
export type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest } from "./auth/auth.types";
export type { User } from "./auth/auth.types";
export type { ModuleDefinition, TabMeta, PanelTabDefinition } from "./moduleRegistry";
export type { ConsoleMessageType } from "./types/console.types";
export type { KeywordType } from "./commandPallete/keyword.types";
// ── Module Registry ───────────────────────────────────────────────────────
export { moduleRegistry } from "./moduleRegistry";
export { keywordNavigatorRegistry } from "./commandPallete/keywordNavigator.registry";
export type { KeywordPlugin, NavigationContext } from "./commandPallete/keywordNavigator.registry";
export type { Keyword } from "./commandPallete/keyword.types";
export type { TargetKeywordTargetType } from "./commandPallete/targetKeyword.service";
export type { KeywordSyncReport } from "./commandPallete/keyword.types";
export type { UpsertExternalKeywordRequest } from "./commandPallete/keyword.types";
// ── Components ────────────────────────────────────────────────────────────
export { Main } from "./Main";
export { KeywordIconRenderer } from "./commandPallete/KeywordIconRenderer";
export { AuthCallback } from "./auth/AuthCallback";
export { AuthGuard } from "./auth/AuthGuard";
export { ConfirmCloseDialog } from "./components/ConfirmCloseDialog";
export { EditorToolbar } from "./components/main/EditorToolbar";
export { ConfirmationPopoverContainer } from "./components/ConfirmationPopoverContainer";
