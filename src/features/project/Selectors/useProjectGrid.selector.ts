/**
 * ProjectGrid Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 * Reads from stores directly — NO params.
 */

import { useMemo } from "react";
import { useProjectStore } from "../store/useProject.store";
import { useGridControlStore } from "@/store/useGridControl.store";
import { useGeneralStore } from "@/store/General.store";

export const useProjectGridSelector = () => {
    const { projects } = useProjectStore();
    const { searchQuery } = useGridControlStore();
    const { registriesByType } = useGeneralStore();

    // Get status label from registry
    const getStatusLabel = useMemo(() => {
        const projectStatuses = registriesByType["project_status"] || [];
        return (statusCode: string) => {
            const status = projectStatuses.find((s) => s.code === statusCode);
            return status?.description || statusCode;
        };
    }, [registriesByType]);

    // Filter data by search query
    const filteredData = useMemo(() => {
        const sorted = [...projects].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        if (!searchQuery) return sorted;
        const query = searchQuery.toLowerCase();
        return sorted.filter(
            (p) =>
                p.name?.toLowerCase().includes(query) ||
                p.description?.toLowerCase().includes(query) ||
                String(p.id).includes(query),
        );
    }, [projects, searchQuery]);

    return {
        getStatusLabel,
        filteredData,
    };
};
