import React, { useRef, useEffect } from "react";
import { Panel } from "@xyflow/react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKQFlowSearchHelper } from "@/features/K/hooks/qFlow/useKQFlowSearch.helper";

export function KQFlowSearchBar() {
    const {
        isSearchOpen,
        searchQuery,
        searchMatchIds,
        searchActiveIndex,
        handleSearch,
        handleNext,
        handlePrev,
        handleClose,
    } = useKQFlowSearchHelper();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 50);
        }
    }, [isSearchOpen]);

    if (!isSearchOpen) return null;

    const hasResults = searchMatchIds.length > 0;
    const noResults = searchQuery.trim().length > 0 && !hasResults;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") { handleClose(); return; }
        if (e.key === "Enter") {
            e.preventDefault();
            e.shiftKey ? handlePrev() : handleNext();
        }
    };

    return (
        <Panel position="top-left" className="!m-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg min-w-[240px]">
                <Search className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search questions..."
                    className={cn(
                        "flex-1 bg-transparent text-xs outline-none border-none text-zinc-100 placeholder:text-zinc-600 min-w-0",
                        noResults && "text-red-400",
                    )}
                />
                <span className={cn(
                    "text-xs tabular-nums flex-shrink-0 min-w-[32px] text-right",
                    noResults ? "text-red-400" : "text-zinc-500",
                )}>
                    {searchQuery.trim()
                        ? hasResults
                            ? `${searchActiveIndex + 1}/${searchMatchIds.length}`
                            : "0/0"
                        : ""}
                </span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                        onClick={handlePrev}
                        disabled={!hasResults}
                        className="p-0.5 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-400"
                        title="Previous match (Shift+Enter)"
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!hasResults}
                        className="p-0.5 rounded hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-400"
                        title="Next match (Enter)"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
                <button
                    onClick={handleClose}
                    className="p-0.5 rounded hover:bg-zinc-700 flex-shrink-0 transition-colors text-zinc-500"
                    title="Close (Escape)"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </Panel>
    );
}
