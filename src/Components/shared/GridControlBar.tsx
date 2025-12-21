/**
 * GridControlBar - Search and filter controls for grid
 * Used in VSSideBar header to control active grid
 */

import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { GenericFilterPopup } from './GenericFilterPopup';
import { useGridControlHelper } from '@/hooks/useGridControl.helper';

export function GridControlBar() {
    const {
        table,
        searchQuery,
        columnFilters,
        entityName,
        setSearchQuery,
        clearSearch,
        clearFilters,
        isGridActive,
    } = useGridControlHelper();

    // Don't render if no grid is active
    if (!isGridActive() || !table) {
        return null;
    }

    return (
        <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none " />
                <Input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="!outline-none !ring-0 h-7 w-[160px] pl-7 pr-7 text-xs bg-editor-bg ring-0 focus:ring-0 focus-visible:ring-0 outline-none focus:outline-none"
                    style={{ outline: 'none' }}
                />
                {searchQuery && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSearch}
                        className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                    >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </Button>
                )}
            </div>

            {/* Filter Popup */}
            <GenericFilterPopup
                table={table}
                columnFilters={columnFilters}
                onClearFilters={clearFilters}
                entityName={entityName}
            />
        </div>
    );
}
