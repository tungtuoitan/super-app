/**
 * MultiProject Task Flow Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 */

import { useMemo } from "react";
import { useProjectStore } from "@/features/project/store/useProject.store";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectDetailSelector } from "./useMultiProjectDetail.selector";

export const useMultiProjectTaskFlowSelector = () => {
    const { projects } = useProjectStore();
    const { flowNodes, flowEdges, editingNodeId, editingEdgeId, savedEdges, positionsLoaded, taskFlowTasks } = useMultiTaskFlowStore();
    const { filteredProjectIds } = useMultiProjectDetailSelector();

    const projectNameMap = new Map(projects.map((p) => [p.id, p.name]))

    /** ALL non-deleted tasks (TaskFlow shows every task regardless of active project filter) */
    const filteredTasks = taskFlowTasks.filter((t) => !t.deletedAt)

    const taskIdKey = filteredTasks.map((t) => t.id).sort((a, b) => a - b).join(",")

    /** Projects in the current multi-project view (for project picker in node header) */
    const filteredProjects = projects.filter((p) => filteredProjectIds.includes(p.id))

    /** All non-deleted projects, sorted: active first */
    const allProjects = 
        (() => {
            const all = projects.filter((p) => !p.deletedAt);
            return all.sort((a, b) => {
                const aActive = a.status === "active" ? 0 : 1;
                const bActive = b.status === "active" ? 0 : 1;
                return aActive - bActive || a.name.localeCompare(b.name);
            });
        })()
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
