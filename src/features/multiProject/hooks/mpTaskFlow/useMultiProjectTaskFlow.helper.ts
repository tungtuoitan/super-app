/**
 * MultiProject Task Flow Helper
 * Lock guards, edge changes, auto-layout, and task loading.
 *
 * Drag callbacks → useMultiProjectTaskFlowDragHelper
 * Edge/reconnect callbacks → useMultiProjectTaskFlowEdgeHelper
 * Node-specific callbacks → useMultiProjectTaskFlowNodeHelper
 */

import { applyEdgeChanges } from "@xyflow/react";
import type { EdgeChange } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useAuthStore, useConsoleHelper, flowService, parseAsLocalDate } from "@/shared";
import { taskService, transformTaskData } from "@/features/taskDetail";
import type { TaskDTO } from "@/features/taskDetail";
import { projectService } from "@/features/project";
import type { ProjectDTO } from "@/features/project";
import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";
import { smartWand, NODE_WIDTH } from "../../utils/multiProjectTaskFlow.utils";

export const useMultiProjectTaskFlowHelper = () => {
    const { setFlowNodes, setFlowEdges, setSavedPositions, flowNodes, flowEdges, lockOldNodes, setTaskFlowTasks, setIsTaskFlowLoading, setAllProjectsForPicker } = useMultiTaskFlowStore();
    const { savedEdges } = useMultiProjectTaskFlowSelector();
    const { $user } = useAuthStore();
    const _console = useConsoleHelper();

    // ── Lock guards ────────────────────────────────────────────────────────

    const isNodeLocked = (nodeId: string): boolean => {
        if (!lockOldNodes) return false;
        const node = flowNodes.find((n) => n.id === nodeId);
        const status = (node?.data as TaskFlowNodeData)?.task?.status;
        return status === "completed" || status === "cancelled" || status === "failed";
    }

    const isEdgeLocked = (edgeId: string): boolean => {
        if (!lockOldNodes) return false;
        const edge = flowEdges.find((e) => e.id === edgeId);
        if (!edge) return false;
        return isNodeLocked(edge.source) || isNodeLocked(edge.target);
    }

    // ── Edge changes (select → toggle reconnectable) ───────────────────────

    const handleEdgesChange =
        (changes: EdgeChange[]) => {
            setFlowEdges((prev) => {
                const updated = applyEdgeChanges(changes, prev);
                const hasSelectChange = changes.some((c) => c.type === "select");
                if (!hasSelectChange) return updated;
                return updated.map((e) =>
                    e.type === "flowEdgeWithNote" ? { ...e, reconnectable: !!e.selected } : e,
                );
            });
        }

    // ── Auto layout ─────────────────────────────────────────────────────────

    const handleAutoLayout = () => {
        setFlowNodes((prev) => {
            const subEdges = savedEdges.map((e) => ({ source: e.source, target: e.target }));

            const lockedIds = lockOldNodes
                ? new Set(prev.filter((n) => { const s = (n.data as TaskFlowNodeData)?.task?.status; return s === "completed" || s === "cancelled" || s === "failed"; }).map((n) => n.id))
                : new Set<string>();
            const movable = prev.filter((n) => !lockedIds.has(n.id));
            const frozen = prev.filter((n) => lockedIds.has(n.id));
            const adjusted = smartWand(movable, subEdges);

            const newPositions: Record<string, { x: number; y: number }> = {};
            const payload = adjusted
                .map((n) => { newPositions[n.id] = n.position; return { nodeId: parseInt(n.id, 10), nodeType: "task", x: n.position.x, y: n.position.y }; })
                .filter((p) => p.nodeId > 0);
            setSavedPositions((prev) => ({ ...prev, ...newPositions }));
            if (payload.length > 0) flowService._upsertPositions($user.userToken, payload).catch(() => {});

            return [...adjusted, ...frozen];
        })
    }

    // ── Load tasks ──────────────────────────────────────────────────────────

    const loadTaskFlowTasks = async () => {
        if (!$user.userToken) return;
        setIsTaskFlowLoading(true);
        try {
            const result = await taskService._getTasks($user.userToken, { deletedAt: "null" });
            if (result.success && result.data) {
                setTaskFlowTasks(transformTaskData(result.data as TaskDTO[]));
            }
        } catch {
            _console.error("Failed to load task flow tasks");
        } finally {
            setIsTaskFlowLoading(false);
        }
    }

    // ── Load all projects (no filter) — for MiniToolbar project picker ─────
    const loadAllProjects = async () => {
        if (!$user.userToken) return;
        try {
            const result = await projectService.getProjects($user.userToken);
            if (result.success && result.data) {
                setAllProjectsForPicker(
                    (result.data as ProjectDTO[]).map((dto) => ({
                        id: dto.id,
                        name: dto.name,
                        description: dto.description,
                        status: dto.status,
                        startDate: parseAsLocalDate(dto.startDate),
                        endDate: parseAsLocalDate(dto.endDate),
                        createdAt: parseAsLocalDate(dto.createdAt) || new Date(),
                        updatedAt: parseAsLocalDate(dto.updatedAt),
                        deletedAt: parseAsLocalDate(dto.deletedAt),
                        workspaceId: dto.workspaceId,
                        image: dto.image,
                    }))
                );
            }
        } catch {
            _console.error("Failed to load all projects for picker");
        }
    }

    return {
        handleEdgesChange,
        handleAutoLayout,
        loadTaskFlowTasks,
        loadAllProjects,
        isNodeLocked,
        isEdgeLocked,
    };
};
