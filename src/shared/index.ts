/**
 * Shared Public API
 * Only import from this file when crossing module boundaries.
 * Internal imports within shared should use relative paths.
 */

// ── Constants (must be FIRST — other shared files import constants via @/shared barrel) ──
export { constants } from "./constants";
export type { ActivityBarView } from "./constants";

// ── Auth (must be SECOND — no internal @/shared deps; consumed early by shell/features) ──
export { AuthCallbackProvider, useAuthCallbackStore, AuthStoreProvider, useAuthStore, AuthGuard, AuthCallback, AuthContainer, useAuthHelper, authApi, initiateGoogleLogin, GOOGLE_OAUTH_CONFIG, extractAuthCodeFromUrl, extractStateFromUrl, extractOAuthError, retrieveAndClearPkceValues, validateState, generateCodeVerifier, generateCodeChallenge, generateState, storePkceValues } from "./auth";
export type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest, User, UserData, ExchangeTokenResponse } from "./auth";

// ── Components ────────────────────────────────────────────────────────────
export * from "./components";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { useConfirmationPopoverHelper } from "./confirmPopover/useConfirmationPopover.helper";
export { useGenericFilterHelper } from "./genericFilter/useGenericFilterHelper";
export { useGlobalShortcut } from "./globalShortcut/useGlobalShortcut";
export { useIsMobile } from "./checkDevice/useIsMobile";
export { useStandardRegistryHelper } from "./standardRegistry/useStandardRegistry.helper";
    
// ── Stores ────────────────────────────────────────────────────────────────
export { debugLogStore } from "./debug/debugLog.store";
export type { DebugLogEntry } from "./debug/debugLog.store";
export { useConfirmationPopoverStore, ConfirmationPopoverProvider } from "./confirmPopover/ConfirmationPopover.store";
export type { ConfirmationPopoverOptions } from "./confirmPopover/ConfirmationPopover.store";
export { useDebugLogger, DebugLoggerProvider, useLogger } from "./debug/DebugLogger.store";
export { useGeneralStore, GeneralProvider } from "./standardRegistry/General.store";
export { useMobileStore, MobileProvider } from "./checkDevice/Mobile.store";
export { useGridControlStore, GridControlProvider } from "./gridControl/useGridControl.store";
export { useConsoleStore, ConsoleProvider } from "./console/useConsole.store";
export { useConsoleHelper } from "./console/useConsole.helper";

// ── Services ──────────────────────────────────────────────────────────────
export { apiFetch, acquireRefreshToken, configureApiClient } from "./fetch/apiClient";
export { fileService } from "./file/file.service";
export type { UploadContext } from "./file/file.service";
export { flowService } from "./flow/flow.service";
export { keywordService } from "../shell/commandPallete/keyword.service";
export { standardRegistryService } from "./standardRegistry/standardRegistry.service";
export { storageService, STORAGE_KEYS } from "./localStorage/storage.service";
export { targetKeywordService } from "../shell/commandPallete/targetKeyword.service";
export { userProfileService } from "./userProfile/userProfile.service";

// ── Types ─────────────────────────────────────────────────────────────────
export type { FilterValue, ViewFilter, UserFilters, FilterFieldConfig } from "./genericFilter/filter.types";
export type { IconCategory, IconProps } from "./icons/icon.types";
export type { KeywordType, Keyword, UpsertExternalKeywordRequest, KeywordSyncItem, KeywordSyncReport } from "../shell/commandPallete/keyword.types";
export type { ResultOptions } from "./types/resultOptions.types";
export type { RegistryType, StandardRegistry, StandardRegistryDTO, StandardRegistryResponse, GetStandardRegistryParams } from "./standardRegistry/standardRegistry.types";
export type { UpdateUserProfileRequest } from "./userProfile/userProfile.types";
export type { FlowEdgeDTO, FlowNodePositionDTO } from "./flow/flow.types";
// ── Icons ─────────────────────────────────────────────────────────────────
export { IconKey } from "./icons/icon.types";
export { ICON_COLORS, ICON_MAP, ICON_GROUPS, ICON_CONFIG } from "./icons/icon.config";
export type { IconColorKey, IconColorValue, IconGroupId } from "./icons/icon.config";
export { getActiveIcons, getIconOptions, getIconsGrouped, getAllIconKeywords, getAllIconLabel, findBestIconMatch, getIconDefaultColor, getIconComponent, getIconConfig, getIconByType, renderIconWithDefaultColor } from "./icons/icon.utils";
export type { IconOption } from "./icons/icon.utils";

// ── Menu Contexts ─────────────────────────────────────────────────────────
export { useConfirmation, ConfirmationProvider } from "./menuContexts/ConfirmationContext";
export { useOrchestratorContextMenuStore, OrchestratorContextMenuStoreProvider } from "./menuContexts/ContextMenu.store";
export type { OrchestratorContextMenuType } from "./menuContexts/ContextMenu.store";
export { OrchestratorContextMenu } from "./menuContexts/OrchestratorMenuContext";
export { useOrchestratorContextMenuHelper } from "./menuContexts/useOrchestratorContextMenu.helper";
export { useMenuContext } from "./menuContexts/useMenuContext";
export { useTabBarMenuHelper } from "../shell/hooks/useTabBarMenu.helper";
export { contextMenuRegistry } from "./menuContexts/contextMenu.registry";
export type { ContextMenuPlugin } from "./menuContexts/contextMenu.registry";

// ── Constants & Utils ─────────────────────────────────────────────────────
export { generateTempId, collectIdsFromTabs, generateUnsavedName, collectIdsFromTree, SPECIAL_IDS } from "../features/workspace/utils/temp-id.utils";
export { parseApiError, isUnauthorizedError } from "./utils/api-error.utils";
export { parseAsLocalDate, toLocalISOString } from "./utils/date.utils";
export { fuzzyMatchWithDiacritics, removeDiacritics, findMatchIndices } from "./utils/fuzzy-search.utils";
export { getDeviceFingerprint } from "./utils/deviceFingerprint";
export { filterUtils } from "./utils/filter.utils";
export { formatDate, formatDateTime, isEmpty, truncateText, getMonthFromIndex, getIndexFromMonth, formatMonthLabel } from "./utils/formatters";
export { getConfirmMessage } from "./confirmPopover/confirmation-message.utils";
export type { GetConfirmMessageParams, ConfirmMessage } from "./confirmPopover/confirmation-message.utils";

// ── Styles ────────────────────────────────────────────────────────────────
export { Grow, GroupIconContainer, StyledAppBar } from "./styles/commonStyles";