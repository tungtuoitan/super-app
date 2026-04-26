/**
 * MultiProject Task Flow Node Helper
 * Node-specific callbacks: rename, create (temp → persist), change project/status.
 */


import type { Node } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useTaskGridStore } from "@/features/task/store/useTask.store";
import { useAuthStore } from "@/store/Auth.store";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { taskService } from "@/features/task/service/task.service";
import type { TaskDTO } from "@/features/task/service/task.service";
import { transformTaskData } from "@/features/task/utils/TaskDetail.utils";
import { flowService } from "@/features/multiProject/service/flow.service";
import { toLocalISOString } from "@/utils/date.utils";
import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import type { Task } from "@/features/task/types/task.types";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useProjectTaskFolderHelper } from "@/features/project/hooks/useProjectTaskFolderHelper";
import { debugLog } from "@/shell/hooks/useDebugLog";

export const useMultiProjectTaskFlowNodeHelper = () => {
    const { setFlowNodes, setEditingNodeId } = useMultiTaskFlowStore();
    const { filteredTasks, flowNodes: currentFlowNodes, projectNameMap } = useMultiProjectTaskFlowSelector();
    const { tasks, setTasks } = useTaskGridStore();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();
    const { createTaskFolder } = useProjectTaskFolderHelper();

    // ── Rename ──────────────────────────────────────────────────────────────

    const handleRenameStart = (nodeId: string) => setEditingNodeId(nodeId)
    const handleRenameCancel = () => setEditingNodeId(null)

    const handleRenameConfirm = 
        async (nodeId: string, newTitle: string) => {
            const isTempNode = nodeId.startsWith("temp-node-");
            const trimmed = newTitle.trim();

            // ── Temp node: create task or discard ───────────────────────────
            if (isTempNode) {
                setEditingNodeId(null);
                if (!trimmed) {
                    setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
                    return;
                }

                const tempNode = currentFlowNodes.find((n) => n.id === nodeId);
                if (!tempNode) return;
                const tempData = tempNode.data as TaskFlowNodeData;

                // Optimistic: show trimmed title immediately (prevents "Untitled" flash)
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...tempData, task: { ...tempData.task, title: trimmed } } }
                            : n,
                    ),
                );

                try {
                    const taskResult = await taskService._upsertTaskBatch($user.userToken, [{
                        projectId: tempData.task.projectId,
                        parentTaskId: null,
                        type: tempData.task.type,
                        title: trimmed,
                        status: "open",
                        priority: "medium",
                        orderIndex: 0,
                        note: null,
                        startDate: null,
                        endDate: null,
                        checklistJson: null,
                        processJson: null,
                        customTabsJson: null,
                    }]);

                    if (!taskResult.success || !taskResult.data?.length) throw new Error(taskResult.message);
                    const [newTask] = transformTaskData([taskResult.data[0] as unknown as TaskDTO]);
                    const realId = String(newTask.id);

                    debugLog.log("task-upsert", "flow-task-created", {
                        taskId: newTask.id,
                        folderWorkspaceItemId: newTask.folderWorkspaceItemId,
                        title: trimmed,
                        source: "useMultiProjectTaskFlowNode",
                    });

                    setFlowNodes((prev) =>
                        prev.map((n) =>
                            n.id === nodeId
                                ? { ...n, id: realId, data: { task: newTask, projectName: tempData.projectName } }
                                : n,
                        ),
                    );
                    setTasks((prev) => [...prev, newTask]);

                    flowService._upsertPositions($user.userToken, [
                        { nodeId: newTask.id, nodeType: "task", x: tempNode.position.x, y: tempNode.position.y },
                    ]).catch(() => {});

                    await createTaskFolder(newTask);

                    _console.success("Task created");
                    debugLog.flush();
                } catch {
                    setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
                    _console.error("Failed to create task");
                }
                return;
            }

            // ── Existing node: rename ───────────────────────────────────────
            setEditingNodeId(null);
            if (!trimmed) return;

            if (isNodeLocked(nodeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "rename", nodeId });
                return;
            }

            const taskId = parseInt(nodeId, 10);
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.title === trimmed) return;

            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: trimmed } : t)));
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, title: trimmed } } }
                        : n,
                ),
            );

            try {
                debugLog.log("task-upsert", "flow-rename-upsert", {
                    taskId: task.id, folderWorkspaceItemId: task.folderWorkspaceItemId,
                    title: trimmed, source: "useMultiProjectTaskFlowNode.rename",
                });
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: trimmed, note: task.note, status: task.status,
                    priority: task.priority, startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: task.processJson, customTabsJson: task.customTabsJson,
                }]);
                if (!result.success) throw new Error(result.message);
                _console.success("Task renamed");
            } catch {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: task.title } : t)));
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, title: task.title } } }
                            : n,
                    ),
                );
                _console.error("Failed to rename task");
            }
        }

    // ── Add task at position (right-click canvas) ─────────────────────────
    // Only creates a temp node — backend call happens on rename confirm.

    const handleAddTaskAtPosition = 
        (posX: number, posY: number) => {
            if (filteredTasks.length === 0) return;

            // Find nearest node to determine project
            let nearestTask = filteredTasks[0];
            if (currentFlowNodes.length > 0) {
                let minDist = Infinity;
                for (const n of currentFlowNodes) {
                    const dx = n.position.x - posX;
                    const dy = n.position.y - posY;
                    const dist = dx * dx + dy * dy;
                    if (dist < minDist) {
                        minDist = dist;
                        const t = (n.data as TaskFlowNodeData).task;
                        if (t) nearestTask = t;
                    }
                }
            }

            const tempId = `temp-node-${Date.now()}`;
            const projectName = projectNameMap.get(nearestTask.projectId) ?? "";

            const tempNode: Node<TaskFlowNodeData> = {
                id: tempId,
                type: "taskFlowNode",
                position: { x: posX, y: posY },
                data: {
                    task: {
                        ...nearestTask,
                        id: 0, title: "", parentTaskId: null,
                        status: "open", priority: "medium",
                        processJson: null, checklistJson: null, customTabsJson: null, note: null,
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

    // ── Change project of a task node ──────────────────────────────────────

    const handleChangeProject = 
        async (nodeId: string, newProjectId: number) => {
            if (isNodeLocked(nodeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "changeProject", nodeId });
                return;
            }
            const taskId = parseInt(nodeId, 10);
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.projectId === newProjectId) return;

            const newProjectName = projectNameMap.get(newProjectId) ?? "";

            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, projectId: newProjectId } : t)));
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, projectId: newProjectId }, projectName: newProjectName } }
                        : n,
                ),
            );

            try {
                debugLog.log("task-upsert", "flow-changeProject-upsert", {
                    taskId: task.id, folderWorkspaceItemId: task.folderWorkspaceItemId,
                    oldProjectId: task.projectId, newProjectId,
                    source: "useMultiProjectTaskFlowNode.changeProject",
                });
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: newProjectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: task.title, note: task.note, status: task.status,
                    priority: task.priority, startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: task.processJson, customTabsJson: task.customTabsJson,
                }]);
                if (!result.success) throw new Error(result.message);
            } catch {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, projectId: task.projectId } : t)));
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, projectId: task.projectId }, projectName: projectNameMap.get(task.projectId) ?? "" } }
                            : n,
                    ),
                );
                _console.error("Failed to change project");
            }
        }

    // ── Change status of a task node ─────────────────────────────────────

    const handleChangeStatus = 
        async (nodeId: string, newStatus: string) => {
            if (isNodeLocked(nodeId)) {
                debugLog.log("taskflow", "locked-node-blocked", { action: "changeStatus", nodeId, newStatus });
                return;
            }
            const taskId = parseInt(nodeId, 10);
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.status === newStatus) return;

            const oldStatus = task.status;

            setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === nodeId
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, status: newStatus } } }
                        : n,
                ),
            );

            try {
                debugLog.log("task-upsert", "flow-changeStatus-upsert", {
                    taskId: task.id, folderWorkspaceItemId: task.folderWorkspaceItemId,
                    oldStatus: task.status, newStatus,
                    source: "useMultiProjectTaskFlowNode.changeStatus",
                });
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: task.title, note: task.note, status: newStatus,
                    priority: task.priority, startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: task.processJson, customTabsJson: task.customTabsJson,
                }]);
                if (!result.success) throw new Error(result.message);
            } catch {
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: oldStatus } : t)));
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === nodeId
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, status: oldStatus } } }
                            : n,
                    ),
                );
                _console.error("Failed to change status");
            }
        }
    return {
        handleRenameStart,
        handleRenameCancel,
        handleRenameConfirm,
        handleAddTaskAtPosition,
        handleChangeProject,
        handleChangeStatus,
        isNodeLocked,
    };
};
