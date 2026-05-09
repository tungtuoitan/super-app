import React, { useRef, useEffect } from "react";
import { Panel } from "@xyflow/react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskFlowSearchHelper } from "../../hooks/mpTaskFlow/useTaskFlowSearch.helper";

export function TaskFlowSearchBar() {
    const {
        isSearchOpen,
        searchQuery,
        searchMatchIds,
        searchActiveIndex,
        handleSearch,
        handleNext,
        handlePrev,
        handleClose,
    } = useTaskFlowSearchHelper();
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-border rounded-lg shadow-lg min-w-[240px]">
                <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search tasks..."
                    className={cn(
                        "flex-1 bg-transparent text-xs outline-none border-none text-foreground placeholder:text-muted-foreground/60 min-w-0",
                        noResults && "text-destructive",
                    )}
                />
                <span className={cn(
                    "text-xs tabular-nums flex-shrink-0 min-w-[32px] text-right",
                    noResults ? "text-destructive" : "text-muted-foreground",
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
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Previous match (Shift+Enter)"
                    >
                        <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={handleNext}
                        disabled={!hasResults}
                        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Next match (Enter)"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                </div>
                <button
                    onClick={handleClose}
                    className="p-0.5 rounded hover:bg-muted flex-shrink-0 transition-colors"
                    title="Close (Escape)"
                >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
            </div>
        </Panel>
    );
}
