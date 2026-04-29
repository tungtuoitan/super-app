import { MouseEvent, useEffect, useMemo, useState } from "react";
import { useCommandPaletteHelper } from "@/shell";
import {useCommandPaletteStore} from "../store/useCommandPalette.store";

export function useCommandPaletteKeyDown() {
    const { isOpen, setIsOpen, searchQuery, setSearchQuery, selectedIndex, setSelectedIndex, inputRef, listRef } = useCommandPaletteStore();
    const { getFilteredKeywords, handleSelectKeyword, getKeywordIcon, close } = useCommandPaletteHelper();

    // Get filtered keywords using helper function
    const filteredKeywords = useMemo(() => {
        return getFilteredKeywords(searchQuery);
    }, [searchQuery]);


    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev: number) => prev ===filteredKeywords.length-1 ? 0 : Math.min(prev + 1, filteredKeywords.length - 1));
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev: number) => prev === 0 ? filteredKeywords.length-1 : Math.max(prev - 1, 0));
                    break;

                case "Enter":
                    e.preventDefault();
                    const selectedMatch = filteredKeywords[selectedIndex];
                    if (selectedMatch && selectedMatch.keyword.hardDeletedAt === null) {
                        handleSelectKeyword(selectedMatch.keyword);
                    }
                    break;

                case "Escape":
                    e.preventDefault();
                    close();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, filteredKeywords, selectedIndex]);

    // Handle Ctrl+P to open command palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Ctrl+P (Windows/Linux) or Cmd+P (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
                e.preventDefault();
                setIsOpen(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return null;
}
