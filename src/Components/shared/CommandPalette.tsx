/**
 * Command Palette Component
 * VS Code-style Ctrl+P quick search for keywords
 */

import React, { useEffect, useMemo } from "react";
import { Search, Link2 } from "lucide-react";
import { useCommandPaletteStore } from "@/store/commandPalette/useCommandPalette.store";
import { useCommandPaletteHelper } from "@/hooks/index";
import { HighlightedText } from "./HighlightedText";
import { CommandPaletteKeyDown } from "@/HeadlessComponents/vsCode/CommandPaletteKeyDown";
import {useGeneralStore} from "@/store/general/General.store";

export function CommandPalette() {
    const { isOpen, setIsOpen, searchQuery, setSearchQuery, selectedIndex, setSelectedIndex, inputRef, listRef, onLinkKeyword } = useCommandPaletteStore();
    const { getFilteredKeywords, handleSelectKeyword, getKeywordIcon, close } = useCommandPaletteHelper();
    const { allKeywords } = useGeneralStore();

    // Get filtered keywords using helper function
    const filteredKeywords = useMemo(() => {
        return getFilteredKeywords(searchQuery);
    }, [searchQuery, allKeywords.length]);

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

    const isLinkMode = onLinkKeyword !== null;

    return (
        <>
            <CommandPaletteKeyDown />
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-[100]" onClick={close} />

            {/* Command Palette */}
            <div className="fixed top-[100px] left-1/2 -translate-x-1/2 w-[90%] max-w-[640px] z-[100000001]">
                <div className="bg-[#252526] rounded-lg shadow-2xl border border-[#3E3E42] overflow-hidden">
                    {/* Search Input */}
                    <div className="flex items-center px-4 py-3 border-b border-[#3E3E42]">
                        <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isLinkMode ? "Search keyword to link..." : "Search keywords (workspace, folder, note, heading, external)..."}
                            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-gray-500"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white ml-2">
                                ✕
                            </button>
                        )}
                        {isLinkMode && (
                            <span className="ml-3 text-xs text-blue-400 border border-blue-400/50 rounded px-2 py-0.5">Link mode</span>
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
                                        onClick={() => !isDisabled && !isLinkMode && handleSelectKeyword(keyword)}
                                        className={`
                                            group px-4 py-1.5 cursor-pointer flex items-center gap-3
                                            ${isSelected ? "bg-[#44475A] hover:bg-[#44475A]" : "hover:bg-[#2A2D2E]"}
                                            ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                                            ${isLinkMode ? "cursor-default" : ""}
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

                                        {/* Link button (link mode only, visible on hover) */}
                                        {isLinkMode && !isDisabled && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onLinkKeyword!(keyword);
                                                    close();
                                                }}
                                                className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-xs text-blue-400 border border-blue-400/40 hover:bg-blue-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Link this keyword"
                                            >
                                                <Link2 className="w-3 h-3" />
                                                Link
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-2 bg-[#1E1E1E] border-t border-[#3E3E42] flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-4">
                            <span>↑↓ Navigate</span>
                            {isLinkMode ? <span>Click Link button to link</span> : <span>Enter Select</span>}
                            <span>Esc Close</span>
                        </div>
                        <span>{filteredKeywords.length} items</span>
                    </div>
                </div>
            </div>
        </>
    );
}
