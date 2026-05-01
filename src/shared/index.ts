/**
 * Shared Public API
 * Only import from this file when crossing module boundaries.
 * Internal imports within shared should use relative paths.
 */

// ── constants ─────────────────────────────────────────────────────────────
// NOTE: must remain FIRST — other shared files import constants via @/shared barrel
export { constants } from "./constants";

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
export { useDeviceStore, DeviceProvider } from "./device/Device.store";

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
export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
} from "./components/ui/select";
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
export { ConfirmationPopover } from "./components/feedback/ConfirmationPopover";
export { RichTextEditor } from "./components/RichTextEditor/RichTextEditor";
export { DateTimePicker } from "./components/DateTimePicker/DateTimePicker";
export { DateRangePicker, type DateRangePickerProps } from "./components/DateTimePicker/DateRangePicker";
export { HighlightedText } from "./components/HighlightedText";

// ── confirmPopover ────────────────────────────────────────────────────────
export { useConfirmationPopoverHelper } from "./confirmPopover/useConfirmationPopover.helper";
export { ConfirmationPopoverProvider } from "./confirmPopover/ConfirmationPopover.store";
// export type { ConfirmationPopoverOptions } from "./confirmPopover/ConfirmationPopover.store";
export { ConfirmationPopoverContainer } from "./confirmPopover/ConfirmationPopoverContainer";
export type { ConfirmMessage, DeleteType } from "./confirmPopover/types";
export { richTextEditorConstants } from "./components/RichTextEditor/richTextEditor.constants";

// ── console ───────────────────────────────────────────────────────────────
export { ConsoleProvider } from "./console/useConsole.store";
export { useConsoleHelper } from "./console/useConsole.helper";

// ── debug ─────────────────────────────────────────────────────────────────
// export { debugLogStore } from "./debug/debugLog.store";
// export type { DebugLogEntry } from "./debug/debugLog.store";
export { DebugLoggerProvider } from "./debug/DebugLogger.store";
export { useDebugLog } from "./debug/useDebugLog";

// ── fetch ─────────────────────────────────────────────────────────────────
export { apiFetch } from "./fetch/apiClient";
export { parseApiError, isUnauthorizedError } from "./fetch/api-error.utils";
export type { ResultOptions } from "./fetch/resultOptions.types";

// ── file ──────────────────────────────────────────────────────────────────
export { fileService } from "./file/file.service";
export { _isImageFile, _blobToBase64 } from "./file/file.utils";
export type { UploadContext } from "./file/file.types";

// ── flow ──────────────────────────────────────────────────────────────────
export { flowService } from "./flow/flow.service";
export type { FlowEdgeDTO, FlowNodePositionDTO } from "./flow/flow.types";

// ── globalShortcut ────────────────────────────────────────────────────────
export { useGlobalShortcut } from "./shortcut/useGlobalShortcut";

// ── keyword ───────────────────────────────────────────────────────────────
// Services
export { keywordService } from "./keyword/keyword.service";
export { targetKeywordService } from "./keyword/targetKeyword.service";
// Hooks
export { useKeywordSelector } from "./keyword/useKeywordSelector";
export { useKeywordHelper } from "./keyword/useKeyword.helper";
// Utils
export { parseKeywordLink } from "./keyword/keyword-link.utils";
export { isValidUrl } from "./keyword/url.utils";
// Types
export type { Keyword, KeywordType, KeywordSyncReport } from "./keyword/keyword.types";
export type { TargetKeywordTargetType } from "./keyword/targetKeyword.service";

// ── gridControl ───────────────────────────────────────────────────────────
// export { useSideBarStore, GridControlProvider } from "./gridControl/useSideBar.store";
// export { RightSideBar } from "./gridControl/RightSideBar";

// ── icons ─────────────────────────────────────────────────────────────────
export { IconKey } from "./icons/icon.types";
export type { IconCategory, IconProps } from "./icons/icon.types";
export { ICON_COLORS, ICON_MAP } from "./icons/icon.config";
export { getAllIconLabel } from "./icons/icon.utils";
// export type { IconColorKey, IconColorValue, IconGroupId } from "./icons/icon.config";
export { getIconDefaultColor } from "./icons/icon.utils";

// ── localStorage ──────────────────────────────────────────────────────────
export { storageService } from "./localStorage/storage.service";
export { STORAGE_KEYS } from "./localStorage/storage.config";

// ── menuContexts ──────────────────────────────────────────────────────────
export { MenuContextStoreProvider } from "./menuContexts/MenuContext.store";
// export type { MenuContextType } from "./menuContexts/MenuContext.store";
export { MenuContext } from "./menuContexts/MenuContext";
export { useMenuContextHelper } from "./menuContexts/useMenuContext.helper"; 
export { useMenuContext } from "./menuContexts/useMenuContext";
export { menuContextRegistry } from "./menuContexts/menuContext.registry";
// export type { MenuContextPlugin } from "./menuContexts/MenuContext.registry";

// ── standardRegistry ──────────────────────────────────────────────────────
export { StandardRegistryProvider } from "./standardRegistry/StandardRegistry.store";
export { useStandardRegistryHelper } from "./standardRegistry/useStandardRegistry.helper";
export { useStandardRegistrySelector } from "./standardRegistry/useStandardRegistrySelector";
export { useGetStandardRegistry } from "./standardRegistry/useGetStandardRegistry";
export { standardRegistryService } from "./standardRegistry/standardRegistry.service";
// export type { RegistryType, StandardRegistry, StandardRegistryDTO, StandardRegistryResponse, GetStandardRegistryParams } from "./standardRegistry/standardRegistry.types";
export type { StandardRegistry } from "./standardRegistry/standardRegistry.types";
export { standardRegistryConstants } from "./standardRegistry/standardRegistryConstants";
// ── styles ────────────────────────────────────────────────────────────────
// export { Grow } from "./styles/commonStyles";

// ── types ─────────────────────────────────────────────────────────────────

// ── userProfile ───────────────────────────────────────────────────────────
export { userProfileService } from "./userProfile/userProfile.service";
export type { UpdateUserProfileRequest } from "./userProfile/userProfile.types";

// ── utils ─────────────────────────────────────────────────────────────────
export { parseAsLocalDate, toLocalISOString } from "./utils/date.utils";
export { fuzzyMatchWithDiacritics, removeDiacritics, containsNormalized } from "./utils/fuzzy-search.utils";
export { getDeviceFingerprint } from "./device/deviceFingerprint";
export { formatDate, formatDateTime, isEmpty, truncateText, getMonthFromIndex, getIndexFromMonth, formatMonthLabel } from "./utils/formatters";
