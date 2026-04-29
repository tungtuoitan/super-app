/**
 * ProjectGrid Headless
 * Side-effects only (useEffect). No UI.
 * Handles container resize observation and initial data loading.
 */

import { useEffect } from "react";
import { useProjectStore } from "../store/useProject.store";
import { useProjectGridHelper } from "./useProjectGrid.helper";
import { useProjectTabHelper } from "./useProjectTab.helper";
import {useAuthStore} from "@/shell";

export const useProjectGridHeadless = () => {
    const { containerRef, setContainerWidth, projectGridPagination } = useProjectStore();
    const { $user } = useAuthStore();
    const { loadProjects } = useProjectGridHelper();
    const { openMultiProjectTab } = useProjectTabHelper();

    // Auto-open pinned MultiProject tab on mount
    useEffect(() => {
        openMultiProjectTab([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update container width on resize
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Load data when user is ready
    useEffect(() => {
        if (!$user.userId) return;
        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userId, $user.userToken, $user.filters?.projectGrid, projectGridPagination.pageIndex, projectGridPagination.pageSize]);
};
