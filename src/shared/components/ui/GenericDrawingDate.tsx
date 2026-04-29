import React, { forwardRef, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Label } from "@/shared/components/ui/label";

/**
 * Props interface for the GenericDrawingDate component.
 */
export interface GenericDrawingDateProps {
    /**
     * The size of the date picker
     * - 'small': Default size, same as GenericTextField (standard styling)
     * - 'tiny': Compact size like CADDrawings DatePicker (12px font, compact height)
     */
    size?: "small" | "tiny";

    /**
     * The date format to display
     * @default "MM/dd/yyyy"
     */
    format?: string;

    /**
     * The name of the date picker field
     */
    name?: string;

    /**
     * The label for the date picker
     */
    label?: string;

    /**
     * The current value of the date picker
     */
    value?: Date | null;

    /**
     * Callback fired when the value changes
     */
    onChange?: (date: Date | null) => void;

    /**
     * If true, the date picker is disabled
     */
    disabled?: boolean;

    /**
     * If true, shows validation error styling
     */
    error?: boolean;

    /**
     * CSS class name
     */
    className?: string;

    /**
     * If true, shows a clear button
     * @default true
     */
    clearable?: boolean;
}

/**
 * Generic date picker component for consistent date input across the application.
 *
 * This component provides a reusable date picker interface with:
 * - Two size variants: 'small' (default) and 'tiny'
 * - Configurable styling and behavior
 * - Built-in error states and validation
 * - Clearable date selection
 * - Consistent styling with GenericTextField
 *
 * Size variants:
 * - 'small': Standard size similar to GenericTextField (default)
 * - 'tiny': Compact size similar to CADDrawings DatePicker with 12px font and 29.5px height
 *
 * @param props - Component props for date picker configuration
 * @returns Configured date picker component
 */
export const GenericDrawingDate = forwardRef<HTMLDivElement, GenericDrawingDateProps>(
    ({ size = "small", format: dateFormat = "MM/dd/yyyy", name, label, value, onChange, disabled = false, error = false, className, clearable = true, ...props }, ref) => {
        const [open, setOpen] = useState(false);

        // Size-based styles
        const getSizeClasses = () => {
            if (size === "tiny") {
                return {
                    button: "h-[29.5px] text-xs px-2",
                    label: "text-xs",
                    popover: "w-auto p-0",
                };
            }
            return {
                button: "h-10 text-sm",
                label: "text-sm",
                popover: "w-auto p-0",
            };
        };

        const sizeClasses = getSizeClasses();
        const displayValue = value ? format(value, dateFormat) : "";

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            onChange?.(null);
        };

        return (
            <div className={cn("w-full", className)} ref={ref}>
                {label && (
                    <Label htmlFor={name} className={cn("block mb-2", sizeClasses.label, error && "text-destructive")}>
                        {label}
                    </Label>
                )}

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            id={name}
                            variant="outline"
                            disabled={disabled}
                            className={cn(
                                "w-full justify-start font-normal",
                                sizeClasses.button,
                                !value && "text-muted-foreground",
                                error && "border-destructive focus-visible:ring-destructive",
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            <span className="flex-1 text-left truncate">{displayValue || "Pick a date"}</span>
                            {clearable && value && !disabled && <X className="h-4 w-4 hover:bg-accent rounded-sm p-0.5" onClick={handleClear} />}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className={sizeClasses.popover} align="start">
                        <Calendar
                            mode="single"
                            selected={value || undefined}
                            onSelect={(date) => {
                                onChange?.(date || null);
                                setOpen(false);
                            }}
                            disabled={disabled}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                {error && <p className={cn("mt-1 text-destructive", size === "tiny" ? "text-xs" : "text-sm")}>This field is required</p>}
            </div>
        );
    },
);

GenericDrawingDate.displayName = "GenericDrawingDate";

export default GenericDrawingDate;
