/**
 * Shared Public API
 * Only import from this file when crossing module boundaries.
 * Internal imports within shared should use relative paths.
 */

// ── constants ─────────────────────────────────────────────────────────────
// NOTE: must remain FIRST — other shared files import constants via @/shared barrel
export { constants } from "./constants";
export type { ActivityBarView } from "./constants";

// ── auth ──────────────────────────────────────────────────────────────────
// NOTE: must remain SECOND — no internal @/shared deps; consumed early by shell/features
export { AuthCallbackProvider, useAuthCallbackStore, AuthStoreProvider, useAuthStore, AuthGuard, AuthCallback, 
    AuthContainer, useAuthHelper, authApi, initiateGoogleLogin, GOOGLE_OAUTH_CONFIG, extractAuthCodeFromUrl, 
    extractStateFromUrl, extractOAuthError, retrieveAndClearPkceValues, validateState, generateCodeVerifier, 
    generateCodeChallenge, generateState, storePkceValues } from "./auth";
export type { LoginRequest, LoginResponse, AuthResponse, GoogleCodeRequest, User, UserData, ExchangeTokenResponse } from "./auth";

// ── checkDevice ───────────────────────────────────────────────────────────
export { useIsMobile } from "./checkDevice/useIsMobile";
export { useMobileStore, MobileProvider } from "./checkDevice/Mobile.store";

// ── components ────────────────────────────────────────────────────────────
export * from "./components";

// ── confirmPopover ────────────────────────────────────────────────────────
export { useConfirmationPopoverHelper } from "./confirmPopover/useConfirmationPopover.helper";
export { useConfirmationPopoverStore, ConfirmationPopoverProvider } from "./confirmPopover/ConfirmationPopover.store";
export type { ConfirmationPopoverOptions } from "./confirmPopover/ConfirmationPopover.store";
export { getConfirmMessage } from "./confirmPopover/confirmation-message.utils";
export type { GetConfirmMessageParams, ConfirmMessage } from "./confirmPopover/confirmation-message.utils";

// ── console ───────────────────────────────────────────────────────────────
export { useConsoleStore, ConsoleProvider } from "./console/useConsole.store";
export { useConsoleHelper } from "./console/useConsole.helper";

// ── debug ─────────────────────────────────────────────────────────────────
export { debugLogStore } from "./debug/debugLog.store";
export type { DebugLogEntry } from "./debug/debugLog.store";
export { useDebugLogger, DebugLoggerProvider, useLogger } from "./debug/DebugLogger.store";

// ── fetch ─────────────────────────────────────────────────────────────────
export { apiFetch, acquireRefreshToken, configureApiClient } from "./fetch/apiClient";

// ── file ──────────────────────────────────────────────────────────────────
export { fileService } from "./file/file.service";
export type { UploadContext } from "./file/file.service";

// ── flow ──────────────────────────────────────────────────────────────────
export { flowService } from "./flow/flow.service";
export type { FlowEdgeDTO, FlowNodePositionDTO } from "./flow/flow.types";

// ── genericFilter ─────────────────────────────────────────────────────────
export { useGenericFilterHelper } from "./genericFilter/useGenericFilterHelper";
export { filterUtils } from "./genericFilter/filter.utils";
export type { FilterValue, ViewFilter, UserFilters, FilterFieldConfig } from "./genericFilter/filter.types";

// ── globalShortcut ────────────────────────────────────────────────────────
export { useGlobalShortcut } from "./globalShortcut/useGlobalShortcut";

// ── gridControl ───────────────────────────────────────────────────────────
export { useGridControlStore, GridControlProvider } from "./gridControl/useGridControl.store";

// ── icons ─────────────────────────────────────────────────────────────────
export { IconKey } from "./icons/icon.types";
export type { IconCategory, IconProps } from "./icons/icon.types";
export { ICON_COLORS, ICON_MAP, ICON_GROUPS, ICON_CONFIG } from "./icons/icon.config";
export type { IconColorKey, IconColorValue, IconGroupId } from "./icons/icon.config";
export { getActiveIcons, getIconOptions, getIconsGrouped, getAllIconKeywords, getAllIconLabel, findBestIconMatch, 
    getIconDefaultColor, getIconComponent, getIconConfig, getIconByType, renderIconWithDefaultColor } from "./icons/icon.utils";
export type { IconOption } from "./icons/icon.utils";

// ── localStorage ──────────────────────────────────────────────────────────
export { storageService, STORAGE_KEYS } from "./localStorage/storage.service";

// ── menuContexts ──────────────────────────────────────────────────────────
export { useConfirmation, ConfirmationProvider } from "./menuContexts/ConfirmationContext";
export { useOrchestratorContextMenuStore, OrchestratorContextMenuStoreProvider } from "./menuContexts/ContextMenu.store";
export type { OrchestratorContextMenuType } from "./menuContexts/ContextMenu.store";
export { OrchestratorContextMenu } from "./menuContexts/OrchestratorMenuContext";
export { useOrchestratorContextMenuHelper } from "./menuContexts/useOrchestratorContextMenu.helper";
export { useMenuContext } from "./menuContexts/useMenuContext";
export { contextMenuRegistry } from "./menuContexts/contextMenu.registry";
export type { ContextMenuPlugin } from "./menuContexts/contextMenu.registry";

// ── standardRegistry ──────────────────────────────────────────────────────
export { useStandardRegistryHelper } from "./standardRegistry/useStandardRegistry.helper";
export { useStandardRegistryStore, StandardRegistryProvider } from "./standardRegistry/StandardRegistry.store";
export { standardRegistryService } from "./standardRegistry/standardRegistry.service";
export type { RegistryType, StandardRegistry, StandardRegistryDTO, StandardRegistryResponse, GetStandardRegistryParams } from "./standardRegistry/standardRegistry.types";

// ── styles ────────────────────────────────────────────────────────────────
export { Grow, GroupIconContainer, StyledAppBar } from "./styles/commonStyles";

// ── types ─────────────────────────────────────────────────────────────────
export type { ResultOptions } from "./types/resultOptions.types";

// ── userProfile ───────────────────────────────────────────────────────────
export { userProfileService } from "./userProfile/userProfile.service";
export type { UpdateUserProfileRequest } from "./userProfile/userProfile.types";

// ── utils ─────────────────────────────────────────────────────────────────
export { parseApiError, isUnauthorizedError } from "./utils/api-error.utils";
export { parseAsLocalDate, toLocalISOString } from "./utils/date.utils";
export { fuzzyMatchWithDiacritics, removeDiacritics, findMatchIndices } from "./utils/fuzzy-search.utils";
export { getDeviceFingerprint } from "./utils/deviceFingerprint";
export { formatDate, formatDateTime, isEmpty, truncateText, getMonthFromIndex, getIndexFromMonth, formatMonthLabel } from "./utils/formatters";

// ── Cross-boundary re-exports ──────────────────────────────────────────────
// NOTE: these originate outside shared/ — kept here for backward compatibility
// export { keywordService } from "../shell/commandPallete/keyword.service";
// export { targetKeywordService } from "../shell/commandPallete/targetKeyword.service";
// export type { KeywordType, Keyword, UpsertExternalKeywordRequest, KeywordSyncItem, KeywordSyncReport } from "../shell/commandPallete/keyword.types";
// export { useTabBarMenuHelper } from "../shell/hooks/useTabBarMenu.helper";
// export { generateTempId, collectIdsFromTabs, generateUnsavedName, collectIdsFromTree, SPECIAL_IDS } from "../features/workspace/utils/temp-id.utils";
