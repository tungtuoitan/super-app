import React, { MouseEventHandler, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/Button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

/**
 * Props interface for dialog content customization.
 */
export interface IDialogContentProps {
    /** Child components to render within dialog content */
    children: React.ReactNode | null;
    /** Optional inline styles for dialog content */
    style?: CSSProperties;
    /** Optional class name for dialog content styling */
    className?: string;
}

/**
 * Props interface for the DialogContainer component.
 */
export interface IDialogContainerProps {
    /** Whether the dialog is open */
    open: boolean;
    /** Function to call when dialog should close */
    onClose?: () => void;
    /** Dialog title text */
    title?: string;
    /** Whether to show close button in toolbar */
    showCloseButton?: boolean;
    /** Whether dialog should be full screen */
    fullScreen?: boolean;
    /** Maximum width for dialog */
    maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
    /** Whether dialog should take full width */
    fullWidth?: boolean;
    /** Dialog content configuration */
    dialogContentProps?: IDialogContentProps;
    /** Custom toolbar content */
    toolbarContent?: React.ReactNode;
    /** Additional styling for dialog */
    className?: string;
    /** Inline styles for dialog */
    style?: CSSProperties;
    /** Whether to disable backdrop click close */
    disableBackdropClick?: boolean;
    /** Whether to disable escape key close */
    disableEscapeKeyDown?: boolean;
}

/**
 * DialogContainer - A reusable dialog wrapper component.
 *
 * This component provides a consistent dialog interface with:
 * - Responsive design with mobile fullscreen support
 * - Customizable header with title and close button
 * - Flexible content area with proper spacing
 * - Configurable backdrop and escape key behavior
 * - Built-in accessibility features
 *
 * The component automatically adapts to mobile screens by using
 * fullscreen mode on smaller devices for better user experience.
 *
 * @param props - Dialog configuration props
 * @returns Configured Dialog component
 */
export function DialogContainer({
    open,
    onClose,
    title,
    showCloseButton = true,
    fullScreen: forceFullScreen,
    maxWidth = "md",
    fullWidth = true,
    dialogContentProps,
    toolbarContent,
    className,
    style,
    disableBackdropClick = false,
    disableEscapeKeyDown = false,
    children,
    ...props
}: IDialogContainerProps & { children?: React.ReactNode }) {
    // Detect mobile for responsive fullscreen
    const [isMobile, setIsMobile] = React.useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const fullScreen = forceFullScreen || isMobile;

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            onClose?.();
        }
    };

    const handleCloseClick: MouseEventHandler = (event) => {
        event.stopPropagation();
        onClose?.();
    };

    // Map maxWidth to Tailwind classes
    const getMaxWidthClass = () => {
        if (maxWidth === false) return "max-w-none";
        const widthMap = {
            xs: "max-w-xs",
            sm: "max-w-sm",
            md: "max-w-md",
            lg: "max-w-lg",
            xl: "max-w-xl",
        };
        return widthMap[maxWidth] || "max-w-md";
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className={cn(
                    "flex flex-col overflow-hidden p-0",
                    fullScreen && "w-screen h-screen max-w-none m-0 rounded-none",
                    !fullScreen && getMaxWidthClass(),
                    fullWidth && !fullScreen && "w-full",
                    className,
                )}
                style={style}
                onEscapeKeyDown={(e) => {
                    if (disableEscapeKeyDown) {
                        e.preventDefault();
                    }
                }}
                onPointerDownOutside={(e) => {
                    if (disableBackdropClick) {
                        e.preventDefault();
                    }
                }}
                {...props}
            >
                {/* Header with title and close button */}
                {(title || showCloseButton || toolbarContent) && (
                    <div className="flex items-center justify-between border-b bg-background px-4 py-3 min-h-[56px]">
                        {/* Title section */}
                        <h2 className="text-lg font-medium flex-grow">{title}</h2>

                        {/* Custom toolbar content */}
                        {toolbarContent && <div className="flex items-center mr-2">{toolbarContent}</div>}

                        {/* Close button */}
                        {showCloseButton && onClose && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCloseClick}
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            aria-label="close"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Close</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}

                {/* Dialog content */}
                <div className={cn("flex-1 overflow-auto p-6 min-h-[200px] flex flex-col", dialogContentProps?.className)} style={dialogContentProps?.style}>
                    {dialogContentProps?.children || children}
                </div>
            </DialogContent>
        </Dialog>
    );
}
