import { CSSProperties, useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Label } from "@/shared/components/ui/label";

/**
 * Utility function to check if a value is empty.
 *
 * @param value - Value to check for emptiness
 * @returns True if value is empty, false otherwise
 */
export function isEmpty(value: unknown): boolean {
    const type = typeof value;
    if ((value !== null && type === "object") || type === "function") {
        const properties = Object.keys(value as object);
        if (properties.length === 0) {
            return true;
        }
    }
    return !value;
}

/**
 * Interface for autocomplete option items.
 * Defines the structure for selectable options in the autocomplete component.
 */
export interface IAutoCompleteOptions {
    /** Unique identifier for the option (can be number or string) */
    id: number | string;
    /** Code or key for the option */
    code?: string;
    /** Display description for the option */
    desc?: string;
    /** Display label for the option (alternative to desc) */
    label?: string;
    /** Whether the option is active/enabled */
    active?: boolean;
    /** Alternative property name for active state */
    isActive?: boolean;
    /** Optional type categorization */
    type?: string;
    /** Extended description for the option */
    longDesc?: string;
    /** Hierarchical level for nested options */
    level?: number;
    /** Optional image URL / base64 data URL to show as thumbnail */
    imageUrl?: string;
}
/**
 * Props interface for the GenericAutoComplete component.
 */
export interface GenericAutoCompleteProps {
    /** Optional unique identifier for the component */
    id?: string;
    /** Whether multiple selections are allowed */
    multiple?: boolean;
    /** Whether the component should be hidden */
    hidden?: boolean;
    /** Size variant for the component (default: 'small') */
    size?: "small" | "tiny";
    /** Currently selected value */
    value: IAutoCompleteOptions | null | undefined;
    /** Additional CSS classes */
    className?: string;
    /** Input field properties */
    inputProps: {
        /** Input field name */
        name: string;
        /** Input field label */
        label: string;
        /** Whether the field is required */
        required?: boolean;
        /** Whether the field has an error state */
        error?: boolean;
    };
    /** Array of all available options */
    allOptions: IAutoCompleteOptions[];
    /** Callback function when selection changes */
    onChange?: (event: React.SyntheticEvent, newValue: IAutoCompleteOptions | null) => void;
    /** Optional inline styles */
    style?: CSSProperties;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Whether the clear button is disabled */
    disableClearable?: boolean;
    /** Function to determine if an option should be disabled */
    getOptionDisabled?: (option: IAutoCompleteOptions) => boolean;
}

/**
 * Generic autocomplete component for consistent option selection.
 *
 * This component provides a reusable autocomplete interface with:
 * - Configurable option data structure
 * - Support for single selection
 * - Two size variants: 'small' (default) and 'tiny'
 * - Customizable styling and behavior
 * - Built-in error states and validation
 * - Accessible design with proper ARIA attributes
 *
 * Size variants:
 * - 'small': Standard size similar to TagAutoComplete (default)
 * - 'tiny': Compact size with 12px font for dense layouts
 *
 * The component automatically handles option filtering and selection
 * state management based on the provided options and value.
 *
 * @param props - Component props for autocomplete configuration
 * @returns Configured autocomplete component
 */
export function GenericAutoComplete(props: GenericAutoCompleteProps) {
    const { id, allOptions, size = "small", onChange, inputProps, value, className, style, disabled, disableClearable, hidden, getOptionDisabled } = props;

    const [open, setOpen] = useState(false);
    const [selectedValue, setSelectedValue] = useState<IAutoCompleteOptions>({} as IAutoCompleteOptions);

    useEffect(() => {
        if (!isEmpty(value) && !isEmpty(allOptions)) {
            const filteredOption = allOptions.filter((x) => x.id === value?.id);
            if (value?.id === 0) {
                setSelectedValue({} as IAutoCompleteOptions);
            }
            if (filteredOption.length > 0) {
                setSelectedValue(filteredOption[0]);
            }
        }
    }, [value, allOptions]);

    const handleSelect = (option: IAutoCompleteOptions) => {
        setSelectedValue(option);
        setOpen(false);
        if (onChange) {
            // Create a synthetic event for compatibility
            const syntheticEvent = {
                type: "change",
                target: { value: option },
            } as unknown as React.SyntheticEvent;
            onChange(syntheticEvent, option);
        }
    };

    const handleClear = () => {
        setSelectedValue({} as IAutoCompleteOptions);
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
                popover: "w-[200px] p-0",
                command: "text-xs",
                item: "text-xs py-1",
            };
        }
        return {
            button: "h-10",
            popover: "w-[340px] p-0",
            command: "",
            item: "",
        };
    };

    const sizeClasses = getSizeClasses();
    const displayValue = selectedValue?.label || selectedValue?.desc || "";

    if (hidden) {
        return null;
    }

    return (
        <div className={cn("w-full", className)} style={style}>
            {inputProps.label && (
                <Label htmlFor={id} className={cn("block text-left mb-2", size === "tiny" ? "text-xs" : "text-sm", inputProps.error && "text-destructive")}>
                    {inputProps.label}
                    {inputProps.required && <span className="text-destructive ml-1">*</span>}
                </Label>
            )}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between",
                            sizeClasses.button,
                            !displayValue && "text-muted-foreground",
                            inputProps.error && "border-destructive focus-visible:ring-destructive",
                        )}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {selectedValue?.imageUrl && (
                                <img src={selectedValue.imageUrl} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
                            )}
                            <span className="truncate">{displayValue || "Select option..."}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {!disableClearable && displayValue && !disabled && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleClear();
                                    }}
                                    className="hover:bg-accent rounded-sm p-0.5"
                                >
                                    <Check className="h-3 w-3" />
                                </span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className={sizeClasses.popover} align="start" side="bottom" avoidCollisions sideOffset={4}>
                    <Command className={sizeClasses.command}>
                        <CommandInput placeholder="Search..." />
                        <CommandEmpty>No option found.</CommandEmpty>
                        <CommandGroup className="max-h-[240px] overflow-y-auto">
                            {allOptions.map((option) => {
                                const isDisabled = getOptionDisabled?.(option) || option.active === false || option.isActive === false;
                                const isSelected = selectedValue?.id === option.id;
                                const label = option.label || option.desc || "";

                                return (
                                    <CommandItem
                                        key={option.id}
                                        value={`${option.id}-${label}`}
                                        onSelect={() => {
                                            if (!isDisabled) {
                                                handleSelect(option);
                                            }
                                        }}
                                        disabled={isDisabled}
                                        className={cn(sizeClasses.item, isDisabled && "opacity-50 cursor-not-allowed")}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4 flex-shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                                        {option.imageUrl && (
                                            <img src={option.imageUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0 mr-2" />
                                        )}
                                        <div className="flex items-center justify-between w-full min-w-0">
                                            <span className="truncate">{label}</span>
                                            {option.longDesc && <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{option.longDesc}</span>}
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>

            {inputProps.error && <p className={cn("mt-1 text-destructive", size === "tiny" ? "text-xs" : "text-sm")}>This field is required</p>}
        </div>
    );
}
