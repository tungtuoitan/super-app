/**
 * Confirmation Popover Helper Hook
 * Business logic for confirmation popover operations
 * Following SuperApp architecture patterns
 */

import { useCallback } from "react";
import { useConfirmationPopoverStore, ConfirmationPopoverOptions } from "@/store/confirmationPopover/ConfirmationPopover.store";

export const useConfirmationPopoverHelper = () => {
    const { isOpen, setIsOpen, options, setOptions } = useConfirmationPopoverStore();

    /**
     * Show confirmation popover with given options
     */
    const showConfirmation = (opts: ConfirmationPopoverOptions) => {
        setOptions(opts);
        setIsOpen(true);
    };

    /**
     * Hide confirmation popover
     */
    const hide = () => {
        setIsOpen(false);
        // Clear options after animation
        setTimeout(() => {
            setOptions(null);
        }, 200);
    };

    /**
     * Handle confirm action
     */
    const handleConfirm = () => {
        if (options?.onConfirm) {
            options.onConfirm();
        }
        hide();
    };

    /**
     * Handle cancel action
     */
    const handleCancel = () => {
        hide();
    };

    return {
        // Actions
        showConfirmation,
        hide,
        handleConfirm,
        handleCancel,
    };
};
