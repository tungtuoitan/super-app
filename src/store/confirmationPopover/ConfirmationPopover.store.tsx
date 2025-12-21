/**
 * Confirmation Popover Store
 * Centralized state management for confirmation popover
 * Following SuperApp architecture patterns
 */

import { useContext, createContext, Dispatch, SetStateAction, useState } from 'react';

export interface ConfirmationPopoverOptions {
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    cancelColor?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    buttonVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    width?: string;
    zIndex?: number;
    anchorEl?: HTMLElement | null;
    onConfirm: () => void;
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

export const ConfirmationPopoverStore = createContext<ConfirmationPopoverStoreData>(
    confirmationPopoverStoreDefaultValue
);

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
