/**
 * MultiProject Task Flow Selector
 * Derived values only (useMemo). No side-effects, no callbacks.
 */

import { useMemo } from "react";
import { useTaskGridStore } from "@/store/task/useTask.store";
import { useProjectStore } from "@/store/project/useProject.store";
import { useMultiTaskFlowStore } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectDetailSelector } from "./useMultiProjectDetail.selector";

export const useMultiProjectTaskFlowSelector = () => {
    const { tasks, allTasks } = useTaskGridStore();
    const { projects } = useProjectStore();
    const { flowNodes, flowEdges, editingNodeId, editingEdgeId, savedEdges, positionsLoaded } = useMultiTaskFlowStore();
    const { filteredProjectIds } = useMultiProjectDetailSelector();

    const projectNameMap = useMemo(
        () => new Map(projects.map((p) => [p.id, p.name])),
        [projects],
    );

    // TaskFlow always shows ALL tasks (no status/priority filter) — only filter by project & not deleted
    const flowSourceTasks = allTasks.length > 0 ? allTasks : tasks;

    const filteredTasks = useMemo(
        () => flowSourceTasks.filter((t) => filteredProjectIds.includes(t.projectId) && !t.deletedAt),
        [flowSourceTasks, filteredProjectIds],
    );

    /** Stable key — changes when the set of task IDs changes */
    const taskIdKey = useMemo(
        () => filteredTasks.map((t) => t.id).sort((a, b) => a - b).join(","),
        [filteredTasks],
    );

    /** Projects in the current multi-project view (for project picker) */
    const filteredProjects = useMemo(
        () => projects.filter((p) => filteredProjectIds.includes(p.id)),
        [projects, filteredProjectIds],
    );

    /** All non-deleted projects, sorted: active first */
    const allProjects = useMemo(
        () => {
            const all = projects.filter((p) => !p.deletedAt);
            return all.sort((a, b) => {
                const aActive = a.status === "active" ? 0 : 1;
                const bActive = b.status === "active" ? 0 : 1;
                return aActive - bActive || a.name.localeCompare(b.name);
            });
        },
        [projects],
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
