/**
 * Tracking Graph Store
 * State management for tracking graph visualization
 */

import { createContext, useContext, useState, Dispatch, SetStateAction } from "react";
import type { DailyTracking, TrackingFilters, UniqueTrackingItem } from "@/types/tracking.types";

export interface TrackingGraphContextData {
    // Data
    dailyTrackings: DailyTracking[];
    setDailyTrackings: Dispatch<SetStateAction<DailyTracking[]>>;
    uniqueItems: UniqueTrackingItem[];
    setUniqueItems: Dispatch<SetStateAction<UniqueTrackingItem[]>>;

    // Filters
    filters: TrackingFilters;
    setFilters: Dispatch<SetStateAction<TrackingFilters>>;

    // Loading state
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;

    // Current folder being viewed
    currentFolderId: number | null;
    setCurrentFolderId: Dispatch<SetStateAction<number | null>>;
    currentFolderName: string;
    setCurrentFolderName: Dispatch<SetStateAction<string>>;
}

const defaultFilters: TrackingFilters = {
    year: null,
    month: null,
    selectedItems: [],
};

const trackingGraphDefaultValue: TrackingGraphContextData = {
    dailyTrackings: [],
    setDailyTrackings: () => {},
    uniqueItems: [],
    setUniqueItems: () => {},
    filters: defaultFilters,
    setFilters: () => {},
    isLoading: false,
    setIsLoading: () => {},
    currentFolderId: null,
    setCurrentFolderId: () => {},
    currentFolderName: "",
    setCurrentFolderName: () => {},
};

export const TrackingGraphStore = createContext<TrackingGraphContextData>(trackingGraphDefaultValue);

export const useTrackingGraphStore = () => {
    const ctx = useContext(TrackingGraphStore);
    if (!ctx) {
        throw new Error("useTrackingGraphStore requires TrackingGraphProvider");
    }
    return ctx;
};

export const TrackingGraphProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const [dailyTrackings, setDailyTrackings] = useState<DailyTracking[]>([]);
    const [uniqueItems, setUniqueItems] = useState<UniqueTrackingItem[]>([]);
    const [filters, setFilters] = useState<TrackingFilters>(defaultFilters);
    const [isLoading, setIsLoading] = useState(false);
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [currentFolderName, setCurrentFolderName] = useState("");

    return (
        <TrackingGraphStore.Provider
            value={{
                dailyTrackings,
                setDailyTrackings,
                uniqueItems,
                setUniqueItems,
                filters,
                setFilters,
                isLoading,
                setIsLoading,
                currentFolderId,
                setCurrentFolderId,
                currentFolderName,
                setCurrentFolderName,
            }}
        >
            {children}
        </TrackingGraphStore.Provider>
    );
};
