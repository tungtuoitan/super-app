/**
 * MultiProject Task Flow Headless
 * Side-effects only (useEffect).
 * 1. Loads all tasks (no status/priority filter) into taskFlowTasks on mount and when projectIds change.
 * 2. Loads saved positions + custom edges from API on first mount.
 * 3. Rebuilds node layout when the task set changes.
 *    Preserves user-dragged positions for existing nodes.
 */

import { useEffect } from "react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "./useMultiProjectTaskFlow.helper";
import { useMultiProjectDetailSelector } from "../../Selectors/useMultiProjectDetail.selector";
import { buildTaskFlowLayout } from "../../utils/multiProjectTaskFlow.utils";
import { flowService, useDebugLog } from "@/shared";
import type { FlowEdgeDTO, FlowNodePositionDTO } from "@/shared";
import type { FlowEdgeData } from "../../types/multiProjectTaskFlow.type";
import { useAuthStore } from "@/shared";

import type { Edge } from "@xyflow/react";
import type { TaskFlowNodeData } from "../../types/multiProjectTaskFlow.type";

export function useMultiProjectTaskFlowHeadless() {
    const { setFlowNodes, setFlowEdges, setSavedEdges, savedEdges, setSavedPositions, savedPositions, positionsLoaded, setPositionsLoaded, isTaskFlowLoading, lockOldNodes } = useMultiTaskFlowStore();
    const { filteredTasks, projectNameMap, taskIdKey } = useMultiProjectTaskFlowSelector();
    const { loadTaskFlowTasks } = useMultiProjectTaskFlowHelper();
    const { filteredProjectIds } = useMultiProjectDetailSelector();
    const { $user } = useAuthStore();
    const debugLog = useDebugLog();

    // ── Load all tasks (no filter) — only once per token ───────────────────
    useEffect(() => {
        loadTaskFlowTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userToken]);

    // ── Load saved positions + custom edges on first mount ──────────────────
    useEffect(() => {
        if (positionsLoaded || !$user.userToken) return;

        setPositionsLoaded(true);

        Promise.all([
            flowService._getEdges($user.userToken),
            flowService._getPositions($user.userToken, { nodeType: "task" }),
        ]).then(([edgeResult, posResult]) => {
            const edgeDtos: FlowEdgeDTO[] = (edgeResult.data as FlowEdgeDTO[]) ?? [];
            const posDtos: FlowNodePositionDTO[] = (posResult.data as FlowNodePositionDTO[]) ?? [];

            const positions: Record<string, { x: number; y: number }> = {};
            for (const p of posDtos) {
                positions[String(p.nodeId)] = { x: p.x, y: p.y };
            }
            setSavedPositions(positions);

            const customEdges: Edge<FlowEdgeData>[] = edgeDtos.map((e) => ({
                id: `custom-${e.id}`,
                source: String(e.sourceId),
                target: String(e.targetId),
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                type: "flowEdgeWithNote",
                reconnectable: false,
                data: { edgeId: e.id, note: e.note, arrowDirection: e.arrowDirection ?? "forward" },
            }));

            setSavedEdges(customEdges);

            if (filteredTasks.length > 0) {
                const { nodes: autoNodes } = buildTaskFlowLayout(filteredTasks, projectNameMap);
                const autoIds = new Set(autoNodes.map((n) => n.id));
                setFlowNodes((prev) => {
                    const extras = prev.filter((n) => !autoIds.has(n.id));
                    const merged = autoNodes.map((n) => {
                        const status = (n.data as TaskFlowNodeData).task?.status;
                        const locked = lockOldNodes && (status === "completed" || status === "cancelled" || status === "failed");
                        return {
                            ...n,
                            position: positions[n.id] ?? n.position,
                            draggable: !locked,
                        };
                    });
                    return [...merged, ...extras];
                });
                setFlowEdges(customEdges);
            }
        }).catch(() => {/* silent — use auto layout if API unavailable */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userToken]);

    // ── Rebuild when the set of task IDs changes ────────────────────────────
    useEffect(() => {
        // Don't clear while still loading — prevents "no tasks" flash on mount
        if (isTaskFlowLoading) return;

        if (filteredTasks.length === 0) {
            setFlowNodes([]);
            setFlowEdges((prev) => prev.filter((e) => e.type === "flowEdgeWithNote"));
            return;
        }

        const { nodes: autoNodes } = buildTaskFlowLayout(filteredTasks, projectNameMap);
        const autoIds = new Set(autoNodes.map((n) => n.id));

        setFlowNodes((prev) => {
            const extras = prev.filter((n) => !autoIds.has(n.id));
            const prevMeta: Record<string, { x: number; y: number; selected?: boolean }> = {};
            for (const n of prev) prevMeta[n.id] = { x: n.position.x, y: n.position.y, selected: n.selected };
            const merged = autoNodes.map((n) => {
                const status = (n.data as TaskFlowNodeData).task?.status;
                const locked = lockOldNodes && (status === "completed" || status === "cancelled" || status === "failed");
                return {
                    ...n,
                    position: savedPositions[n.id] ?? prevMeta[n.id] ?? n.position,
                    draggable: !locked,
                    selected: prevMeta[n.id]?.selected ?? false,
                };
            });
            debugLog.log("taskflow", "rebuild", {
                nodeCount: merged.length + extras.length,
                lockedCount: merged.filter((n) => n.draggable === false).length,
            });
            return [...merged, ...extras];
        });

        setFlowEdges((prev) => {
            const prevCustom = prev.filter((e) => e.type === "flowEdgeWithNote");
            return prevCustom.length > 0 ? prevCustom : savedEdges;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskIdKey, savedPositions, savedEdges, isTaskFlowLoading, lockOldNodes]);
}
