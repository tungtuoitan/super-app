/**
 * Confirmation Popover Store
 * Centralized state management for confirmation popover
 * Following SuperApp architecture patterns
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from "react";

export interface ConfirmationPopoverOptions {
    title: string;
    subtitle?: string;
    confirmText?: string;
    cancelText?: string;
    thirdButtonText?: string;
    confirmColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    cancelColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    thirdButtonColor?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    buttonVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    width?: string;
    zIndex?: number;
    anchorEl?: HTMLElement | null;
    onConfirm: () => void | Promise<void>;
    onThirdButton?: () => void | Promise<void>;
}

export interface ConfirmationPopoverStoreData {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    options: ConfirmationPopoverOptions | null;
    setOptions: Dispatch<SetStateAction<ConfirmationPopoverOptions | null>>;
}

export const confirmationPopoverStoreDefaultValue: ConfirmationPopoverStoreData = {
    isOpen: false,
    setIsOpen: () => {},
    options: null,
    setOptions: () => {},
};

export const ConfirmationPopoverStore = createContext<ConfirmationPopoverStoreData>(confirmationPopoverStoreDefaultValue);

export const useConfirmationPopoverStore = () => useContext(ConfirmationPopoverStore);

export const ConfirmationPopoverProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [options, setOptions] = useState<ConfirmationPopoverOptions | null>(null);

    return (
        <ConfirmationPopoverStore.Provider
            value={{
                isOpen,
                setIsOpen,
                options,
                setOptions,
            }}
        >
            {children}
        </ConfirmationPopoverStore.Provider>
    );
};
