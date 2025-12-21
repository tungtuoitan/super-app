/**
 * Confirmation Popover Helper Hook
 * Business logic for confirmation popover operations
 * Following SuperApp architecture patterns
 */

import { useCallback } from 'react';
import { useConfirmationPopoverStore, ConfirmationPopoverOptions } from '@/store/confirmationPopover/ConfirmationPopover.store';

export const useConfirmationPopoverHelper = () => {
    const { isOpen, setIsOpen, options, setOptions } = useConfirmationPopoverStore();

    /**
     * Show confirmation popover with given options
     */
    const showConfirmation = (opts: ConfirmationPopoverOptions) => {
        console.log('[ConfirmationPopoverHelper] showConfirmationPopover() called');
        setOptions(opts);
        setIsOpen(true);
    }

    /**
     * Hide confirmation popover
     */
    const hide = () => {
        console.log('[ConfirmationPopoverHelper] hide() called');
        setIsOpen(false);
        // Clear options after animation
        setTimeout(() => {
            setOptions(null);
        }, 200);
    }

    /**
     * Handle confirm action
     */
    const handleConfirm = () => {
        console.log('[ConfirmationPopoverHelper] handleConfirm() called');
        if (options?.onConfirm) {
            options.onConfirm();
        }
        hide();
    }

    /**
     * Handle cancel action
     */
    const handleCancel = () => {
        console.log('[ConfirmationPopoverHelper] handleCancel() called');
        hide();
    }

    return {
        // Actions
        showConfirmation,
        hide,
        handleConfirm,
        handleCancel,
    };
};
