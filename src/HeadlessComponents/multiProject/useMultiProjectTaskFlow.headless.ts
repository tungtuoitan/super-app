/**
 * MultiProject Task Flow Headless
 * Side-effects only (useEffect).
 * 1. Loads all tasks (no status/priority filter) into taskFlowTasks on mount and when projectIds change.
 * 2. Loads saved positions + custom edges from API on first mount.
 * 3. Rebuilds node layout when the task set changes.
 *    Preserves user-dragged positions for existing nodes.
 */

import { useEffect } from "react";
import { useMultiTaskFlowStore } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowSelector } from "@/Selectors/multipleProject/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "@/hooks/multiProject/useMultiProjectTaskFlow.helper";
import { useMultiProjectDetailSelector } from "@/Selectors/multipleProject/useMultiProjectDetail.selector";
import { buildTaskFlowLayout } from "@/utils/project/multiProjectTaskFlow.utils";
import { flowService } from "@/services/flow.service";
import type { FlowEdgeDTO, FlowNodePositionDTO } from "@/services/flow.service";
import type { FlowEdgeData } from "@/types/multiProject/multiProjectTaskFlow.type";
import { useAuthStore } from "@/store/auth/Auth.store";
import type { Edge } from "@xyflow/react";

export function useMultiProjectTaskFlowHeadless() {
    const { setFlowNodes, setFlowEdges, setSavedEdges, savedEdges, setSavedPositions, savedPositions, positionsLoaded, setPositionsLoaded } = useMultiTaskFlowStore();
    const { filteredTasks, projectNameMap, taskIdKey } = useMultiProjectTaskFlowSelector();
    const { loadTaskFlowTasks } = useMultiProjectTaskFlowHelper();
    const { filteredProjectIds } = useMultiProjectDetailSelector();
    const { $user } = useAuthStore();

    // ── Load all tasks without status/priority filters ──────────────────────
    useEffect(() => {
        loadTaskFlowTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userToken, filteredProjectIds]);

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
                    const merged = autoNodes.map((n) => ({
                        ...n,
                        position: positions[n.id] ?? n.position,
                    }));
                    return [...merged, ...extras];
                });
                setFlowEdges(customEdges);
            }
        }).catch(() => {/* silent — use auto layout if API unavailable */});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [$user.userToken]);

    // ── Rebuild when the set of task IDs changes ────────────────────────────
    useEffect(() => {
        if (filteredTasks.length === 0) {
            setFlowNodes([]);
            setFlowEdges((prev) => prev.filter((e) => e.type === "flowEdgeWithNote"));
            return;
        }

        const { nodes: autoNodes } = buildTaskFlowLayout(filteredTasks, projectNameMap);
        const autoIds = new Set(autoNodes.map((n) => n.id));

        setFlowNodes((prev) => {
            const extras = prev.filter((n) => !autoIds.has(n.id));
            const prevPositions: Record<string, { x: number; y: number }> = {};
            for (const n of prev) prevPositions[n.id] = n.position;
            const merged = autoNodes.map((n) => ({
                ...n,
                position: prevPositions[n.id] ?? savedPositions[n.id] ?? n.position,
            }));
            return [...merged, ...extras];
        });

        setFlowEdges((prev) => {
            const prevCustom = prev.filter((e) => e.type === "flowEdgeWithNote");
            return prevCustom.length > 0 ? prevCustom : savedEdges;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskIdKey, savedPositions, savedEdges]);
}
