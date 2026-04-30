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
export { AuthCallbackProvider, useAuthCallbackStore } from "./auth/AuthCallback.store";
export { AuthStoreProvider, useAuthStore } from "./auth/Auth.store";
export { AuthGuard } from "./auth/AuthGuard";
export { AuthCallback } from "./auth/AuthCallback";
export { useAuthHelper } from "./auth/useAuth.helpers";
export { initiateGoogleLogin } from "./auth/googleOAuth.utils";
export type { User, UserData } from "./auth/auth.types";

// ── checkDevice ───────────────────────────────────────────────────────────
export { useIsMobile } from "./checkDevice/useIsMobile";
export { useMobileStore, MobileProvider } from "./checkDevice/Mobile.store";

// ── components ────────────────────────────────────────────────────────────
export { Button } from "./components/ui/Button";
export { Spinner } from "./components/ui/Spinner";
export { GenericTagAutoComplete, type GenericTagAutoCompleteProps } from "./components/ui/TagAutoComplete";
export { GenericAutoComplete, type GenericAutoCompleteProps, type IAutoCompleteOptions } from "./components/ui/GenericAutoComplete";
export { GenericTextField, type GenericTextFieldProps } from "./components/ui/GenericTextField";
export { DialogContainer, type IDialogContainerProps, type IDialogContentProps } from "./components/ui/DialogContainer";
export { GridContainer, type GridContainerProps } from "./components/ui/GridContainer";
export { Tooltip2 } from "./components/ui/Tooltip2";
export { CloseNotiBtn } from "./components/ui/CloseNotiBtn";
export { IconPicker, IconDisplay, IconWithLabel, type IconPickerProps, type IconDisplayProps, type IconWithLabelProps } from "./components/ui/IconPicker";
export { FolderIconWithBadge, FolderFilled, FolderOpenFilled, type FolderIconWithBadgeProps } from "./components/ui/FolderIconWithBadge";
export { StatusAutoComplete, type StatusAutoCompleteProps, type IStatusOption } from "./components/ui/StatusAutoComplete";
export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "./components/ui/dialog";
export { Checkbox } from "./components/ui/checkbox";
export { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover";
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from "./components/ui/select";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { Badge, badgeVariants } from "./components/ui/badge";
export { Input } from "./components/ui/input";
export { Textarea } from "./components/ui/textarea";
export { Label } from "./components/ui/label";
export { Separator } from "./components/ui/separator";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/ui/tooltip";
export { ScrollArea, ScrollBar } from "./components/ui/scroll-area";
export { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
export { Calendar, CalendarDayButton } from "./components/ui/calendar";
export { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
export { Slider } from "./components/ui/slider";
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from "./components/ui/command";
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from "./components/ui/breadcrumb";
export { ShadcnButton, buttonVariants } from "./components/ui/Button";
export { GenericDrawingDate, type GenericDrawingDateProps } from "./components/ui/GenericDrawingDate";
export { AutoCompleteOption, type AutoCompleteOptionProps } from "./components/ui/AutoCompleteOption";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card";
export { resolveVariant } from "./components/ui/Button";
export * from "./components/feedback/ConfirmationPopover";
export * from "./components/feedback/ErrorBoundary";
export * from "./components/RichTextEditor/RichTextEditor";
export * from "./components/DateTimePicker/DateTimePicker";
export * from "./components/DateTimePicker/DateRangePicker";
export * from "./components/HighlightedText";

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
export { useDebugLog, debugLog } from "./debug/useDebugLog";

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
export { GenericFilterPopup } from "./genericFilter/GenericFilterPopup";

// ── globalShortcut ────────────────────────────────────────────────────────
export { useGlobalShortcut } from "./globalShortcut/useGlobalShortcut";

// ── keyword ───────────────────────────────────────────────────────────────
// Services
export { keywordService } from "./keyword/keyword.service";
export { targetKeywordService } from "./keyword/targetKeyword.service";
// Store
export { useKeywordStore } from "./keyword/Keyword.store";
// Hooks
export { useKeyboardShortcut, useInputShortcuts, SHORTCUTS } from "./hooks/useKeyboardShortcut";
export { useKeywordHelper } from "./keyword/useKeyword.helper";
// Utils
export { parseKeywordLink } from "./keyword/keyword-link.utils";
export { isValidUrl } from "./keyword/url.utils";
// Types
export type { Keyword, KeywordType, UpsertExternalKeywordRequest, KeywordSyncItem, KeywordSyncReport } from "./keyword/keyword.types";
export type { TargetKeywordTargetType } from "./keyword/targetKeyword.service";

// ── gridControl ───────────────────────────────────────────────────────────
export { useGridControlStore, GridControlProvider } from "./gridControl/useGridControl.store";
export { GridControlBar } from "./gridControl/GridControlBar";

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
