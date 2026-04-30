/**
 * Shell Feature Public API
 * Core app framework, editor, stores, and utilities.
 * Only import from this file when crossing feature boundaries.
 * Internal imports within shell should use relative paths.
 */

// ── Stores ────────────────────────────────────────────────────────────────
export { useEditorTabBarStore, EditorTabBarProvider } from "./store/EditorTab.store";
export { useActivityBarStore } from "./store/ActivityBar.store";
export { useCommandPaletteStore } from "./commandPallete/useCommandPalette.store";

// ── Services ──────────────────────────────────────────────────────────────
export { keywordService } from "./commandPallete/keyword.service";
export { targetKeywordService } from "./commandPallete/targetKeyword.service";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { useEditorTabHelper } from "./hooks/useEditorTab.helper";
export { useActivityBarHelper } from "./hooks/useActivityBar.helper";
export { useCommandPaletteHelper } from "./commandPallete/useCommandPalette.helper";
export { useCommandPaletteKeyDown } from "./commandPallete/useCommandPaletteKeyDown";
export { useTabBarHelper } from "./hooks/useTabBarHelper";
export { useCheckIsMobile } from "./hooks/useCheckIsMobile";
export { useEditorToolbarHelper } from "./hooks/useEditorToolbar.helper";
export { useGridAutoRegisterHelper } from "./hooks/useGridAutoRegister.helper";
export { useDebugLog, debugLog } from "../shared/debug/useDebugLog";
export { useTabKeyboardShortcuts } from "./hooks/useTabKeyboardShortcuts";
export { useKeyboardShortcut } from "./commandPallete/useKeyboardShortcut";
export { findNoteByEntityId } from "./commandPallete/useKeywordNavigation.helper";
export { useKeywordNavigationHelper } from "./commandPallete/useKeywordNavigation.helper";
export { parseKeywordLink } from "./commandPallete/keyword-link.utils";
export { isValidUrl } from "./commandPallete/url.utils";
export { findKeywordForNote,parseBreadcrumbFromKeyword,enrichBreadcrumbWithColors, buildBreadcrumbFromTree } from "./utils/breadcrumb.utils"
export { transformWs } from "./utils/ws.utils"
// ── Types ─────────────────────────────────────────────────────────────────
export type { BaseTab, TabViewState, TabType, MultiProjectTabData } from "./types/tab.types";
export type { ModuleDefinition, TabMeta, PanelTabDefinition } from "./moduleRegistry";
export type { KeywordType } from "./commandPallete/keyword.types";
export type { BreadcrumbItem } from "./utils/breadcrumb.utils";
// export type { transformWs } from "./utils/ws.utils";
// ── Module Registry ───────────────────────────────────────────────────────
export { moduleRegistry } from "./moduleRegistry";
export { keywordNavigatorRegistry } from "./commandPallete/keywordNavigator.registry";
export type { KeywordPlugin, NavigationContext } from "./commandPallete/keywordNavigator.registry";
export type { Keyword } from "./commandPallete/keyword.types";
export type { TargetKeywordTargetType } from "./commandPallete/targetKeyword.service";
export type { KeywordSyncReport } from "./commandPallete/keyword.types";
export type { UpsertExternalKeywordRequest } from "./commandPallete/keyword.types";
export type { SaveActions } from "./types/actions.types";
// ── Auth (re-exported from shared for backward compat) ────────────────────
export { AuthCallbackProvider, useAuthCallbackStore, AuthStoreProvider, useAuthStore, AuthGuard, AuthCallback, AuthContainer, useAuthHelper, authApi, initiateGoogleLogin, GOOGLE_OAUTH_CONFIG, extractAuthCodeFromUrl, extractStateFromUrl, extractOAuthError, retrieveAndClearPkceValues, validateState, generateCodeVerifier, generateCodeChallenge, generateState, storePkceValues } from "@/shared";
export type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest, User, UserData, ExchangeTokenResponse } from "@/shared";
export { AccountsDialog } from "./components/AccountsDialog";
export { TabBarMenu } from "./components/menus/TabBarMenu";

// ── Components ────────────────────────────────────────────────────────────
export { Main } from "./Main";
export { KeywordIconRenderer } from "./commandPallete/KeywordIconRenderer";
export { CommandPalette } from "./commandPallete/CommandPalette";
export { ConfirmCloseDialog } from "./components/ConfirmCloseDialog";
export { EditorToolbar } from "./components/main/EditorToolbar";
export { ConfirmationPopoverContainer } from "./components/ConfirmationPopoverContainer";
