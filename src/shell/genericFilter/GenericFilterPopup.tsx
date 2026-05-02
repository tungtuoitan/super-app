/**
 * GenericFilterPopup - Reusable filter popup for grid components
 * Supports multi-field filtering with checkboxes, date ranges, and standard registry options
 * Filters are stored in userProfile and applied on backend
 * Uses useGenericFilterHelper for business logic - no props needed
 */

import React, { useEffect } from "react";
import { Filter, X, Check, RotateCcw } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger, Checkbox, RadioGroup, RadioGroupItem, Slider, Label, constants, useAuthStore, useStandardRegistrySelector } from "@/shared";
import { useGenericFilterHelper } from "./useGenericFilterHelper";
import { useSideBarStore } from "../store/SideBar.store";
import { filterRegistry } from "./filterRegistry";
import { getMonthFromIndex, getIndexFromMonth, formatMonthLabel } from "@/shared";
import { FilterFieldConfig, ViewFilter } from "./filter.types";

// ── Sub-components ────────────────────────────────────────────────────────────

interface FilterFieldErrorProps {
    label: string;
    error?: string;
}

function FilterFieldHeader({ label, error }: FilterFieldErrorProps) {
    return (
        <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
            {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
        </div>
    );
}

interface FilterStandardRegistryFieldProps {
    group: FilterFieldConfig;
    options: Array<{ code: string; description?: string }>;
    error?: string;
    isValueActive: (key: string, value: string) => boolean;
    onToggle: (key: string, value: string) => void;
}

/**
 * Standard registry field (e.g. Status) rendered as checkboxes.
 * Used for: statusCode in noteGrid, wsGrid, workspace.
 */
function FilterStandardRegistryField({ group, options, error, isValueActive, onToggle }: FilterStandardRegistryFieldProps) {
    return (
        <div className="space-y-2 pb-2">
            <FilterFieldHeader label={group.label} error={error} />
            <div className="space-y-1.5">
                {options.map((option) => {
                    const isChecked = isValueActive(group.key, option.code);
                    return (
                        <div key={option.code} className="flex items-center space-x-2">
                            <Checkbox
                                id={`${group.key}-${option.code}`}
                                checked={isChecked}
                                onCheckedChange={() => onToggle(group.key, option.code)}
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

interface FilterDeletedAtRadioProps {
    group: FilterFieldConfig;
    currentValue: string;
    error?: string;
    onChange: (field: string, value: string) => void;
}

/**
 * deletedAt field rendered as radio buttons (mutually exclusive).
 * User can select ONLY ONE: Existing OR Deleted.
 * Used for: noteGrid, wsGrid.
 */
function FilterDeletedAtRadio({ group, currentValue, error, onChange }: FilterDeletedAtRadioProps) {
    return (
        <div className="space-y-2 pb-2">
            <FilterFieldHeader label={group.label} error={error} />
            <RadioGroup value={currentValue} onValueChange={(value) => onChange("deletedAt", value)} className="">
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

interface FilterDeletedAtCheckboxProps {
    group: FilterFieldConfig;
    error?: string;
    isValueActive: (key: string, value: string) => boolean;
    onToggle: (key: string, value: string) => void;
}

/**
 * deletedAt field rendered as checkboxes (multi-select).
 * User can select BOTH Existing AND/OR Deleted.
 * VALIDATION: must always include "Existing" (null).
 * Used for: workspace.
 */
function FilterDeletedAtCheckbox({ group, error, isValueActive, onToggle }: FilterDeletedAtCheckboxProps) {
    return (
        <div className="space-y-2">
            <FilterFieldHeader label={group.label} error={error} />
            <div className="space-y-1.5 ml-2">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="deletedAt-null"
                        checked={isValueActive("deletedAt", "null")}
                        onCheckedChange={() => onToggle("deletedAt", "null")}
                    />
                    <label
                        htmlFor="deletedAt-null"
                        className={`text-sm font-normal cursor-pointer ${
                            isValueActive("deletedAt", "null") ? "text-foreground" : "text-gray-400"
                        }`}
                    >
                        Existing
                    </label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="deletedAt-notNull"
                        checked={isValueActive("deletedAt", "notNull")}
                        onCheckedChange={() => onToggle("deletedAt", "notNull")}
                    />
                    <label
                        htmlFor="deletedAt-notNull"
                        className={`text-sm font-normal cursor-pointer ${
                            isValueActive("deletedAt", "notNull") ? "text-foreground" : "text-gray-400"
                        }`}
                    >
                        Deleted
                    </label>
                </div>
            </div>
        </div>
    );
}

interface FilterDateRangeProps {
    group: FilterFieldConfig;
    filterValue: string;
    error?: string;
    onChange: (key: string, from: string, to: string) => void;
}

/**
 * Date range slider.
 * Range: 24 months ago to current month + 1.
 * Used for: createdAt in noteGrid, wsGrid.
 */
function FilterDateRange({ group, filterValue, error, onChange }: FilterDateRangeProps) {
    const [fromMonth, toMonth] = filterValue ? filterValue.split(",") : ["", ""];

    // Default to full range if not set
    const fromIndex = fromMonth ? getIndexFromMonth(fromMonth) : 0;
    const toIndex = toMonth ? getIndexFromMonth(toMonth) : 25;
    const displayFrom = fromMonth || getMonthFromIndex(0);
    const displayTo = toMonth || getMonthFromIndex(25);

    const handleValueChange = (values: number[]) => {
        let [from, to] = values;
        if (from > to) [from, to] = [to, from];
        onChange(group.key, getMonthFromIndex(from), getMonthFromIndex(to));
    };

    return (
        <div className="space-y-3 pb-2">
            <FilterFieldHeader label={group.label} error={error} />
            <div className="space-y-2">
                <Slider
                    min={0}
                    max={25}
                    step={1}
                    minStepsBetweenThumbs={1}
                    value={[fromIndex, toIndex]}
                    onValueChange={handleValueChange}
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

// ── GenericFilterPopup ────────────────────────────────────────────────────────

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
    const { moduleName, filterViewKey, uiFilters, setUIFilters } = useSideBarStore();
    const { $user } = useAuthStore();
    const [open, setOpen] = React.useState(false);

    const fieldErrors = getFieldErrors();
    const applyDisabled = isApplyDisabled();
    const { registriesByType } = useStandardRegistrySelector();

    // Check if UI filters differ from default filters
    const defaultFilters = filterViewKey ? filterRegistry.getDefaultFilters(filterViewKey) : {};
    const hasDiff = filterViewKey
        ? Object.keys(uiFilters).some((key) => {
              const uiValue = (uiFilters as Record<string, unknown>)[key];
              const defaultValue = (defaultFilters as Record<string, unknown>)[key];
              return uiValue !== defaultValue;
          })
        : false;

    useEffect(() => {
        // Must update immediately whenever userFilters change so the dot indicator
        // next to FilterIcon reflects the applied filter when the page loads.
        if (filterViewKey) {
            setUIFilters($user.filters?.[filterViewKey] || filterRegistry.getDefaultFilters(filterViewKey) as ViewFilter);
        }
    }, [filterViewKey, $user.filters]);

    const togglePopup = (newOpen: boolean) => {
        setOpen(newOpen);
        if (newOpen && filterViewKey) {
            setUIFilters($user.filters?.[filterViewKey] || filterRegistry.getDefaultFilters(filterViewKey) as ViewFilter);
        }
    };

    // Don't render if filterViewKey is not set
    if (!filterViewKey) {
        return null;
    }

    const fields = filterRegistry.getFieldConfigs(filterViewKey);

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
                        {fields.map((group) => {
                            const error = fieldErrors[group.key];

                            if (group.type === "checkbox" && group.standardRegistryType) {
                                return (
                                    <FilterStandardRegistryField
                                        key={group.key}
                                        group={group}
                                        options={registriesByType[group.standardRegistryType] || []}
                                        error={error}
                                        isValueActive={isPendingValueActive}
                                        onToggle={handleCheckboxToggle}
                                    />
                                );
                            }
                            if (group.type === "radio" && group.key === "deletedAt") {
                                return (
                                    <FilterDeletedAtRadio
                                        key={group.key}
                                        group={group}
                                        currentValue={(uiFilters as Record<string, string>)[group.key] || ""}
                                        error={error}
                                        onChange={handleRadioChange}
                                    />
                                );
                            }
                            if (group.type === "checkbox" && group.key === "deletedAt") {
                                return (
                                    <FilterDeletedAtCheckbox
                                        key={group.key}
                                        group={group}
                                        error={error}
                                        isValueActive={isPendingValueActive}
                                        onToggle={handleCheckboxToggle}
                                    />
                                );
                            }
                            if (group.type === "dateRange") {
                                return (
                                    <FilterDateRange
                                        key={group.key}
                                        group={group}
                                        filterValue={(uiFilters as Record<string, string>)[group.key] || ""}
                                        error={error}
                                        onChange={handleDateRangeChange}
                                    />
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
