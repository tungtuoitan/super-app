/**
 * MultiProject Task Flow Node Helper
 * Node-specific callbacks: rename, create (temp → persist), change project/status.
 */


import type { Node } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useMpTaskStore } from "@/features/multiProject/store/useMpTask.store";
import { useAuthStore } from "@/shared";
import { useConsoleHelper } from "@/shared";
import { taskService } from "@/features/taskDetail";
import { flowService } from "@/shared";
import { useMultiProjectTaskFlowProcessHelper } from "./useMultiProjectTaskFlowProcess.helper";
import { useMultiProjectTaskFlowNodeRenameHelper } from "./useMultiProjectTaskFlowNodeRename.helper";
import { useMultiProjectTaskFlowNodeUpdateHelper } from "./useMultiProjectTaskFlowNodeUpdate.helper";
import type { TaskFlowNodeData, FlowEdgeData } from "../../types/multiProjectTaskFlow.type";
import type { Task } from "@/features/taskDetail";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useDebugLog } from "@/shared";

export const useMultiProjectTaskFlowNodeHelper = () => {
    const { setFlowNodes, setEditingNodeId, taskFlowTasks, setTaskFlowTasks, savedEdges, setSavedEdges, setFlowEdges } = useMultiTaskFlowStore();
    const { handleToggleProcess } = useMultiProjectTaskFlowProcessHelper();
    const { filteredTasks, flowNodes, projectNameMap, filteredProjectIds, allProjects } = useMultiProjectTaskFlowSelector();
    const { tasks, setTasks } = useMpTaskStore();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();
    const { handleRenameStart, handleRenameCancel, handleRenameConfirm } = useMultiProjectTaskFlowNodeRenameHelper();
    const { handleChangeProject, handleChangeStatus } = useMultiProjectTaskFlowNodeUpdateHelper();
    const debugLog = useDebugLog();

    // ── Add task at position (right-click canvas) ─────────────────────────
    // Only creates a temp node — backend call happens on rename confirm.

    const handleAddTaskAtPosition =
        (posX: number, posY: number) => {
            // Determine project: prefer nearest existing task node; fall back to first filtered project.
            // Always skip deleted projects.
            const nonDeletedProjectIds = new Set(allProjects.filter((p) => !p.deletedAt).map((p) => p.id));
            let projectId: number | null = null;
            let projectName = "";

            const tasksOnNonDeletedProjects = filteredTasks.filter((t) => nonDeletedProjectIds.has(t.projectId));
            if (tasksOnNonDeletedProjects.length > 0) {
                let nearestTask = tasksOnNonDeletedProjects[0];
                if (flowNodes.length > 0) {
                    let minDist = Infinity;
                    for (const n of flowNodes) {
                        const t = (n.data as TaskFlowNodeData).task;
                        if (!t || !nonDeletedProjectIds.has(t.projectId)) continue;
                        const dx = n.position.x - posX;
                        const dy = n.position.y - posY;
                        const dist = dx * dx + dy * dy;
                        if (dist < minDist) {
                            minDist = dist;
                            nearestTask = t;
                        }
                    }
                }
                projectId = nearestTask.projectId;
                projectName = projectNameMap.get(nearestTask.projectId) ?? "";
            } else {
                const firstFilteredNonDeleted = filteredProjectIds.find((id) => nonDeletedProjectIds.has(id));
                if (firstFilteredNonDeleted) {
                    projectId = firstFilteredNonDeleted;
                    projectName = projectNameMap.get(projectId) ?? "";
                } else {
                    const firstNonDeleted = allProjects.find((p) => !p.deletedAt);
                    if (firstNonDeleted) {
                        projectId = firstNonDeleted.id;
                        projectName = firstNonDeleted.name;
                    }
                }
            }

            if (!projectId) {
                return;
            }

            const tempId = `temp-node-${Date.now()}`;

            const tempNode: Node<TaskFlowNodeData> = {
                id: tempId,
                type: "taskFlowNode",
                position: { x: posX, y: posY },
                data: {
                    task: {
                        id: 0,
                        projectId,
                        title: "",
                        parentTaskId: null,
                        type: "task",
                        taskType: "personal",
                        status: "open",
                        priority: "medium",
                        processJson: null,
                        checklistJson: null,
                        customTabsJson: null,
                        isMilestone: false,
                        description: null,
                        startDate: null,
                        endDate: null,
                        orderIndex: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        deletedAt: null,
                    } as Task,
                    projectName,
                },
            };

            // Deselect all existing nodes, then add new temp node
            setFlowNodes((prev) => [
                ...prev.map((n) => (n.selected ? { ...n, selected: false } : n)),
                tempNode,
            ]);
            setEditingNodeId(tempId);
        }

    // ── Delete nodes ─────────────────────────────────────────────────────────

    const handleDeleteNodes =
        async (nodeIds: string[]) => {
            const unlocked = nodeIds.filter((id) => !id.startsWith("temp-node-") && !isNodeLocked(id));
            if (unlocked.length === 0) return;

            const taskIds = unlocked.map((id) => parseInt(id, 10));
            const tasksToDelete = taskFlowTasks.filter((t) => taskIds.includes(t.id));
            const gridTasksToDelete = tasks.filter((t) => taskIds.includes(t.id));
            const nodesToRestore = flowNodes.filter((n) => unlocked.includes(n.id));

            const connectedEdgeIds = new Set(
                savedEdges
                    .filter((e) => unlocked.includes(e.source) || unlocked.includes(e.target))
                    .map((e) => e.id),
            );
            const connectedEdges = savedEdges.filter((e) => connectedEdgeIds.has(e.id));

            setFlowNodes((prev) => prev.filter((n) => !unlocked.includes(n.id)));
            setTaskFlowTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));
            setTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));
            setFlowEdges((prev) => prev.filter((e) => !connectedEdgeIds.has(e.id)));
            setSavedEdges((prev) => prev.filter((e) => !connectedEdgeIds.has(e.id)));

            try {
                debugLog.log("task-upsert", "flow-hard-delete-nodes", {
                    taskIds,
                    source: "useMultiProjectTaskFlowNode.deleteNodes",
                });
                const result = await taskService._deleteTaskBatch($user.userToken, taskIds);
                if (!result.success) throw new Error(result.message);

                const edgesToDelete = connectedEdges.filter((e) => (e.data as FlowEdgeData)?.edgeId);
                if (edgesToDelete.length > 0) {
                    flowService._upsertEdges(
                        $user.userToken,
                        edgesToDelete.map((e) => ({
                            id: (e.data as FlowEdgeData).edgeId,
                            sourceId: parseInt(e.source, 10),
                            targetId: parseInt(e.target, 10),
                            sourceHandle: e.sourceHandle ?? "bottom",
                            targetHandle: e.targetHandle ?? "top",
                            deletedAt: new Date().toISOString(),
                        })),
                    ).catch(() => {});
                }

                _console.success(`Deleted ${tasksToDelete.length} task(s)`);
            } catch {
                setFlowNodes((prev) => [...nodesToRestore, ...prev]);
                setTaskFlowTasks((prev) => [...tasksToDelete, ...prev]);
                setTasks((prev) => [...gridTasksToDelete, ...prev]);
                setSavedEdges((prev) => [...connectedEdges, ...prev]);
                _console.error("Failed to delete tasks");
            }
        }

    return {
        handleRenameStart,
        handleRenameCancel,
        handleRenameConfirm,
        handleAddTaskAtPosition,
        handleChangeProject,
        handleChangeStatus,
        handleDeleteNodes,
        handleToggleProcess,
        isNodeLocked,
    };
};
