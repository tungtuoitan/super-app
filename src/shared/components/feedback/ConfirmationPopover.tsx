/**
 * ConfirmationPopover Component
 * Shared confirmation popover component based on Portal's PopoverBox pattern
 * Following SuperApp architecture guidelines
 *
 * Note: Using native implementation since shadcn Popover component is not available.
 * This provides a positioned confirmation dialog near the trigger element.
 */

import React, { useEffect, useRef } from "react";
import { Button } from "@/Components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";

export interface ConfirmationPopoverProps {
    /** Whether the popover is open */
    open: boolean;
    /** Element to anchor the popover to */
    anchorEl: HTMLElement | null;
    /** Message to display in the popover */
    message: string;
    /** Text for the confirm button */
    confirmText?: string;
    /** Text for the cancel button */
    cancelText?: string;
    /** Color for the confirm button */
    confirmColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    /** Color for the cancel button */
    cancelColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
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
    /** Callback when popover is closed */
    onClose?: () => void;
}

export function ConfirmationPopover({
    open,
    anchorEl,
    message,
    confirmText = "Ok",
    cancelText = "Cancel",
    confirmColor = "default",
    cancelColor = "ghost",
    buttonVariant,
    width = "300px",
    zIndex = 10000,
    onConfirm,
    onCancel,
    onClose,
}: ConfirmationPopoverProps) {
    const { theme } = useTheme();
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });
    const [isConfirming, setIsConfirming] = React.useState(false);

    // Calculate position - center screen
    useEffect(() => {
        if (open && popoverRef.current) {
            const popoverRect = popoverRef.current.getBoundingClientRect();

            // Center horizontally and vertically
            const top = (window.innerHeight - popoverRect.height) / 2 + window.scrollY;
            const left = (window.innerWidth - popoverRect.width) / 2 + window.scrollX;

            setPosition({ top, left });
        }
    }, [open]);

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

            {/* Popover */}
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
                <p className="text-sm mb-3 whitespace-pre-line">{message}</p>
                <hr className={cn("mb-3", theme === "dark" ? "border-gray-700" : "border-gray-200")} />
                <div className="flex justify-end gap-2">
                    <Button 
                        size="sm" 
                        variant={buttonVariant || confirmColor} 
                        onClick={handleConfirm} 
                        disabled={isConfirming}
                        className="normal-case"
                    >
                        {isConfirming ? "Saving..." : confirmText}
                    </Button>
                    <Button 
                        size="sm" 
                        variant={cancelColor} 
                        onClick={handleCancel} 
                        disabled={isConfirming}
                        className="normal-case"
                    >
                        {cancelText}
                    </Button>
                </div>
            </div>
        </>
    );
}
