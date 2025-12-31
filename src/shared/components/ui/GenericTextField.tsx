import { forwardRef, useState } from "react";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Props interface for the GenericTextField component.
 */
export interface GenericTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
    /** Size variant for the component */
    size?: "small" | "tiny";
    /** Optional label for the input */
    label?: string;
    /** Whether the field has an error */
    error?: boolean;
    /** Helper text to display below the input */
    helperText?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Whether the input is multiline (renders textarea instead) */
    multiline?: boolean;
    /** Number of rows for multiline input */
    rows?: number;
}

/**
 * Generic text field component for consistent text input across the application.
 *
 * This component provides a reusable text field interface with:
 * - Two size variants: 'small' (default) and 'tiny'
 * - Configurable styling and behavior
 * - Built-in error states and validation
 * - Accessible design with proper ARIA attributes
 *
 * Size variants:
 * - 'small': Standard size similar to LeftFormStyle Notes field (default)
 * - 'tiny': Compact size similar to RequestDetail request note field with 12px font
 *
 * @param props - Component props for text field configuration
 * @returns Configured text field component
 */
export const GenericTextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, GenericTextFieldProps>(
    ({ size = "small", label, error, helperText, required, multiline = false, rows = 3, className, id, ...props }, ref) => {
        const [inputId] = useState(() => id || `input-${Math.random().toString(36).slice(2)}`);

        const inputClassName = cn(
            "w-full rounded",
            size === "tiny" && "h-8 text-xs py-1.5",
            size === "small" && "h-9 text-sm",
            error && "border-destructive focus-visible:ring-destructive",
            className,
        );

        const InputComponent = multiline ? "textarea" : Input;

        return (
            <div className="w-full">
                {(label || helperText) && (
                    <div className="flex justify-between items-center mb-2 h-3">
                        <Label htmlFor={inputId} className={cn("text-left", size === "tiny" && "text-xs")}>
                            {label}
                            {required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {helperText && (
                            <p id={`${inputId}-helper`} className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
                                {helperText}
                            </p>
                        )}
                    </div>
                )}
                {multiline ? (
                    <textarea
                        id={inputId}
                        ref={ref as any}
                        rows={rows}
                        className={cn(
                            "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
                            size === "tiny" && "text-xs py-1.5 px-2",
                            error && "border-destructive focus-visible:ring-destructive",
                            className,
                        )}
                        aria-invalid={error}
                        aria-describedby={helperText ? `${inputId}-helper` : undefined}
                        {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
                    />
                ) : (
                    <InputComponent
                        id={inputId}
                        ref={ref as any}
                        className={inputClassName}
                        aria-invalid={error}
                        aria-describedby={helperText ? `${inputId}-helper` : undefined}
                        {...(props as any)}
                    />
                )}
            </div>
        );
    },
);

GenericTextField.displayName = "GenericTextField";
