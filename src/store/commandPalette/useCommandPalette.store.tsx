/**
 * Command Palette Store
 * Centralized state management for command palette (Ctrl+P)
 */

import { useContext, createContext, Dispatch, SetStateAction, useState, useRef, RefObject } from "react";
import { Keyword } from "@/types/keyword.types";

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

    // Optional link callback - when set, palette shows Link buttons instead of navigating on row click
    onLinkKeyword: ((keyword: Keyword) => void) | null;
    setOnLinkKeyword: Dispatch<SetStateAction<((keyword: Keyword) => void) | null>>;
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
    onLinkKeyword: null,
    setOnLinkKeyword: () => {},
};

export const CommandPaletteStore = createContext<CommandPaletteContextData>(commandPaletteContextDefaultValue);

export const useCommandPaletteStore = () => useContext(CommandPaletteStore);

export const CommandPaletteProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedIndex, setSelectedIndex] = useState<number>(0);
    const [onLinkKeyword, setOnLinkKeyword] = useState<((keyword: Keyword) => void) | null>(null);
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
                onLinkKeyword,
                setOnLinkKeyword,
            }}
        >
            {children}
        </CommandPaletteStore.Provider>
    );
};
