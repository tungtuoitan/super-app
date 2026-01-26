/**
 * useTrackingGraph Helper
 * Tab management and chart data computation for tracking graph
 */

import { useMemo, useCallback } from "react";
import { useEditorTabsStore } from "@/store/index";
import { useTrackingGraphStore } from "@/store/tracking/TrackingGraph.store";
import { useTrackingDataHelper } from "./useTrackingData.helper";
import { constants } from "@/utils/constants";
import {
    filterTrackings,
    convertToChartData,
    getAvailableYears,
    getAvailableMonths,
    calculateTrackingStats,
    groupItemsBySection,
} from "@/utils/tracking-parser.utils";
import type { TrackingGraphTabData } from "@/types/tracking.types";
import type { BaseTab } from "@/types/editor/tab.types";

export const useTrackingGraphHelper = () => {
    const { openTabs, setOpenTabs, setActiveTabId, activeTabId } = useEditorTabsStore();
    const { dailyTrackings, uniqueItems, filters, setFilters } = useTrackingGraphStore();
    const { loadTrackingData } = useTrackingDataHelper();

    /**
     * Open a tracking graph tab for a folder
     */
    const openTrackingGraphTab = useCallback(
        async (folderId: number, folderName: string, workspaceId: number) => {
            // Check if tab already exists
            const existingTab = openTabs.find(
                (tab) =>
                    tab.type === constants.vscode.tab.tabTypes.trackingGraph &&
                    (tab.data as TrackingGraphTabData).folderId === folderId
            );

            if (existingTab) {
                // Tab exists, just activate it
                setActiveTabId(existingTab.id);
                return;
            }

            // Create tab data
            const tabData: TrackingGraphTabData = {
                id: Date.now(),
                name: `Tracking: ${folderName}`,
                folderId,
                folderName,
                workspaceId,
            };

            // Create new tab
            const newTab: BaseTab = {
                id: `trackingGraph-${folderId}-${Date.now()}`,
                type: constants.vscode.tab.tabTypes.trackingGraph,
                data: tabData,
                data0: tabData,
                title: `Tracking: ${folderName}`,
                hasUnsavedChanges: false,
            };

            // Add tab and activate
            const newTabs = [...openTabs, newTab];
            setOpenTabs(newTabs);
            setActiveTabId(newTab.id);

            // Load tracking data
            await loadTrackingData(folderId, folderName);
        },
        [openTabs, setOpenTabs, setActiveTabId, loadTrackingData]
    );

    /**
     * Close the current tracking graph tab
     */
    const closeTrackingGraphTab = useCallback(
        (tabId: string) => {
            const newTabs = openTabs.filter((tab) => tab.id !== tabId);
            setOpenTabs(newTabs);

            if (activeTabId === tabId) {
                // Switch to last tab or null
                const lastTab = newTabs[newTabs.length - 1];
                setActiveTabId(lastTab?.id || null);
            }
        },
        [openTabs, setOpenTabs, activeTabId, setActiveTabId]
    );

    /**
     * Filtered trackings based on current filters
     */
    const filteredTrackings = useMemo(() => {
        return filterTrackings(dailyTrackings, filters.year, filters.month);
    }, [dailyTrackings, filters.year, filters.month]);

    /**
     * Chart data for Recharts
     */
    const chartData = useMemo(() => {
        if (filters.selectedItems.length === 0) return [];
        return convertToChartData(filteredTrackings, filters.selectedItems, uniqueItems);
    }, [filteredTrackings, filters.selectedItems, uniqueItems]);

    /**
     * Available years for filter
     */
    const availableYears = useMemo(() => {
        return getAvailableYears(dailyTrackings);
    }, [dailyTrackings]);

    /**
     * Available months for filter (based on selected year)
     */
    const availableMonths = useMemo(() => {
        return getAvailableMonths(dailyTrackings, filters.year);
    }, [dailyTrackings, filters.year]);

    /**
     * Items grouped by section (from latest tracking file)
     */
    const groupedItems = useMemo(() => {
        return groupItemsBySection(uniqueItems);
    }, [uniqueItems]);

    /**
     * Statistics for the filtered data
     */
    const stats = useMemo(() => {
        return calculateTrackingStats(filteredTrackings, uniqueItems);
    }, [filteredTrackings, uniqueItems]);

    /**
     * Update filter value
     */
    const updateFilter = useCallback(
        (key: keyof typeof filters, value: any) => {
            setFilters((prev) => {
                const newFilters = { ...prev, [key]: value };

                // Reset month when year changes
                if (key === "year") {
                    newFilters.month = null;
                }

                return newFilters;
            });
        },
        [setFilters]
    );

    /**
     * Toggle an item in selectedItems
     */
    const toggleSelectedItem = useCallback(
        (itemKey: string) => {
            setFilters((prev) => {
                const currentSelected = prev.selectedItems;
                const isSelected = currentSelected.includes(itemKey);

                return {
                    ...prev,
                    selectedItems: isSelected
                        ? currentSelected.filter((k) => k !== itemKey)
                        : [...currentSelected, itemKey],
                };
            });
        },
        [setFilters]
    );

    /**
     * Select all items
     */
    const selectAllItems = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            selectedItems: uniqueItems.map((item) => item.key),
        }));
    }, [setFilters, uniqueItems]);

    /**
     * Deselect all items
     */
    const deselectAllItems = useCallback(() => {
        setFilters((prev) => ({
            ...prev,
            selectedItems: [],
        }));
    }, [setFilters]);

    /**
     * Check if all items in a group are selected
     */
    const isGroupFullySelected = useCallback(
        (section: string): boolean => {
            const group = groupedItems.find((g) => g.section === section);
            if (!group || group.items.length === 0) return false;
            return group.items.every((item) => filters.selectedItems.includes(item.key));
        },
        [groupedItems, filters.selectedItems]
    );

    /**
     * Check if some (but not all) items in a group are selected
     */
    const isGroupPartiallySelected = useCallback(
        (section: string): boolean => {
            const group = groupedItems.find((g) => g.section === section);
            if (!group || group.items.length === 0) return false;
            const selectedCount = group.items.filter((item) =>
                filters.selectedItems.includes(item.key)
            ).length;
            return selectedCount > 0 && selectedCount < group.items.length;
        },
        [groupedItems, filters.selectedItems]
    );

    /**
     * Toggle all items in a group
     */
    const toggleGroup = useCallback(
        (section: string) => {
            const group = groupedItems.find((g) => g.section === section);
            if (!group) return;

            const groupKeys = group.items.map((item) => item.key);
            const allSelected = groupKeys.every((key) => filters.selectedItems.includes(key));

            setFilters((prev) => {
                if (allSelected) {
                    // Deselect all items in group
                    return {
                        ...prev,
                        selectedItems: prev.selectedItems.filter((key) => !groupKeys.includes(key)),
                    };
                } else {
                    // Select all items in group
                    const newSelected = new Set([...prev.selectedItems, ...groupKeys]);
                    return {
                        ...prev,
                        selectedItems: Array.from(newSelected),
                    };
                }
            });
        },
        [groupedItems, filters.selectedItems, setFilters]
    );

    /**
     * Check if an item is negative
     */
    const isItemNegative = useCallback(
        (itemKey: string): boolean => {
            const item = uniqueItems.find((i) => i.key === itemKey);
            return item?.isNegative ?? false;
        },
        [uniqueItems]
    );

    /**
     * Get item display name
     */
    const getItemDisplayName = useCallback(
        (itemKey: string): string => {
            const item = uniqueItems.find((i) => i.key === itemKey);
            return item?.text ?? itemKey;
        },
        [uniqueItems]
    );

    return {
        // Tab management
        openTrackingGraphTab,
        closeTrackingGraphTab,

        // Data
        filteredTrackings,
        chartData,
        availableYears,
        availableMonths,
        stats,
        groupedItems,

        // Filter actions
        updateFilter,
        toggleSelectedItem,
        selectAllItems,
        deselectAllItems,
        toggleGroup,
        isGroupFullySelected,
        isGroupPartiallySelected,

        // Utilities
        isItemNegative,
        getItemDisplayName,
    };
};
