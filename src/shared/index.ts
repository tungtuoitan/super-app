/**
 * Shared Public API
 * Only import from this file when crossing module boundaries.
 * Internal imports within shared should use relative paths.
 */

// ── Components ────────────────────────────────────────────────────────────
export * from "./components";

// ── Hooks ─────────────────────────────────────────────────────────────────
export { useConfirmationPopoverHelper } from "./hooks/useConfirmationPopover.helper";
export { useGenericFilterHelper } from "./hooks/useGenericFilterHelper";
export { useGlobalShortcut } from "./hooks/useGlobalShortcut";
export { useIsMobile } from "./hooks/useIsMobile";
export { useKeyboardShortcut, useInputShortcuts, SHORTCUTS } from "./hooks/useKeyboardShortcut";
export { useKeywordNavigationHelper, findFolderInWorkspace, findNoteByEntityId } from "./hooks/useKeywordNavigation.helper";
export { useStandardRegistryHelper } from "./hooks/useStandardRegistry.helper";

// ── Stores ────────────────────────────────────────────────────────────────
export { debugLogStore } from "./store/debugLog.store";
export { useConfirmationPopoverStore, ConfirmationPopoverProvider } from "./store/ConfirmationPopover.store";
export { useDebugLogger, DebugLoggerProvider, useLogger } from "./store/DebugLogger.store";
export { useGeneralStore, GeneralProvider } from "./store/General.store";
export { useMobileStore, MobileProvider } from "./store/Mobile.store";
export { useGridControlStore, GridControlProvider } from "./store/useGridControl.store";

// ── Services ──────────────────────────────────────────────────────────────
export { apiFetch, acquireRefreshToken, configureApiClient } from "./services/apiClient";
export { fileService } from "./services/file.service";
export { flowService } from "./services/flow.service";
export { keywordService } from "./services/keyword.service";
export { standardRegistryService } from "./services/standardRegistry.service";
export { storageService, STORAGE_KEYS } from "./services/storage.service";
export { targetKeywordService } from "./services/targetKeyword.service";
export { userProfileService } from "./services/userProfile.service";

// ── Types ─────────────────────────────────────────────────────────────────
export type { SAModule } from "./types/SAModule";
export type { SaveActions } from "./types/actions.types";
export type { FilterValue, ViewFilter, UserFilters, FilterFieldConfig } from "./types/filter.types";
export type { IconCategory, IconProps } from "./types/icon.types";
export type { KeywordType, Keyword, UpsertExternalKeywordRequest, KeywordSyncItem, KeywordSyncReport } from "./types/keyword.types";
export type { ResultOptions } from "./types/resultOptions.types";
export type { RegistryType, StandardRegistry, StandardRegistryDTO, StandardRegistryResponse, GetStandardRegistryParams } from "./types/standardRegistry.types";
export type { UpdateUserProfileRequest } from "./types/userProfile.types";

// ── Icons ─────────────────────────────────────────────────────────────────
export { IconKey } from "./icons/icon.types";
export { ICON_COLORS, ICON_MAP, ICON_GROUPS, ICON_CONFIG } from "./icons/icon.config";
export type { IconColorKey, IconColorValue, IconGroupId } from "./icons/icon.config";
export { getActiveIcons, getIconOptions, getIconsGrouped, getAllIconKeywords, getAllIconLabel, findBestIconMatch, getIconDefaultColor, getIconComponent, getIconConfig, getIconByType, renderIconWithDefaultColor } from "./icons/icon.utils";

// ── Menu Contexts ─────────────────────────────────────────────────────────
export { useConfirmation, ConfirmationProvider } from "./menuContexts/ConfirmationContext";
export { useOrchestratorContextMenuStore, OrchestratorContextMenuStoreProvider } from "./menuContexts/ContextMenu.store";
export { OrchestratorContextMenu } from "./menuContexts/OrchestratorMenuContext";
export { useOrchestratorContextMenuHelper } from "./menuContexts/helpers/useOrchestratorContextMenu.helper";

// ── Styles ────────────────────────────────────────────────────────────────
export { Grow, GroupIconContainer, StyledAppBar } from "./styles/commonStyles";
