/**
 * GenericFilterPopup - Reusable filter popup for grid components
 * Supports multi-field filtering with checkboxes, date ranges, and standard registry options
 * Filters are stored in userProfile and applied on backend
 * Uses useGenericFilterHelper for business logic - no props needed
 */

import React, { useEffect } from "react";
import { Filter, X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Checkbox } from "@/Components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/Components/ui/radio-group";
import { Slider } from "@/Components/ui/slider";
import { Label } from "@/Components/ui/label";
import type { UserFilters, FilterFieldConfig, ViewFilter } from "@/types/common.types";
import { constants } from "@/utils/constants";
import { useGenericFilterHelper } from "@/hooks/index";
import { useAuthStore, useStandardRegistryStore } from "@/store/index";
import { useGridControlStore } from "@/store/grid/useGridControl.store";

// Helper functions for date range slider
const getMonthFromIndex = (index: number): string => {
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() - (24 - index), 1);
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
};

const getIndexFromMonth = (monthStr: string): number => {
    if (!monthStr) return 0;
    const [year, month] = monthStr.split("-").map(Number);
    const targetDate = new Date(year, month - 1, 1);
    const now = new Date();
    const currentDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const diffInMonths = (targetDate.getFullYear() - currentDate.getFullYear()) * 12 + (targetDate.getMonth() - currentDate.getMonth());
    return 24 + diffInMonths; // 24 = offset for 2 years back, can go to 25 (current + 1)
};

const formatMonthLabel = (monthStr: string): string => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-").map(Number);
    return `01/${month}/${year}`;
};

