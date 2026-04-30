/**
 * ConfirmationPopover Component
 * Shared confirmation popover component based on Portal's PopoverBox pattern
 * Following SuperApp architecture guidelines
 *
 * Note: Using native implementation since shadcn Popover component is not available.
 * This provides a positioned confirmation dialog near the trigger element.
 */

import React, { useEffect, useRef } from "react";
import { Button } from "@/shared";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

 interface ConfirmationPopoverProps {
    /** Whether the popover is open */
    open: boolean;
    /** Element to anchor the popover to */
    anchorEl: HTMLElement | null;
    /** Title to display in the popover */
    title: string;
    /** Subtitle/description to display in the popover */
    subtitle?: string;
    /** Text for the confirm button */
    confirmText?: string;
    /** Text for the cancel button */
    cancelText?: string;
    /** Text for the third button */
    thirdButtonText?: string;
    /** Color for the confirm button */
    confirmColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    /** Color for the cancel button */
    cancelColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    /** Color for the third button */
    thirdButtonColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    /** Variant for buttons */
    buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    /** Custom width for the popover */
    width?: string;
    /** Z-index for the popover */
    zIndex?: number;
    /** Callback when confirm button is clicked */
    onConfirm: () => void | Promise<void>;
    /** Callback when cancel button is clicked */
    onCancel: () => void;
    /** Callback when third button is clicked */
    onThirdButton?: () => void | Promise<void>;
    /** Callback when popover is closed */
    onClose?: () => void;
}

export function ConfirmationPopover({
    open,
    anchorEl,
    title,
    subtitle,
    confirmText = "Ok",
    cancelText = "Cancel",
    thirdButtonText,
    confirmColor = "default",
    cancelColor = "ghost",
    thirdButtonColor = "outline",
    buttonVariant,
    width = "360px",
    zIndex = 10000,
    onConfirm,
    onCancel,
    onThirdButton,
    onClose,
}: ConfirmationPopoverProps) {
    const { theme } = useTheme();
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
    const [isConfirming, setIsConfirming] = React.useState(false);

    // Calculate position - center screen
    useEffect(() => {
        if (open && popoverRef.current) {
            const popoverRect = popoverRef.current.getBoundingClientRect();

            // Only set position if popover has been rendered with actual dimensions
            if (popoverRect.width > 0 && popoverRect.height > 0) {
                // Center horizontally and vertically
                const top = (window.innerHeight - popoverRect.height) / 2 + window.scrollY;
                const left = (window.innerWidth - popoverRect.width) / 2 + window.scrollX;
                setPosition({ top, left });
            }
        } else if (!open) {
            // Reset position when closed
            setPosition(null);
        }
    }, [open, title, subtitle]);

    // Re-calculate position after initial render if not set yet
    useEffect(() => {
        if (open && !position && popoverRef.current) {
            const timer = setTimeout(() => {
                const popoverRect = popoverRef.current?.getBoundingClientRect();
                if (popoverRect && popoverRect.width > 0 && popoverRect.height > 0) {
                    const top = (window.innerHeight - popoverRect.height) / 2 + window.scrollY;
                    const left = (window.innerWidth - popoverRect.width) / 2 + window.scrollX;
                    setPosition({ top, left });
                }
            }, 10);
            return () => clearTimeout(timer);
        }
    }, [open, position, title, subtitle]);

    // Handle click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node) && anchorEl && !anchorEl.contains(event.target as Node)) {
                handleClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open, anchorEl]);

    const handleClose = () => {
        onClose?.();
        onCancel();
    };

    const handleConfirm = async () => {
        setIsConfirming(true);
        try {
            await onConfirm();
        } finally {
            setIsConfirming(false);
        }
    };

    const handleThirdButton = async () => {
        if (onThirdButton) {
            setIsConfirming(true);
            try {
                await onThirdButton();
            } finally {
                setIsConfirming(false);
            }
        }
    };

    const handleCancel = () => {
        if (!isConfirming) {
            onCancel();
        }
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-transparent" style={{ zIndex: zIndex - 1 }} onClick={handleClose} />

            {/* Popover - only show when position is calculated */}
            {position && (
                <div
                    ref={popoverRef}
                    className={cn(
                        "fixed rounded-lg shadow-lg border",
                        "px-4 py-3",
                        theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900",
                    )}
                    style={{
                        top: position.top,
                        left: position.left,
                        width,
                        zIndex,
                    }}
                >
                    <h3 className="text-sm font-semibold mb-2">{title}</h3>
                    {subtitle && <p className="text-xs mb-3 whitespace-pre-line text-muted-foreground">{subtitle}</p>}
                    <hr className={cn("mb-3", theme === "dark" ? "border-gray-700" : "border-gray-200")} />
                    <div className="flex justify-end gap-2">
                        <Button 
                            size="sm" 
                            variant={buttonVariant || confirmColor} 
                            onClick={handleConfirm} 
                            disabled={isConfirming}
                            className="h-8 text-xs"
                        >
                            {isConfirming ? "Saving..." : confirmText}
                        </Button>
                        {thirdButtonText && (
                            <Button 
                                size="sm" 
                                variant={thirdButtonColor} 
                                onClick={handleThirdButton} 
                                disabled={isConfirming}
                                className="h-8 text-xs"
                            >
                                {thirdButtonText}
                            </Button>
                        )}
                        <Button 
                            size="sm" 
                            variant={cancelColor} 
                            onClick={handleCancel} 
                            disabled={isConfirming}
                            className="h-8 text-xs"
                        >
                            {cancelText}
                        </Button>
                    </div>
                </div>
            )}
            
            {/* Hidden reference element for measuring before positioning */}
            {!position && (
                <div
                    ref={popoverRef}
                    className={cn(
                        "fixed rounded-lg shadow-lg border",
                        "px-4 py-3 invisible",
                        theme === "dark" ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900",
                    )}
                    style={{
                        top: 0,
                        left: 0,
                        width,
                        zIndex: -1,
                    }}
                >
                    <h3 className="text-sm font-semibold mb-2">{title}</h3>
                    {subtitle && <p className="text-xs mb-3 whitespace-pre-line text-muted-foreground">{subtitle}</p>}
                    <hr className={cn("mb-3", theme === "dark" ? "border-gray-700" : "border-gray-200")} />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" className="normal-case">
                            {confirmText}
                        </Button>
                        {thirdButtonText && (
                            <Button size="sm" className="normal-case">
                                {thirdButtonText}
                            </Button>
                        )}
                        <Button size="sm" className="normal-case">
                            {cancelText}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}
