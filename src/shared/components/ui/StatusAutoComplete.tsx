/**
 * StatusAutoComplete Component
 * A specialized autocomplete for status selection with color-coded options (GitHub-style)
 * Fully controlled — no internal state, derives display value from props.
 */

import { CSSProperties, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/Components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/Components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Label } from "@/Components/ui/label";

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
                button: "h-8 text-xs",
                popover: "p-0",
                command: "text-xs",
                item: "text-xs py-1.5",
                badge: "px-2 py-0.5 text-xs",
            };
        }
        return {
            button: "h-10",
            popover: "p-0",
            command: "",
            item: "py-2",
            badge: "px-2.5 py-1 text-sm",
        };
    };

    const sizeClasses = getSizeClasses();

    // Render status badge (no icon, solid color background, white text)
    const renderStatusBadge = (option: IStatusOption) => {
        const badgeStyle: CSSProperties = {
            backgroundColor: option.bgColor || "#6e7681",
            color: option.textColor || "#ffffff",
        };

        return (
            <span
                className={cn("inline-flex items-center font-medium rounded-md h-6", sizeClasses.badge)}
                style={badgeStyle}
            >
                {option.label}
            </span>
        );
    };

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
                            "justify-between gap-2 flex px-2 w-full bg-[#22252A70]",
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
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
                                                "mr-2 h-4 w-4 shrink-0",
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
