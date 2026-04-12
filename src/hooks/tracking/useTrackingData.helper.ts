/**
 * useTrackingData Helper
 * Data fetching and parsing for tracking graph
 */

import { useCallback } from "react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useWorkspaceStore } from "@/store/workspace/Workspace.store";
import { useTrackingGraphStore } from "@/store/tracking/TrackingGraph.store";
import { noteService } from "@/features/note/service/note.service";
import { parseNoteToDailyTracking, extractUniqueItems, getAvailableYears } from "@/utils/tracking-parser.utils";
import type { DailyTracking } from "@/types/tracking.types";
import type { WorkspaceNoteItem } from "@/types/workspace-v2.types";

export const useTrackingDataHelper = () => {
    const { $user } = useAuthStore();
    const { currentWorkspace } = useWorkspaceStore();
    const {
        setDailyTrackings,
        setUniqueItems,
        setIsLoading,
        setFilters,
        setCurrentFolderId,
        setCurrentFolderName,
    } = useTrackingGraphStore();

    /**
     * Get all descendant note IDs from a folder recursively
     */
    const getDescendantNoteItems = useCallback(
        (folderId: number): WorkspaceNoteItem[] => {
            if (!currentWorkspace?.flatData) return [];

            const flatData = currentWorkspace.flatData;
            const noteItems: WorkspaceNoteItem[] = [];

            // Find the folder's workspace item ID
            const folderItem = flatData.find(
                (item) => item.entityType === 2 && item.entityId === folderId
            );
            if (!folderItem) return [];

            // Recursively collect all note items under this folder
            const collectNotes = (parentWorkspaceItemId: number) => {
                for (const item of flatData) {
                    if (item.parentId === parentWorkspaceItemId) {
                        if (item.entityType === 3) {
                            // Note
                            noteItems.push(item as WorkspaceNoteItem);
                        } else if (item.entityType === 2) {
                            // Folder - recurse
                            collectNotes(item.id);
                        }
                    }
                }
            };

            collectNotes(folderItem.id);
            return noteItems;
        },
        [currentWorkspace?.flatData]
    );

    /**
     * Load tracking data from a folder
     */
    const loadTrackingData = useCallback(
        async (folderId: number, folderName: string) => {
            if (!$user?.userToken || !currentWorkspace) {
                console.warn("Cannot load tracking data: missing token or workspace");
                return;
            }

            setIsLoading(true);
            setCurrentFolderId(folderId);
            setCurrentFolderName(folderName);

            try {
                // Get all note items under this folder
                const noteItems = getDescendantNoteItems(folderId);

                if (noteItems.length === 0) {
                    setDailyTrackings([]);
                    setUniqueItems([]);
                    setFilters({ year: null, month: null, selectedItems: [] });
                    setIsLoading(false);
                    return;
                }

                // Get workspace item IDs for fetching full note content
                const workspaceItemIds = noteItems.map((item) => item.id).join(",");

                // Fetch notes with full content
                const result = await noteService._getNotes($user.userToken, {
                    workspaceItemIds,
                    pageSize: 1000, // Get all notes
                    deletedAt: "null", // Only non-deleted notes
                });

                const notes = result.data || [];

                // Parse each note to daily tracking
                const trackings: DailyTracking[] = [];

                for (const noteDTO of notes) {
                    const tracking = parseNoteToDailyTracking(
                        noteDTO.id,
                        noteDTO.name,
                        noteDTO.description || ""
                    );
                    if (tracking) {
                        trackings.push(tracking);
                    }
                }

                // Sort by date (newest first)
                trackings.sort((a, b) => b.date.getTime() - a.date.getTime());

                // Extract unique items
                const uniqueItems = extractUniqueItems(trackings);

                // Set initial filters
                const years = getAvailableYears(trackings);
                const latestYear = years.length > 0 ? years[0] : null;

                // Select top 5 items by default
                const defaultSelectedItems = uniqueItems.slice(0, 5).map((item) => item.key);

                setDailyTrackings(trackings);
                setUniqueItems(uniqueItems);
                setFilters({
                    year: latestYear,
                    month: null,
                    selectedItems: defaultSelectedItems,
                });
            } catch (error) {
                console.error("Failed to load tracking data:", error);
                setDailyTrackings([]);
                setUniqueItems([]);
            } finally {
                setIsLoading(false);
            }
        },
        [$user?.userToken, currentWorkspace, getDescendantNoteItems, setDailyTrackings, setUniqueItems, setFilters, setIsLoading, setCurrentFolderId, setCurrentFolderName]
    );

    return {
        loadTrackingData,
        getDescendantNoteItems,
    };
};
