/**
 * MultiProject Task Flow Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/features/project";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectDetailSelector } from "./useMultiProjectDetail.selector";

export const useMultiProjectTaskFlowSelector = () => {
    const { projects } = useProjectStore();
    const { flowNodes, flowEdges, editingNodeId, editingEdgeId, savedEdges, positionsLoaded, taskFlowTasks, allProjectsForPicker } = useMultiTaskFlowStore();
    const { filteredProjectIds } = useMultiProjectDetailSelector();

    const projectNameMap = useMemo(
        () => new Map(projects.map((p) => [p.id, p.name])),
        [projects],
    );

    /** ALL non-deleted tasks (TaskFlow shows every task regardless of active project filter) */
    const filteredTasks = useMemo(
        () => taskFlowTasks.filter((t) => !t.deletedAt),
        [taskFlowTasks],
    );

    const taskIdKey = useMemo(
        () => filteredTasks.map((t) => t.id).sort((a, b) => a - b).join(","),
        [filteredTasks],
    );

    /** Projects in the current multi-project view (for project picker in node header) */
    const filteredProjects = useMemo(
        () => projects.filter((p) => filteredProjectIds.includes(p.id)),
        [projects, filteredProjectIds],
    );

    /** All projects including deleted, sorted: active → inactive → deleted */
    const allProjects = useMemo(
        () => [...allProjectsForPicker].sort((a, b) => {
            const aScore = a.deletedAt ? 2 : a.status === "active" ? 0 : 1;
            const bScore = b.deletedAt ? 2 : b.status === "active" ? 0 : 1;
            return aScore - bScore || a.name.localeCompare(b.name);
        }),
        [allProjectsForPicker],
    );

    return {
        flowNodes,
        flowEdges,
        editingNodeId,
        editingEdgeId,
        savedEdges,
        positionsLoaded,
        filteredTasks,
        filteredProjects,
        allProjects,
        projectNameMap,
        taskIdKey,
        filteredProjectIds,
    };
};
