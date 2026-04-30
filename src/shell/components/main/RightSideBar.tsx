/**
 * RightSideBar - Search and filter controls for grid
 * Used in VSSideBar header to control active grid
 */

import React, { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/shared";
import { Button } from "@/shared";
import { GenericFilterPopup } from "../../genericFilter/GenericFilterPopup";
import { useDeviceStore } from "@/shared";
import {useSideBarStore} from "../../store/SideBar.store";

export function RightSideBar({ hideFilter }: { hideFilter?: boolean } = {}) {
    const { searchQuery, moduleName, filterViewKey, setSearchQuery } = useSideBarStore();
    const { isMobile } = useDeviceStore();
    const [inputValue, setInputValue] = useState(searchQuery);

    // Sync inputValue with searchQuery from store
    useEffect(() => {
        setInputValue(searchQuery);
    }, [searchQuery]);

    const handleSearch = () => {
        setSearchQuery(inputValue);
    };

    const handleClear = () => {
        setInputValue("");
        setSearchQuery("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSearch();
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none " />
                <Input
                    type="text"
                    placeholder="Search..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={`!outline-none !ring-0 h-7 ${isMobile ? "w-[100px]" : "w-[160px]"} pl-7 pr-7 text-xs bg-editor-bg ring-0 focus:ring-0 focus-visible:ring-0 outline-none focus:outline-none`}
                    style={{ outline: "none" }}
                />
                {inputValue && (
                    <Button variant="ghost" size="sm" onClick={handleClear} className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent">
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                )}
            </div>

            {/* Filter Popup */}
            {!hideFilter && <GenericFilterPopup />}
        </div>
    );
}
