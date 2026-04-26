/**
 * Command Palette Component
 * VS Code-style Ctrl+P quick search for keywords
 */

import React, { useEffect, useMemo, useState } from "react";
import { Search, Link2 } from "lucide-react";
import { useCommandPaletteStore } from "@/store/useCommandPalette.store";
import { useCommandPaletteHelper } from "@/shell/hooks/useCommandPalette.helper";
import { HighlightedText } from "./HighlightedText";
import { CommandPaletteKeyDown } from "@/shell/hooks/useCommandPaletteKeyDown";
import { useGeneralStore } from "@/store/General.store";
import { KeywordIconRenderer } from "./KeywordIconRenderer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { Keyword, KeywordType } from "@/types/keyword.types";

const ALL_TYPES: KeywordType[] = ["workspace", "folder", "note", "file", "external", "project", "task", "log", "track"];

const TYPE_LABELS: Record<KeywordType, string> = {
    workspace: "Workspace",
    folder: "Folder",
    note: "Note",
    file: "File",
    external: "External",
    project: "Project",
    task: "Task",
    log: "Log",
    track: "Track",
};

export function CommandPalette() {
    const { isOpen, setIsOpen, searchQuery, setSearchQuery, selectedIndex, setSelectedIndex, inputRef, listRef, onLinkKeyword, alreadyLinkedIds, setAlreadyLinkedIds } = useCommandPaletteStore();
    const { getFilteredKeywords, handleSelectKeyword, close } = useCommandPaletteHelper();
    const { allKeywords } = useGeneralStore();

    const [selectedType, setSelectedType] = useState<KeywordType | null>(null);

    // Get filtered keywords using helper function
    const filteredKeywords = (() => {
        const bySearch = getFilteredKeywords(searchQuery) as Array<{ keyword: Keyword; matchedIndices: { name: number[]; link: number[] }; displayLink: string }>;
        if (!selectedType) return bySearch;
        return bySearch.filter((m) => m.keyword.type === selectedType);
    })()

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

    // Reset type filter when palette closes
    useEffect(() => {
        if (!isOpen) setSelectedType(null);
    }, [isOpen]);

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

    // Only show types that have at least 1 active keyword
    const activeTypes = ALL_TYPES.filter((t) =>
        allKeywords.some((k) => k.type === t && k.hardDeletedAt === null)
    );

    return (
        <>
            <CommandPaletteKeyDown />
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 z-[100]" onClick={close} />

            {/* Command Palette */}
            <div className="fixed top-[100px] left-1/2 -translate-x-1/2 w-[90%] max-w-[640px] z-[100000001]">
                <div className="bg-[#252526] rounded-lg shadow-2xl border border-[#3E3E42] overflow-hidden">
                    {/* Search Input */}
                    <div className="h-[54px] flex items-center px-4 py-4 border-b border-[#3E3E42]">
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
                            <button onClick={() => setSearchQuery("")} className="text-gray-400 hover:text-white">
                                ✕
                            </button>
                        )}
                        {isLinkMode && (
                            <span className="ml-3 text-xs text-blue-400 border border-blue-400/50 rounded px-2 py-0.5">Link mode</span>
                        )}
                    </div>

                    {/* Type Filter Bar */}
                    {activeTypes.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[#3E3E42] flex-wrap">
                            {activeTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                                    className={`
                                        flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors
                                        ${selectedType === type
                                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                                            : "text-gray-400 border border-[#3E3E42] hover:border-gray-500 hover:text-gray-200"}
                                    `}
                                >
                                    <KeywordIconRenderer
                                        type={type}
                                        className="w-3 h-3"
                                    />
                                    {TYPE_LABELS[type]}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Results List */}
                    <div ref={listRef} className="max-h-[400px] overflow-y-auto">
                        {filteredKeywords.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">No keywords found</div>
                        ) : (
                            filteredKeywords.map((match, index) => {
                                const keyword = match.keyword;
                                const isDisabled = keyword.hardDeletedAt !== null;
                                const isAlreadyLinked = isLinkMode && alreadyLinkedIds.has(keyword.id);
                                const isSelected = index === selectedIndex;
                                return (
                                    <div
                                        key={`${keyword.id}-${keyword.link}`}
                                        data-index={index}
                                        onClick={() => !isDisabled && !isLinkMode && handleSelectKeyword(keyword)}
                                        className={`
                                            group px-4 py-1.5 cursor-pointer flex items-center gap-3
                                            ${isSelected ? "bg-[#44475A] hover:bg-[#44475A]" : "hover:bg-[#2A2D2E]"}
                                            ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                                            ${isAlreadyLinked ? "opacity-40 cursor-not-allowed" : ""}
                                            ${isLinkMode ? "cursor-default" : ""}
                                        `}
                                    >
                                        {/* Icon Column */}
                                        <KeywordIconRenderer
                                            type={keyword.type}
                                            icon={keyword.icon}
                                            color={keyword.color}
                                            className="w-4 h-4 text-gray-400 flex-shrink-0"
                                        />

                                        {/* Name Column */}
                                        <TooltipProvider delayDuration={500}>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
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
                                            {isAlreadyLinked && <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded flex-shrink-0">Linked</span>}
                                        </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start" className="text-left max-w-[360px] space-y-1 text-xs">
                                            <p className="font-semibold text-white">Name: {keyword.name}</p>
                                            {keyword.description && <p className="text-gray-300">Description: {keyword.description}</p>}
                                        </TooltipContent>
                                        </Tooltip>
                                        </TooltipProvider>

                                        {/* Link button (link mode only, visible on hover) */}
                                        {isLinkMode && !isDisabled && !isAlreadyLinked && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onLinkKeyword!(keyword);
                                                    if (e.shiftKey) {
                                                        setAlreadyLinkedIds(prev => new Set([...prev, keyword.id]));
                                                    } else {
                                                        close();
                                                    }
                                                }}
                                                className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded text-xs text-blue-400 border border-blue-400/40 hover:bg-blue-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                                title="Link this keyword (Shift+Click to keep open)"
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
