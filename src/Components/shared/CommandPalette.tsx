/**
 * Command Palette Component
 * VS Code-style Ctrl+P quick search for keywords
 */

import React, { useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { useCommandPaletteStore } from "@/store/commandPalette/useCommandPalette.store";
import { useCommandPaletteHelper } from "@/hooks/index";
import { HighlightedText } from "./HighlightedText";
import { CommandPaletteKeyDown } from "@/HeadlessComponents/vsCode/CommandPaletteKeyDown";

export function CommandPalette() {
    const { isOpen, setIsOpen, searchQuery, setSearchQuery, selectedIndex, setSelectedIndex, inputRef, listRef } = useCommandPaletteStore();
    const { getFilteredKeywords, handleSelectKeyword, getKeywordIcon, close } = useCommandPaletteHelper();

    // Get filtered keywords using helper function
    const filteredKeywords = useMemo(() => {
        return getFilteredKeywords(searchQuery);
    }, [searchQuery]);

    // Reset selection when filtered list changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [filteredKeywords]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen, inputRef]);

    // Auto-scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return;

        const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
        if (selectedElement) {
            selectedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [selectedIndex, listRef]);

    if (!isOpen) return null;

    return (
        <>
            <CommandPaletteKeyDown />
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-[100]" onClick={close} />

            {/* Command Palette */}
            <div className="fixed top-[100px] left-1/2 -translate-x-1/2 w-[90%] max-w-[640px] z-[101]">
                <div className="bg-[#252526] rounded-lg shadow-2xl border border-[#3E3E42] overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center px-4 py-3 border-b border-[#3E3E42]">
                        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search keywords (workspace, folder, note, heading, external)..."
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white ml-2">
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Results List */}
                    <div ref={listRef} className="max-h-[400px] overflow-y-auto">
                        {filteredKeywords.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">No keywords found</div>
                        ) : (
                            filteredKeywords.map((match, index) => {
                                const keyword = match.keyword;
                                const isDisabled = keyword.hardDeletedAt !== null;
                                const isSelected = index === selectedIndex;
                                const icon = getKeywordIcon(keyword.type);
                                const isHeading = typeof icon === "string";

                                return (
                                    <div
                                        key={`${keyword.id}-${keyword.link}`}
                                        data-index={index}
                                        onClick={() => !isDisabled && handleSelectKeyword(keyword)}
                                        className={`
                                            px-4 py-1.5 cursor-pointer flex items-center gap-3 hover:bg-[#2A2D2E]
                                            ${isSelected ? "bg-[#44475A]" : ""}
                                            ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                                        `}
                                    >
                                        {/* Icon Column */}
                                        {isHeading ? (
                                            <span className="text-xs font-semibold text-gray-400 w-5 flex-shrink-0">{icon}</span>
                                        ) : (
                                            React.createElement(icon as any, {
                                                className: "w-4 h-4 text-gray-400 flex-shrink-0",
                                            })
                                        )}

                                        {/* Name Column */}
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <HighlightedText
                                                text={keyword.name}
                                                matchIndices={match.matchedIndices.name}
                                                className="text-gray-200 text-sm truncate"
                                                highlightClassName="text-blue-400 font-bold"
                                            />
                                            {match.displayLink && (
                                                <HighlightedText
                                                    text={match.displayLink}
                                                    matchIndices={match.matchedIndices.link}
                                                    className="text-xs text-gray-500 truncate"
                                                    highlightClassName="text-blue-300"
                                                />
                                            )}
                                            {isDisabled && <span className="text-xs text-red-400 bg-red-900/30 px-2 py-0.5 rounded flex-shrink-0">Deleted</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-[#1E1E1E] border-t border-[#3E3E42] flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                            <span>↑↓ Navigate</span>
                            <span>Enter Select</span>
                            <span>Esc Close</span>
                        </div>
                        <span>{filteredKeywords.length} items</span>
                    </div>
                </div>
            </div>
        </>
    );
}
