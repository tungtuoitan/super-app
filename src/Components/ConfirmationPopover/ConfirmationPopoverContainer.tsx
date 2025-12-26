/**
 * Confirmation Popover Container
 * Connects ConfirmationPopover UI component with store
 * Following SuperApp architecture patterns
 */

import React from "react";
import { ConfirmationPopover } from "@/shared/components/feedback/ConfirmationPopover";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { useConfirmationPopoverStore } from "@/store/confirmationPopover/ConfirmationPopover.store";

/**
 * Container component that manages confirmation popover state
 * and renders the UI component
 */
export function ConfirmationPopoverContainer() {
    const { isOpen, options } = useConfirmationPopoverStore();
    const { handleConfirm, handleCancel } = useConfirmationPopoverHelper();

    return (
        <ConfirmationPopover
            open={isOpen}
            anchorEl={options?.anchorEl || null}
            message={options?.message || ""}
            confirmText={options?.confirmText}
            cancelText={options?.cancelText}
            confirmColor={options?.confirmColor}
            cancelColor={options?.cancelColor}
            buttonVariant={options?.buttonVariant}
            width={options?.width}
            zIndex={options?.zIndex || 20000}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );
}
