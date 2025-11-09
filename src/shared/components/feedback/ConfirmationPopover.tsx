/**
 * ConfirmationPopover Component
 * Shared confirmation popover component based on Portal's PopoverBox pattern
 * Following SuperApp architecture guidelines
 * 
 * Note: Using native implementation since shadcn Popover component is not available.
 * This provides a positioned confirmation dialog near the trigger element.
 */

import React, { useEffect, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { cn } from '@/lib/utils';

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
    confirmColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    /** Color for the cancel button */
    cancelColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    /** Variant for buttons */
    buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    /** Custom width for the popover */
    width?: string;
    /** Z-index for the popover */
    zIndex?: number;
    /** Callback when confirm button is clicked */
    onConfirm: () => void;
    /** Callback when cancel button is clicked */
    onCancel: () => void;
    /** Callback when popover is closed */
    onClose?: () => void;
}

/**
 * ConfirmationPopover - A reusable confirmation popover component
 * 
 * @example
 * ```tsx
 * const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
 * const [showConfirm, setShowConfirm] = useState(false);
 * 
 * const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
 *     setAnchorEl(event.currentTarget);
 *     setShowConfirm(true);
 * };
 * 
 * const handleConfirmDelete = () => {
 *     deleteItem();
 *     setShowConfirm(false);
 *     setAnchorEl(null);
 * };
 * 
 * const handleCancel = () => {
 *     setShowConfirm(false);
 *     setAnchorEl(null);
 * };
 * 
 * return (
 *     <>
 *         <Button onClick={handleDeleteClick}>Delete</Button>
 *         <ConfirmationPopover
 *             open={showConfirm}
 *             anchorEl={anchorEl}
 *             message="Are you sure you want to delete this item?"
 *             onConfirm={handleConfirmDelete}
 *             onCancel={handleCancel}
 *         />
 *     </>
 * );
 * ```
 */
export function ConfirmationPopover({
    open,
    anchorEl,
    message,
    confirmText = 'Ok',
    cancelText = 'Cancel',
    confirmColor = 'default',
    cancelColor = 'ghost',
    buttonVariant,
    width = '300px',
    zIndex = 10000,
    onConfirm,
    onCancel,
    onClose,
}: ConfirmationPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0 });

    // Calculate position based on anchor element
    useEffect(() => {
        if (open && anchorEl && popoverRef.current) {
            const anchorRect = anchorEl.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect();
            
            let top = anchorRect.bottom + window.scrollY + 8; // 8px gap
            let left = anchorRect.left + window.scrollX;

            // Check if popover goes off right edge
            if (left + popoverRect.width > window.innerWidth) {
                left = window.innerWidth - popoverRect.width - 16;
            }

            // Check if popover goes off bottom edge
            if (top + popoverRect.height > window.innerHeight + window.scrollY) {
                top = anchorRect.top + window.scrollY - popoverRect.height - 8;
            }

            setPosition({ top, left });
        }
    }, [open, anchorEl]);

    // Handle click outside
    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                anchorEl &&
                !anchorEl.contains(event.target as Node)
            ) {
                handleClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, anchorEl]);

    const handleClose = () => {
        onClose?.();
        onCancel();
    };

    const handleConfirm = () => {
        onConfirm();
    };

    const handleCancel = () => {
        onCancel();
    };

    if (!open) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-transparent"
                style={{ zIndex: zIndex - 1 }}
                onClick={handleClose}
            />

            {/* Popover */}
            <div
                ref={popoverRef}
                className={cn(
                    "fixed bg-white rounded-lg shadow-lg border border-gray-200",
                    "px-4 py-3"
                )}
                style={{
                    top: position.top,
                    left: position.left,
                    width,
                    zIndex,
                }}
            >
                <p className="text-sm mb-3">{message}</p>
                <hr className="border-gray-200 mb-3" />
                <div className="flex justify-end gap-2">
                    <Button
                        size="sm"
                        variant={buttonVariant || confirmColor}
                        onClick={handleConfirm}
                        className="normal-case"
                    >
                        {confirmText}
                    </Button>
                    <Button
                        size="sm"
                        variant={cancelColor}
                        onClick={handleCancel}
                        className="normal-case"
                    >
                        {cancelText}
                    </Button>
                </div>
            </div>
        </>
    );
}