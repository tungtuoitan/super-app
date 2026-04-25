/**
 * Confirmation Popover Helper Hook
 * Business logic for confirmation popover operations
 * Following SuperApp architecture patterns
 */


import { useConfirmationPopoverStore, ConfirmationPopoverOptions } from "@/store/ConfirmationPopover.store";

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
    const handleConfirm = async () => {
        if (options?.onConfirm) {
            await options.onConfirm();
        }
        hide();
    };

    /**
     * Handle third button action
     */
    const handleThirdButton = async () => {
        if (options?.onThirdButton) {
            await options.onThirdButton();
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
        handleThirdButton,
        handleCancel,
    };
};
