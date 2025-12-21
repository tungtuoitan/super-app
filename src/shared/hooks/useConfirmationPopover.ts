/**
 * useConfirmationPopover Hook
 * Custom hook for managing confirmation popover state
 * Following SuperApp architecture patterns
 */

import { useState } from 'react';

export interface UseConfirmationPopoverOptions {
    /** Text for the confirm button */
    confirmText?: string;
    /** Text for the cancel button */
    cancelText?: string;
    /** Variant for the confirm button */
    confirmColor?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
    /** Variant for the cancel button */
    cancelColor?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
    /** Variant for buttons */
    buttonVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
    /** Custom width for the popover */
    width?: string;
    /** Z-index for the popover */
    zIndex?: number;
}

export interface ConfirmationPopoverState {
    /** Whether the popover is open */
    isOpen: boolean;
    /** Element to anchor the popover to */
    anchorEl: HTMLElement | null;
    /** Message to display in the popover */
    message: string;
    /** Callback when confirmed */
    onConfirm: (() => void) | null;
}


export function useConfirmationPopover(options: UseConfirmationPopoverOptions = {}) {
    const [state, setState] = useState<ConfirmationPopoverState>({
        isOpen: false,
        anchorEl: null,
        message: '',
        onConfirm: null,
    });

    const show = (params: {
        event?: React.MouseEvent<HTMLElement> | MouseEvent | any;
        anchorEl?: HTMLElement | null;
        message: string;
        onConfirm: () => void;
    }) => {
        // Support both React events and native events
        let anchor: HTMLElement | null = null;
        
        if (params.anchorEl) {
            // Direct anchorEl provided
            anchor = params.anchorEl;
        } else if (params.event) {
            // Try to extract anchor from event
            if ('currentTarget' in params.event && params.event.currentTarget instanceof HTMLElement) {
                anchor = params.event.currentTarget;
            } else if ('target' in params.event && params.event.target instanceof HTMLElement) {
                anchor = params.event.target;
            }
        }
        
        console.log('[useConfirmationPopover] show() called with:', {
            anchor,
            message: params.message,
            hasOnConfirm: !!params.onConfirm
        });
        
        setState({
            isOpen: true,
            anchorEl: anchor,
            message: params.message,
            onConfirm: params.onConfirm,
        });
        
        console.log('[useConfirmationPopover] setState called with isOpen=true');
    };

    const hide = () => {
        setState(prev => ({
            ...prev,
            isOpen: false,
        }));
    };

    const handleConfirm = () => {
        if (state.onConfirm) {
            state.onConfirm();
        }
        hide();
    };

    const handleCancel = () => {
        hide();
    };

    // Clear anchor element after animation completes
    const handleClose = () => {
        setTimeout(() => {
            setState(prev => ({
                ...prev,
                anchorEl: null,
                message: '',
                onConfirm: null,
            }));
        }, 200);
    };

    const getPopoverProps = () => {
        console.log('[useConfirmationPopover] getPopoverProps() called, state:', {
            isOpen: state.isOpen,
            hasAnchor: !!state.anchorEl,
            hasMessage: !!state.message,
            hasOnConfirm: !!state.onConfirm
        });
        
        return {
            open: state.isOpen,
            anchorEl: state.anchorEl,
            message: state.message,
            onConfirm: handleConfirm,
            onCancel: handleCancel,
            onClose: handleClose,
            confirmText: options.confirmText,
            cancelText: options.cancelText,
            confirmColor: options.confirmColor,
            cancelColor: options.cancelColor,
            buttonVariant: options.buttonVariant,
            width: options.width,
            zIndex: options.zIndex || 10000, // Higher than Dialog z-index
        };
    };

    return {
        /** Current state of the confirmation popover */
        state,
        /** Show the confirmation popover */
        show,
        /** Hide the confirmation popover */
        hide,
        /** Get props for the confirmation popover component */
        getPopoverProps,
        /** Whether the popover is currently open */
        isOpen: state.isOpen,
    };
}