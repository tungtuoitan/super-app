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
            <div className="flex items-center gap-1.5 px-2.5 h-8 bg-popover border border-sa-border-strong rounded-lg sa-shadow-pop min-w-[240px]">
                <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search questions..."
                    className={cn(
                        "flex-1 bg-transparent text-[13px] outline-none border-none text-foreground placeholder:text-muted-foreground/60 min-w-0",
                        noResults && "text-sa-danger",
                    )}
                />
                <span className={cn(
                    "font-mono text-xs tabular-nums flex-shrink-0 min-w-[32px] text-right",
                    noResults ? "text-sa-danger" : "text-muted-foreground",
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
                        className="p-0.5 rounded-md hover:bg-sa-hover-strong hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100 text-muted-foreground"
                        title="Previous match (Shift+Enter)"
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!hasResults}
                        className="p-0.5 rounded-md hover:bg-sa-hover-strong hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100 text-muted-foreground"
                        title="Next match (Enter)"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
                <button
                    onClick={handleClose}
                    className="p-0.5 rounded-md hover:bg-sa-hover-strong hover:text-foreground flex-shrink-0 transition-colors duration-100 text-muted-foreground"
                    title="Close (Escape)"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>
        </Panel>
    );
}
