import { createContext, Dispatch, SetStateAction, useContext, useState } from "react";

export interface DialogContextData<T = any> {
    // Dialog open/close state
    open: boolean;
    setOpen: Dispatch<SetStateAction<boolean>>;

    // Dialog data of generic type T
    data: T | null;
    setData: Dispatch<SetStateAction<T | null>>;

    // Dialog type for different dialog variants
    dialogType: string;
    setDialogType: Dispatch<SetStateAction<string>>;

    // Dialog loading state
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;

    // Dialog error state
    error: string | null;
    setError: Dispatch<SetStateAction<string | null>>;

    // Dialog title and message
    title: string;
    setTitle: Dispatch<SetStateAction<string>>;
    message: string;
    setMessage: Dispatch<SetStateAction<string>>;

    // Confirmation dialog states
    showConfirmation: boolean;
    setShowConfirmation: Dispatch<SetStateAction<boolean>>;
    confirmationData: any;
    setConfirmationData: Dispatch<SetStateAction<any>>;

    // Multiple dialog support
    dialogStack: string[];
    setDialogStack: Dispatch<SetStateAction<string[]>>;
}

const dialogContextDefaultValue: DialogContextData = {
    // Dialog open/close state
    open: false,
    setOpen: () => {},

    // Dialog data
    data: null,
    setData: () => {},

    // Dialog type
    dialogType: "",
    setDialogType: () => {},

    // Dialog loading state
    loading: false,
    setLoading: () => {},

    // Dialog error state
    error: null,
    setError: () => {},

    // Dialog title and message
    title: "",
    setTitle: () => {},
    message: "",
    setMessage: () => {},

    // Confirmation dialog states
    showConfirmation: false,
    setShowConfirmation: () => {},
    confirmationData: null,
    setConfirmationData: () => {},

    // Multiple dialog support
    dialogStack: [],
    setDialogStack: () => {},
};

export const DialogStore = createContext<DialogContextData>(dialogContextDefaultValue);

export const useDialogStore = () => useContext(DialogStore);

export const DialogProvider: React.FC<React.PropsWithChildren<React.PropsWithChildren<unknown>>> = ({ children }) => {
    // Dialog open/close state
    const [open, setOpen] = useState<boolean>(false);

    // Dialog data
    const [data, setData] = useState<any>(null);

    // Dialog type
    const [dialogType, setDialogType] = useState<string>("");

    // Dialog loading state
    const [loading, setLoading] = useState<boolean>(false);

    // Dialog error state
    const [error, setError] = useState<string | null>(null);

    // Dialog title and message
    const [title, setTitle] = useState<string>("");
    const [message, setMessage] = useState<string>("");

    // Confirmation dialog states
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const [confirmationData, setConfirmationData] = useState<any>(null);

    // Multiple dialog support
    const [dialogStack, setDialogStack] = useState<string[]>([]);

    return (
        <DialogStore.Provider
            value={{
                // Dialog open/close state
                open,
                setOpen,

                // Dialog data
                data,
                setData,

                // Dialog type
                dialogType,
                setDialogType,

                // Dialog loading state
                loading,
                setLoading,

                // Dialog error state
                error,
                setError,

                // Dialog title and message
                title,
                setTitle,
                message,
                setMessage,

                // Confirmation dialog states
                showConfirmation,
                setShowConfirmation,
                confirmationData,
                setConfirmationData,

                // Multiple dialog support
                dialogStack,
                setDialogStack,
            }}
        >
            {children}
        </DialogStore.Provider>
    );
};
