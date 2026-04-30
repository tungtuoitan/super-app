/**
 * Shared Components Public API
 * Internal imports within components should use relative paths.
 */

// ── UI primitives ─────────────────────────────────────────────────────────
export { Button } from "./ui/Button";
export { Spinner } from "./ui/Spinner";
export { GenericTagAutoComplete, type GenericTagAutoCompleteProps } from "./ui/TagAutoComplete";
export { GenericAutoComplete, type GenericAutoCompleteProps, type IAutoCompleteOptions, isEmpty } from "./ui/GenericAutoComplete";
export { GenericTextField, type GenericTextFieldProps } from "./ui/GenericTextField";
export { DialogContainer, type IDialogContainerProps, type IDialogContentProps } from "./ui/DialogContainer";
export { GridContainer, type GridContainerProps } from "./ui/GridContainer";
export { Tooltip2 } from "./ui/Tooltip2";
export { CloseNotiBtn } from "./ui/CloseNotiBtn";
export { IconPicker, IconDisplay, IconWithLabel, type IconPickerProps, type IconDisplayProps, type IconWithLabelProps } from "./ui/IconPicker";
export { FolderIconWithBadge, FolderFilled, FolderOpenFilled, type FolderIconWithBadgeProps } from "./ui/FolderIconWithBadge";
export { StatusAutoComplete, type StatusAutoCompleteProps, type IStatusOption } from "./ui/StatusAutoComplete";
export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "./ui/dialog";
export { Checkbox } from "./ui/checkbox";
export { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton } from "./ui/select";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
export { Badge, badgeVariants } from "./ui/badge";
export { Input } from "./ui/input";
export { Textarea } from "./ui/textarea";
export { Label } from "./ui/label";
export { Separator } from "./ui/separator";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
export { ScrollArea, ScrollBar } from "./ui/scroll-area";
export { Alert, AlertTitle, AlertDescription } from "./ui/alert";
export { Calendar, CalendarDayButton } from "./ui/calendar";
export { RadioGroup, RadioGroupItem } from "./ui/radio-group";
export { Slider } from "./ui/slider";
export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator } from "./ui/command";
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis } from "./ui/breadcrumb";
export { ShadcnButton, buttonVariants } from "./ui/Button";
export { GenericDrawingDate, type GenericDrawingDateProps } from "./ui/GenericDrawingDate";
export { AutoCompleteOption, type AutoCompleteOptionProps } from "./ui/AutoCompleteOption";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./ui/card";
export { resolveVariant } from "./ui/Button";

// ── Feedback ──────────────────────────────────────────────────────────────
export { ConfirmationPopover } from "./feedback/ConfirmationPopover";

// ── Rich Text Editor ──────────────────────────────────────────────────────
export { RichTextEditor } from "./RichTextEditor/RichTextEditor";

// ── Date / Time ───────────────────────────────────────────────────────────
export { DateTimePicker } from "./DateTimePicker/DateTimePicker";
export { DateRangePicker, type DateRangePickerProps } from "./DateTimePicker/DateRangePicker";

// ── Misc Components ───────────────────────────────────────────────────────
export { HighlightedText } from "./HighlightedText";
