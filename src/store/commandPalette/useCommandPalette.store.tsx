/**
 * Command Palette Store
 * Centralized state management for command palette (Ctrl+P)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";

export interface CommandPaletteContextData {
    // Visibility state
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;

    // Search query
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;

    // Selected index for keyboard navigation
    selectedIndex: number;
    setSelectedIndex: Dispatch<SetStateAction<number>>;

    // Refs for DOM elements
    inputRef: RefObject<HTMLInputElement>;
    listRef: RefObject<HTMLDivElement>;
}

export const commandPaletteContextDefaultValue: CommandPaletteContextData = {
    isOpen: false,
    setIsOpen: () => {},
    searchQuery: "",
    setSearchQuery: () => {},
    selectedIndex: 0,
    setSelectedIndex: () => {},
    inputRef: { current: null },
    listRef: { current: null },
};

export const CommandPaletteStore = createContext<CommandPaletteContextData>(commandPaletteContextDefaultValue);

export const useCommandPaletteStore = () => useContext(CommandPaletteStore);

export const CommandPaletteProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    return (
        <CommandPaletteStore.Provider
            value={{
                isOpen,
                setIsOpen,
                searchQuery,
                setSearchQuery,
                selectedIndex,
                setSelectedIndex,
                inputRef,
                listRef,
            }}
        >
            {children}
        </CommandPaletteStore.Provider>
    );
};
