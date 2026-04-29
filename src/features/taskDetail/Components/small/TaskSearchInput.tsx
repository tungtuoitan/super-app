/**
 * TaskSearchInput - Search input for task grids
 * Reads/writes taskSearchQuery from TaskGridStore.
 * Pattern matches GridControlBar search (local state + Enter to search).
 */

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared";
import { usePTaskStore } from "@/features/project";

export function TaskSearchInput() {
    const { taskSearchQuery, setTaskSearchQuery } = usePTaskStore();
    const [inputValue, setInputValue] = useState(taskSearchQuery);

    useEffect(() => {
        setInputValue(taskSearchQuery);
    }, [taskSearchQuery]);

    const handleSearch = () => {
        setTaskSearchQuery(inputValue);
    };

    const handleClear = () => {
        setInputValue("");
        setTaskSearchQuery("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <Input
                type="text"
                placeholder="Search tasks..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="!outline-none !ring-0 h-7 w-[160px] pl-7 pr-7 text-xs bg-editor-bg ring-0 focus:ring-0 focus-visible:ring-0 outline-none focus:outline-none"
                style={{ outline: "none" }}
            />
            {inputValue && (
                <Button variant="ghost" size="sm" onClick={handleClear} className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent">
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </Button>
            )}
        </div>
    );
}
