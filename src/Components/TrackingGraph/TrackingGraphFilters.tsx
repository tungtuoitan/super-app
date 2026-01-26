/**
 * TrackingGraphFilters - Filter controls for tracking graph
 */

import { useTrackingGraphStore } from "@/store/tracking/TrackingGraph.store";
import { useTrackingGraphHelper } from "@/hooks/tracking/useTrackingGraph.helper";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { Checkbox } from "@/Components/ui/checkbox";
import { Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLineColor } from "@/utils/tracking-parser.utils";
import { useState } from "react";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export function TrackingGraphFilters() {
    const { filters, uniqueItems, currentFolderName } = useTrackingGraphStore();
    const {
        availableYears,
        availableMonths,
        updateFilter,
        toggleSelectedItem,
        selectAllItems,
        deselectAllItems,
        groupedItems,
        toggleGroup,
        isGroupFullySelected,
        isGroupPartiallySelected,
    } = useTrackingGraphHelper();

    // Track collapsed groups
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const toggleGroupCollapse = (section: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };

    return (
        <div className="p-4 border-b border-editor-border space-y-4">
            <div className="p-4 border-b border-editor-border">
    <div className="flex items-center justify-between gap-6 flex-nowrap">
        {/* Left: Title */}
        <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">
            Tracking: {currentFolderName}
        </h2>

        {/* Middle: Filters */}
        <div className="flex items-center gap-4 flex-nowrap">
            {/* Year */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Year:</span>
                <Select
                    value={filters.year?.toString() ?? "all"}
                    onValueChange={(value) =>
                        updateFilter("year", value === "all" ? null : parseInt(value))
                    }
                >
                    <SelectTrigger className="w-[120px] h-8">
                        <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Month */}
            <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Month:</span>
                <Select
                    value={filters.month?.toString() ?? "all"}
                    onValueChange={(value) =>
                        updateFilter("month", value === "all" ? null : parseInt(value))
                    }
                    disabled={!filters.year}
                >
                    <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {availableMonths.map((month) => (
                            <SelectItem key={month} value={month.toString()}>
                                {MONTH_NAMES[month - 1]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

        {/* Right: Item selection */}
        <div className="flex items-center gap-3 whitespace-nowrap">
            {/* <span className="text-sm text-muted-foreground">
                Items ({filters.selectedItems.length}/{uniqueItems.length})
            </span> */}

            <Button
                variant="ghost"
                size="sm"
                onClick={selectAllItems}
                className="h-7 px-2 text-xs"
            >
                <Check className="w-3 h-3 mr-1" />
                All
            </Button>

            <Button
                variant="ghost"
                size="sm"
                onClick={deselectAllItems}
                className="h-7 px-2 text-xs"
            >
                <X className="w-3 h-3 mr-1" />
                None
            </Button>
        </div>
    </div>
</div>

            {/* Item Selection */}
            <div className="space-y-2">

                <ScrollArea className="h-[200px]">
                    <TooltipProvider delayDuration={300}>
                        <div className="space-y-3 pr-4">
                            {groupedItems.map((group) => {
                                const isCollapsed = collapsedGroups.has(group.section);
                                const isFullySelected = isGroupFullySelected(group.section);
                                const isPartiallySelected = isGroupPartiallySelected(group.section);
                                // Get the starting index for this group's items in uniqueItems
                                const startIndex = uniqueItems.findIndex(
                                    (item) => item.key === group.items[0]?.key
                                );

                                return (
                                    <div key={group.section} className="space-y-1">
                                        {/* Group Header */}
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0"
                                                onClick={() => toggleGroupCollapse(group.section)}
                                            >
                                                {isCollapsed ? (
                                                    <ChevronRight className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                            </Button>
                                            <Checkbox
                                                checked={isFullySelected}
                                                ref={(el) => {
                                                    if (el) {
                                                        (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate =
                                                            isPartiallySelected;
                                                    }
                                                }}
                                                onCheckedChange={() => toggleGroup(group.section)}
                                                className="h-4 w-4"
                                            />
                                            <span
                                                className="text-sm font-medium text-foreground cursor-pointer hover:underline"
                                                onClick={() => toggleGroup(group.section)}
                                            >
                                                {group.section}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                ({group.items.length})
                                            </span>
                                        </div>

                                        {/* Group Items */}
                                        {!isCollapsed && (
                                            <div className="flex flex-wrap gap-2 pl-8">
                                                {group.items.map((item, itemIndex) => {
                                                    const globalIndex = startIndex + itemIndex;
                                                    const isSelected = filters.selectedItems.includes(item.key);
                                                    const isNegative = item.isNegative;
                                                    // Use red for negative items, otherwise use normal color palette
                                                    const itemColor = isNegative ? "#ef4444" : getLineColor(globalIndex);

                                                    const badge = (
                                                        <Badge
                                                            key={item.key}
                                                            variant={isSelected ? "default" : "outline"}
                                                            className={cn(
                                                                `cursor-pointer transition-all opacity-50 hover:opacity-80`,
                                                                isSelected && "text-white opacity-90 hover:opacity-100",
                                                                isNegative && "border-dashed",

                                                                
                                                            )}
                                                            style={{
                                                                backgroundColor: isSelected ? itemColor : "transparent",
                                                                // opacity: isSelected ? 1 : 0.5,
                                                                borderColor: itemColor,
                                                                color: isSelected ? "white" : itemColor,
                                                            }}
                                                            onClick={() => toggleSelectedItem(item.key)}
                                                        >
                                                            {item.text}
                                                            <span className="ml-1 opacity-60">({item.totalCount})</span>
                                                        </Badge>
                                                    );

                                                    // Wrap with tooltip if item has a note
                                                    if (item.note) {
                                                        return (
                                                            <Tooltip key={item.key}>
                                                                <TooltipTrigger asChild>{badge}</TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="max-w-xs">{item.note}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    }

                                                    return badge;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </TooltipProvider>
                </ScrollArea>
            </div>
        </div>
    );
}
