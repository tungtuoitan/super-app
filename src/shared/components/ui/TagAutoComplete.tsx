import React, { useState } from "react";
import { X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/Button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Label } from "@/shared/components/ui/label";
import { IAutoCompleteOptions } from "./GenericAutoComplete";

export interface GenericTagAutoCompleteProps {
    options: IAutoCompleteOptions[];
    /** Currently selected tags as comma-separated string */
    value?: string | null;
    /** Callback when tags change - receives comma-separated string of IDs */
    onChange: (tagsString: string) => void;
    /** Whether the component is disabled */
    disabled?: boolean;
    /** Label for the input field */
    label?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Additional CSS class */
    className?: string;
    /** Size of the component */
    size?: "small" | "medium";
    /** Test ID for testing purposes */
    "data-testid"?: string;
}

/**
 * Reusable multi-select autocomplete component for tags
 *
 * @example
 * ```tsx
 * <GenericTagAutoComplete
 *   options={tagsOptions}
 *   value={currentTags}
 *   onChange={(newTags) => setTags(newTags)}
 *   label="Tags"
 *   placeholder="+ Add Tag"
 *   disabled={!isEdit}
 * />
 * ```
 */
export function GenericTagAutoComplete({
    options,
    value,
    onChange,
    disabled = false,
    label = "Tags",
    placeholder = "+ Add Tag",
    className,
    size = "small",
    "data-testid": testId,
}: GenericTagAutoCompleteProps) {
    const [open, setOpen] = useState(false);

    // Convert comma-separated string to array of selected options
    const selectedIds = value ? value.split(",").filter(Boolean) : [];
    const selectedOptions = selectedIds.length > 0 ? options.filter((option) => selectedIds.includes(String(option.id))) : [];

    // Filter out already selected options from available options
    const availableOptions = selectedIds.length > 0 ? options.filter((option) => !selectedIds.includes(String(option.id))) : options;

    // Handle adding a tag
    const handleSelect = (option: IAutoCompleteOptions) => {
        const newSelectedOptions = [...selectedOptions, option];
        const idsString = newSelectedOptions.map((opt) => opt.id).join(",");
        onChange(idsString);
    };

    // Handle removing a tag
    const handleRemove = (optionId: number | string) => {
        const newSelectedOptions = selectedOptions.filter((opt) => opt.id !== optionId);
        const idsString = newSelectedOptions.map((opt) => opt.id).join(",");
        onChange(idsString);
    };

    const sizeClasses = size === "small" ? "h-9 text-sm" : "h-10 text-base";

    return (
        <div className={cn("w-full space-y-2", className)} data-testid={testId}>
            {label && <Label className="block text-left text-sm font-medium">{label}</Label>}

            {/* Selected tags display */}
            {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[40px]">
                    {selectedOptions.map((option) => (
                        <Badge key={option.id} variant="secondary" className="gap-1 pl-2 pr-1">
                            <span>{option.label || option.desc}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(option.id);
                                    }}
                                    className="hover:bg-muted rounded-sm p-0.5 ml-1"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Add tag dropdown */}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled || availableOptions.length === 0}
                        className={cn("w-full justify-between", sizeClasses, !selectedOptions.length && "text-muted-foreground")}
                        data-testid={testId ? `${testId}-trigger` : undefined}
                    >
                        <span className="truncate">{selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selected`}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search tags..." />
                        <CommandEmpty>No tag found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                            {availableOptions.map((option) => {
                                const isDisabled = option.isActive === false;
                                const label = option.label || option.desc || "";

                                return (
                                    <CommandItem
                                        key={option.id}
                                        value={`${option.id}-${label}`}
                                        onSelect={() => {
                                            if (!isDisabled) {
                                                handleSelect(option);
                                                // Keep popover open for multiple selections
                                            }
                                        }}
                                        disabled={isDisabled}
                                        className={cn(isDisabled && "opacity-50 cursor-not-allowed")}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                                        <span>{label}</span>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default GenericTagAutoComplete;
