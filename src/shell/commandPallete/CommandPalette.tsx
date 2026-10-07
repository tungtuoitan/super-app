/**
 * Command Palette Component
 * VS Code-style Ctrl+P quick search for keywords
 */

import React, { useEffect, useState } from "react";
import { Search, Link2 } from "lucide-react";
import { useCommandPaletteStore } from "./useCommandPalette.store";
import { useCommandPaletteHelper } from "./useCommandPalette.helper";
import { useCommandPaletteKeyDown } from "./useCommandPaletteKeyDown";
import { HighlightedText, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared";
import type { Keyword, KeywordType } from "@/shared";
import { KeywordIconRenderer } from "./KeywordIconRenderer";

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
    const { getFilteredKeywords, handleSelectKeyword, close, getActiveTypes } = useCommandPaletteHelper();
    useCommandPaletteKeyDown();

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
    const activeTypes = getActiveTypes();

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 z-[100]" onClick={close} />

            {/* Command Palette */}
            <div className="fixed top-[100px] left-1/2 -translate-x-1/2 w-[90%] max-w-[640px] z-[100000001]">
                <div className="sa-shadow-pop bg-popover text-popover-foreground rounded-xl border border-sa-border-strong overflow-hidden">
                    {/* Search Input */}
                    <div className="h-12 flex items-center px-4 border-b border-sa-border">
                        <Search className="w-4 h-4 text-muted-foreground mr-2 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isLinkMode ? "Search keyword to link..." : "Search keywords (workspace, folder, note, heading, external)..."}
                            className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                                ✕
                            </button>
                        )}
                        {isLinkMode && (
                            <span className="ml-3 text-[11px] text-sa-amber-ink border border-sa-amber/40 rounded-md px-1.5 py-0.5">Link mode</span>
                        )}
                    </div>

                    {/* Type Filter Bar */}
                    {activeTypes.length > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-sa-border flex-wrap">
                            {activeTypes.map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(selectedType === type ? null : type)}
                                    className={`
                                        flex items-center gap-1 h-6 px-2 rounded-full text-xs transition-colors duration-100
                                        ${selectedType === type
                                            ? "bg-sa-surface-2 text-foreground border border-sa-amber/60"
                                            : "text-muted-foreground border border-sa-border-strong hover:text-foreground hover:bg-sa-hover"}
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
                    <div ref={listRef} className="max-h-[400px] overflow-y-auto py-1.5">
                        {filteredKeywords.length === 0 ? (
                            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No keywords found</div>
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
                                            group mx-1.5 rounded-md px-2.5 py-1.5 cursor-pointer flex items-center gap-3
                                            ${isSelected ? "bg-sa-hover-strong hover:bg-sa-hover-strong" : "hover:bg-sa-hover"}
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
                                            className="w-4 h-4 text-muted-foreground flex-shrink-0"
                                        />

                                        {/* Name Column */}
                                        <TooltipProvider delayDuration={500}>
                                        <Tooltip>
                                        <TooltipTrigger asChild>
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                            <HighlightedText
                                                text={keyword.name}
                                                matchIndices={match.matchedIndices.name}
                                                className="text-foreground text-[13px] truncate"
                                                highlightClassName="text-sa-amber-ink font-semibold"
                                            />
                                            {match.displayLink && (
                                                <HighlightedText
                                                    text={match.displayLink}
                                                    matchIndices={match.matchedIndices.link}
                                                    className="font-mono text-[11px] text-muted-foreground truncate"
                                                    highlightClassName="text-sa-amber-ink"
                                                />
                                            )}
                                            {isDisabled && <span className="text-[11px] text-sa-danger border border-sa-danger/35 px-1.5 rounded-md flex-shrink-0">Deleted</span>}
                                            {isAlreadyLinked && <span className="text-[11px] text-sa-good border border-sa-good/35 px-1.5 rounded-md flex-shrink-0">Linked</span>}
                                        </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" align="start" className="text-left max-w-[360px] space-y-1 text-xs">
                                            <p className="font-medium text-foreground">Name: {keyword.name}</p>
                                            {keyword.description && <p className="text-muted-foreground">Description: {keyword.description}</p>}
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
                                                className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs text-sa-amber-ink border border-sa-amber/40 hover:bg-sa-amber/10 transition-colors opacity-0 group-hover:opacity-100"
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
                    <div className="px-4 py-2 bg-sa-surface border-t border-sa-border flex items-center justify-between text-[11px] text-muted-foreground">
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
