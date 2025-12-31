/**
 * Confirmation Context
 * Centralized confirmation dialog management
 * Following SuperApp architecture patterns
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { ConfirmationPopover } from "@/shared/components/feedback/ConfirmationPopover";

interface ConfirmationOptions {
    title: string;
    subtitle?: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    cancelColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    width?: string;
    zIndex?: number;
    anchorEl?: HTMLElement | null;
    onConfirm: () => void;
}

interface ConfirmationContextValue {
    showConfirmation: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmationOptions | null>(null);

    const showConfirmation = useCallback((opts: ConfirmationOptions) => {
        setOptions(opts);
        setIsOpen(true);
    }, []);

    const handleConfirm = useCallback(() => {
        options?.onConfirm();
        setIsOpen(false);
        setTimeout(() => setOptions(null), 200);
    }, [options]);

    const handleCancel = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => setOptions(null), 200);
    }, []);

    return (
        <ConfirmationContext.Provider value={{ showConfirmation }}>
            {children}

            {/* Single confirmation popover for entire app */}
            <ConfirmationPopover
                open={isOpen}
                anchorEl={options?.anchorEl || null}
                title={options?.title || ""}
                subtitle={options?.subtitle}
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
        </ConfirmationContext.Provider>
    );
}

export function useConfirmation() {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error("useConfirmation must be used within ConfirmationProvider");
    }
    return context;
}
