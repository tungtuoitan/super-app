/**
 * StatusAutoComplete Component
 * A specialized autocomplete for status/priority selection (Linear-style, #1514):
 * known task/project status codes render TaskStatusIcon, priority codes render
 * TaskPriorityIcon, anything else a small dot in the option's bgColor.
 * Fully controlled — no internal state, derives display value from props.
 */

import { CSSProperties, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/shared";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared";
import { Label } from "@/shared";
import { TaskStatusIcon, TaskPriorityIcon, taskVisualConstants } from "@/shared";

/**
 * Interface for status option items with color support
 */
export interface IStatusOption {
    /** Unique identifier/code for the status */
    id: string;
    /** Code for the status (matches registry code) */
    code: string;
    /** Display label for the status */
    label: string;
    /** Background color */
    bgColor?: string;
    /** Text color */
    textColor?: string;
}

/**
 * Props interface for the StatusAutoComplete component
 */
export interface StatusAutoCompleteProps {
    /** Optional unique identifier for the component */
    id?: string;
    /** Size variant for the component */
    size?: "small" | "tiny";
    /** Currently selected value */
    value: IStatusOption | null | undefined;
    /** Additional CSS classes */
    className?: string;
    /** Width of the component (default: auto) */
    width?: string | number;
    /** Input field properties */
    inputProps: {
        /** Input field name */
        name: string;
        /** Input field label */
        label?: string;
        /** Whether the field is required */
        required?: boolean;
        /** Whether the field has an error state */
        error?: boolean;
    };
    /** Array of all available status options */
    options: IStatusOption[];
    /** Callback function when selection changes */
    onChange?: (event: React.SyntheticEvent, newValue: IStatusOption | null) => void;
    /** Optional inline styles */
    style?: CSSProperties;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Whether the clear button is disabled */
    disableClearable?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Option codes that should appear disabled (grayed out, not selectable) */
    disabledCodes?: string[];
}

/**
 * StatusAutoComplete - Autocomplete component with color-coded status options (GitHub-style)
 * Fully controlled: display value derived from `value` prop, no internal selectedValue state.
 */
export function StatusAutoComplete(props: StatusAutoCompleteProps) {
    const {
        id,
        options,
        size = "small",
        onChange,
        inputProps,
        value,
        className,
        width,
        style,
        disabled,
        disableClearable,
        placeholder = "Select status...",
        disabledCodes = [],
    } = props;

    const [open, setOpen] = useState(false);

    // Derive selected value directly from props — no internal state, no useEffect sync
    const selectedValue = value ? (options.find((x) => x.code === value.code) || value) : null;

    const handleSelect = (option: IStatusOption) => {
        setOpen(false);
        if (onChange) {
            const syntheticEvent = {
                type: "change",
                target: { value: option },
            } as unknown as React.SyntheticEvent;
            onChange(syntheticEvent, option);
        }
    };

    const handleClear = () => {
        if (onChange) {
            const syntheticEvent = {
                type: "change",
                target: { value: null },
            } as unknown as React.SyntheticEvent;
            onChange(syntheticEvent, null);
        }
    };

    // Size-based styles
    const getSizeClasses = () => {
        if (size === "tiny") {
            return {
                button: "h-7 text-xs",
                popover: "p-0",
                command: "text-xs",
                item: "text-xs py-1.5",
                badge: "text-xs",
            };
        }
        return {
            button: "h-8",
            popover: "p-0",
            command: "",
            item: "py-1.5",
            badge: "text-[13px]",
        };
    };

    const sizeClasses = getSizeClasses();

    // Status glyph: Linear-style icon for known codes, otherwise a small dot in bgColor
    const renderStatusIcon = (option: IStatusOption) => {
        if (taskVisualConstants.status[option.code]) return <TaskStatusIcon status={option.code} title={option.label} />;
        if (taskVisualConstants.priority[option.code]) return <TaskPriorityIcon priority={option.code} title={option.label} className="text-muted-foreground" />;
        return <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground" style={option.bgColor ? { backgroundColor: option.bgColor } : undefined} />;
    };

    // Render status label: icon + text (no filled block)
    const renderStatusBadge = (option: IStatusOption) => (
        <span className={cn("inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground", sizeClasses.badge)}>
            {renderStatusIcon(option)}
            <span className="truncate">{option.label}</span>
        </span>
    );

    // Container width style
    const containerStyle: CSSProperties = {
        ...style,
        width: width || "100%",
    };

    return (
        <div className={cn("inline-block w-full block", className)} style={containerStyle}>
            {inputProps.label && (
                <Label
                    htmlFor={id}
                    className={cn(
                        "block text-left",
                        size === "tiny" ? "text-xs" : "text-sm",
                        inputProps.error && "text-destructive"
                    )}
                >
                    {inputProps.label}
                    {inputProps.required && <span className="text-destructive ml-1">*</span>}
                </Label>
            )}

            <Popover open={open} onOpenChange={setOpen} >
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="ghost"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "justify-between gap-2 flex px-2 w-full bg-transparent font-normal",
                            sizeClasses.button,
                            !selectedValue && "text-muted-foreground",
                            inputProps.error && "border-destructive focus-visible:ring-destructive"
                        )}
                    >
                        {selectedValue ? (
                            renderStatusBadge(selectedValue)
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={cn("w-[180px]", sizeClasses.popover)} align="start">
                    <Command className={sizeClasses.command}>
                        <CommandInput placeholder="Search..." />
                        <CommandEmpty>No status found.</CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => {
                                const isSelected = selectedValue?.code === option.code;
                                const isOptionDisabled = disabledCodes.includes(option.code);

                                return (
                                    <CommandItem
                                        key={option.code}
                                        value={`${option.code}-${option.label}`}
                                        onSelect={() => !isOptionDisabled && handleSelect(option)}
                                        className={cn(
                                            sizeClasses.item,
                                            isOptionDisabled && "opacity-35 cursor-not-allowed"
                                        )}
                                        disabled={isOptionDisabled}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-0.5 h-3.5 w-3.5 shrink-0",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {renderStatusBadge(option)}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>

            {inputProps.error && (
                <p className={cn("mt-1 text-destructive", size === "tiny" ? "text-xs" : "text-sm")}>
                    This field is required
                </p>
            )}
        </div>
    );
}
