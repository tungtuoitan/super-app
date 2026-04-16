/**
 * Confirmation Popover Container
 * Connects ConfirmationPopover UI component with store
 * Following SuperApp architecture patterns
 */

import React from "react";
import { ConfirmationPopover } from "@/shared/components/feedback/ConfirmationPopover";
import { useConfirmationPopoverHelper } from "@/shared/hooks/useConfirmationPopover.helper";
import { useConfirmationPopoverStore } from "@/store/ConfirmationPopover.store";

/**
 * Container component that manages confirmation popover state
 * and renders the UI component
 */
export function ConfirmationPopoverContainer() {
    const { isOpen, options } = useConfirmationPopoverStore();
    const { handleConfirm, handleThirdButton, handleCancel } = useConfirmationPopoverHelper();

    return (
        <ConfirmationPopover
            open={isOpen}
            anchorEl={options?.anchorEl || null}
            title={options?.title || ""}
            subtitle={options?.subtitle}
            confirmText={options?.confirmText}
            cancelText={options?.cancelText}
            thirdButtonText={options?.thirdButtonText}
            confirmColor={options?.confirmColor}
            cancelColor={options?.cancelColor}
            thirdButtonColor={options?.thirdButtonColor}
            buttonVariant={options?.buttonVariant}
            width={options?.width}
            zIndex={options?.zIndex || 20000}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            onThirdButton={handleThirdButton}
        />
    );
}
