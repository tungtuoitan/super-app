/**
 * GenericFilterPopup - Reusable filter popup for grid components
 * Supports multi-field filtering with checkboxes, date ranges, and standard registry options
 * Filters are stored in userProfile and applied on backend
 * Uses useGenericFilterHelper for business logic - no props needed
 */

import React, {useEffect} from "react";
import { Filter, CheckCircle2, Archive, X, Check } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Checkbox } from "@/Components/ui/checkbox";
import { Label } from "@/Components/ui/label";
import type { UserFilters, FilterFieldConfig, ViewFilter } from "@/types/common.types";
import { constants } from "@/utils/constants";
import { useGenericFilterHelper } from "@/hooks/index";
import { useStandardRegistryStore } from "@/store/index";
import { useGridControlStore } from "@/store/grid/useGridControl.store";

export function GenericFilterPopup() {
    const { getViewFilter, getActiveFiltersCount, isPendingValueActive, handleCheckboxToggle, handleApply, handleClearFilters } = useGenericFilterHelper();
    const { registriesByType } = useStandardRegistryStore();
    const { moduleName, filterViewKey, pendingFilters, setPendingFilters } = useGridControlStore();

    // Get current filters (safe to call even if filterViewKey is null)
    const currentFilters = filterViewKey ? getViewFilter(filterViewKey) : {};
    const activeFiltersCount = filterViewKey ? getActiveFiltersCount(filterViewKey) : 0;

    // Sync pending filters with saved filters when currentFilters change
    useEffect(() => {
        setPendingFilters(currentFilters);
    }, [JSON.stringify(currentFilters)]);

    // Don't render if filterViewKey is not set
    if (!filterViewKey) {
        return null;
    }

    // Get field configurations for this view
    const fieldConfigs = (constants.filters.fields as any)[filterViewKey] as readonly FilterFieldConfig[];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                    <Filter className="h-4 w-4" />
                    {activeFiltersCount > 0 && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="end">
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm">Filter {moduleName}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                            {activeFiltersCount > 0 && (
                                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-7 px-2 text-xs">
                                    <X className="h-3 w-3 mr-1" />
                                    Clear
                                </Button>
                            )}
                            <Button variant="default" size="sm" onClick={handleApply} className="h-6 px-2 text-xs bg-white/80 hover:bg-white pb-1">
                                Apply
                            </Button>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Filter Fields */}
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {fieldConfigs.map((fieldConfig) => {
                            if (fieldConfig.type === "checkbox" && fieldConfig.standardRegistryType) {
                                // Checkbox group for standard registry fields
                                const options = registriesByType[fieldConfig.standardRegistryType] || [];

                                return (
                                    <div key={fieldConfig.key} className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">{fieldConfig.label}</Label>
                                        <div className="space-y-1.5">
                                            {options.map((option) => {
                                                const isChecked = isPendingValueActive(fieldConfig.key, option.code);

                                                return (
                                                    <div key={option.code} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`${fieldConfig.key}-${option.code}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleCheckboxToggle(fieldConfig.key, option.code)}
                                                        />
                                                        <label htmlFor={`${fieldConfig.key}-${option.code}`} className="text-sm font-normal cursor-pointer">
                                                            {option.description || option.code}
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            } else if (fieldConfig.type === "checkbox" && fieldConfig.key === "deletedAt") {
                                // Special case for deletedAt filter
                                return (
                                    <div key={fieldConfig.key} className="space-y-2">
                                        <Label className="text-xs font-medium text-muted-foreground">{fieldConfig.label}</Label>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="deletedAt-null"
                                                    checked={isPendingValueActive("deletedAt", "null")}
                                                    onCheckedChange={() => handleCheckboxToggle("deletedAt", "null")}
                                                />
                                                <label htmlFor="deletedAt-null" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    Existing
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="deletedAt-notNull"
                                                    checked={isPendingValueActive("deletedAt", "notNull")}
                                                    onCheckedChange={() => handleCheckboxToggle("deletedAt", "notNull")}
                                                />
                                                <label htmlFor="deletedAt-notNull" className="text-sm font-normal cursor-pointer flex items-center gap-2">
                                                    <Archive className="h-4 w-4 text-orange-500" />
                                                    Deleted
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return null;
                        })}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