export function GenericFilterPopup() {
    const {
        isPendingValueActive,
        handleCheckboxToggle,
        handleRadioChange,
        handleDateRangeChange,
        applyFilter,
        getFieldErrors,
        isApplyDisabled,
    } = useGenericFilterHelper();
    const { registriesByType } = useStandardRegistryStore();
    const { moduleName, filterViewKey, uiFilters, setUIFilters } = useGridControlStore();
    const { $user } = useAuthStore();
    const [open, setOpen] = React.useState(false);

    const fieldErrors = getFieldErrors();
    const applyDisabled = isApplyDisabled();

    // Check if UI filters differ from default filters
    const defaultFilters = filterViewKey ? (constants.filters.defaults[filterViewKey] as ViewFilter) : {};

    const hasDiff = React.useMemo(() => {
        if (!filterViewKey) return false;

        // Compare each field in uiFilters with defaultFilters
        return Object.keys(uiFilters).some((key) => {
            const uiValue = (uiFilters as any)[key];
            const defaultValue = (defaultFilters as any)[key];
            return uiValue !== defaultValue;
        });
    },[filterViewKey, uiFilters]);

    useEffect(() => {
        // When popup opens, load current user filters into UI
        //* bắt buộc phải update ngay mỗi khi userFilters thay đổi, thì khi vào web ta mới thấy chấm trắng bên cạnh FilterIcon nếu có filter áp dụng
        if (filterViewKey) {
            setUIFilters($user.filters?.[filterViewKey] || {});
        }
    }, [filterViewKey, $user.filters]);

    // Handle popover open/close - reset filters when closing
    const togglePopup = (newOpen: boolean) => {
        setOpen(newOpen);

        // When opening, load current user filters into UI
        if (newOpen && filterViewKey) {
            setUIFilters($user.filters?.[filterViewKey] || {});
        }
    };

    // Don't render if filterViewKey is not set
    if (!filterViewKey) {
        return null;
    }

    // Get field configurations for this view
    const groups = (constants.filters.groups as any)[filterViewKey] as readonly FilterFieldConfig[];

    return (
        <Popover open={open} onOpenChange={togglePopup}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                    <Filter className="h-4 w-4" />
                    {hasDiff && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />}
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
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => applyFilter(true)}
                                disabled={!hasDiff}
                                className="h-7 mr-0 text-xs disabled:opacity-40 opacity-80 hover:opacity-100 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className="h-3 mr-[-2px]" />
                                Reset
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => applyFilter()}
                                disabled={applyDisabled}
                                className="h-6 px-2 text-xs bg-white/80 hover:bg-white pb-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </Button>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Filter Fields */}
                    <div className="space-y-4 max-h-96 overflow-y-auto overflow-x-hidden">
                        {groups.map((group) => {
                            const hasError = !!fieldErrors[group.key];

                            // ==========================================================
                            if ((group.type === "checkbox" || group.type === "radio") && group.standardRegistryType) {
                                // ==========================================================
                                // Checkbox group for standard registry fields (status, etc.)
                                const options = registriesByType[group.standardRegistryType] || [];

                                return (
                                    <div key={group.key} className="space-y-2 pb-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">{group.label}</Label>
                                            {hasError && <span className="text-xs text-red-500 font-medium">{fieldErrors[group.key]}</span>}
                                        </div>
                                        <div className="space-y-1.5">
                                            {options.map((option) => {
                                                const isChecked = isPendingValueActive(group.key, option.code);

                                                return (
                                                    <div key={option.code} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`${group.key}-${option.code}`}
                                                            checked={isChecked}
                                                            onCheckedChange={() => handleCheckboxToggle(group.key, option.code)}
                                                        />
                                                        <label
                                                            htmlFor={`${group.key}-${option.code}`}
                                                            className={`text-sm font-normal cursor-pointer ${isChecked ? "text-foreground" : "text-gray-400"}`}
                                                        >
                                                            {option.description || option.code}
                                                        </label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            }
                            // ==========================================================
                            else if (group.type === "radio" && group.key === "deletedAt") {
                                // ==========================================================
                                // Special case for deletedAt filter with radio buttons (noteGrid, wsGrid)
                                const currentValue = (uiFilters as any)[group.key] || "";

                                return (
                                    <div key={group.key} className="space-y-2 pb-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">{group.label}</Label>
                                            {hasError && <span className="text-xs text-red-500 font-medium">{fieldErrors[group.key]}</span>}
                                        </div>
                                        <RadioGroup value={currentValue} onValueChange={(value) => handleRadioChange("deletedAt", value)} className="">
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="null" id="deletedAt-null" />
                                                <label
                                                    htmlFor="deletedAt-null"
                                                    className={`text-sm font-normal cursor-pointer ${currentValue === "null" ? "text-foreground" : "text-gray-400"}`}
                                                >
                                                    Existing
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="notNull" id="deletedAt-notNull" />
                                                <label
                                                    htmlFor="deletedAt-notNull"
                                                    className={`text-sm font-normal cursor-pointer ${currentValue === "notNull" ? "text-foreground" : "text-gray-400"}`}
                                                >
                                                    Deleted
                                                </label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                );
                            }
                            // ==========================================================
                            else if (group.type === "checkbox" && group.key === "deletedAt") {
                                // ==========================================================
                                // Special case for deletedAt filter with checkboxes (workspace)
                                return (
                                    <div key={group.key} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">{group.label}</Label>
                                            {hasError && <span className="text-xs text-red-500 font-medium">{fieldErrors[group.key]}</span>}
                                        </div>
                                        <div className="space-y-1.5 ml-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="deletedAt-null"
                                                    checked={isPendingValueActive("deletedAt", "null")}
                                                    onCheckedChange={() => handleCheckboxToggle("deletedAt", "null")}
                                                />
                                                <label
                                                    htmlFor="deletedAt-null"
                                                    className={`text-sm font-normal cursor-pointer ${
                                                        isPendingValueActive("deletedAt", "null") ? "text-foreground" : "text-gray-400"
                                                    }`}
                                                >
                                                    Existing
                                                </label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="deletedAt-notNull"
                                                    checked={isPendingValueActive("deletedAt", "notNull")}
                                                    onCheckedChange={() => handleCheckboxToggle("deletedAt", "notNull")}
                                                />
                                                <label
                                                    htmlFor="deletedAt-notNull"
                                                    className={`text-sm font-normal cursor-pointer ${
                                                        isPendingValueActive("deletedAt", "notNull") ? "text-foreground" : "text-gray-400"
                                                    }`}
                                                >
                                                    Deleted
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            // ==========================================================
                            else if (group.type === "dateRange") {
                                // ==========================================================
                                // Date range slider (from current month - 24 months to current month + 1 month)
                                const filterValue = (uiFilters as any)[group.key] || "";
                                const [fromMonth, toMonth] = filterValue ? filterValue.split(",") : ["", ""];

                                // Default to full range if not set
                                const fromIndex = fromMonth ? getIndexFromMonth(fromMonth) : 0;
                                const toIndex = toMonth ? getIndexFromMonth(toMonth) : 25;

                                const displayFrom = fromMonth || getMonthFromIndex(0);
                                const displayTo = toMonth || getMonthFromIndex(25);

                                return (
                                    <div key={group.key} className="space-y-3 pb-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-medium text-muted-foreground">{group.label}</Label>
                                            {hasError && <span className="text-xs text-red-500 font-medium">{fieldErrors[group.key]}</span>}
                                        </div>
                                        <div className="space-y-2">
                                            <Slider
                                                min={0}
                                                max={25}
                                                step={1}
                                                minStepsBetweenThumbs={1}
                                                value={[fromIndex, toIndex]}
                                                onValueChange={(values) => {
                                                    let [from, to] = values;

                                                    // Ensure from is always <= to
                                                    if (from > to) {
                                                        [from, to] = [to, from];
                                                    }

                                                    const fromMonthStr = getMonthFromIndex(from);
                                                    const toMonthStr = getMonthFromIndex(to);
                                                    handleDateRangeChange(group.key, fromMonthStr, toMonthStr);
                                                }}
                                                className="w-full"
                                            />
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>{formatMonthLabel(displayFrom)}</span>
                                                <span>{formatMonthLabel(displayTo)}</span>
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
