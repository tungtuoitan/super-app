import type { MutableRefObject } from "react";
import type { Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import type { FlowNodePositionDTO, FlowEdgeDTO } from "@/shared";
import type { KFlowClipboard } from "@/features/K/types/kContext.type";
import { KQuizService } from "@/features/K/service/kQuiz.service";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KFlowEdgeData, KQFlowNodeData } from "@/features/K/types/kQFlow.type";
import { dispatchKFlowQuestionsChanged } from "@/features/K/utils/kEvents.utils";
import { buildGridPosition, hasPositionOverlap } from "@/features/K/utils/kQFlow.utils";
import { toEventNodeId } from "@/features/K/utils/kQFlowQuestion.utils";
import { NODE_HEIGHT } from "@/features/K/utils/kQFlow.constants";

export function useKQFlowMoveHelper(
    nodeIdRef: MutableRefObject<number>,
    flowNodesRef: MutableRefObject<Node<KQFlowNodeData>[]>,
    savedEdgesRef: MutableRefObject<Edge<KFlowEdgeData>[]>,
) {
    const { setFlowNodes, setFlowEdges, setSavedEdges, setSavedPositions, setPendingSelectIds } = useKQFlowStore();

    // ── Move question(s) ──────────────────────────────────────────────────

    const handleMoveQuestion = async (questionIds: number[], targetNodeId: number | null) => {
        const currNodeId = nodeIdRef.current;
        const idSet = new Set(questionIds.map(String));

        const movedNodes = flowNodesRef.current.filter((n) => idSet.has(n.id));
        const movedPos   = movedNodes.map((n) => ({ id: parseInt(n.id, 10), x: n.position.x, y: n.position.y }));
        const meanX      = movedPos.length ? movedPos.reduce((s, p) => s + p.x, 0) / movedPos.length : 0;
        const meanY      = movedPos.length ? movedPos.reduce((s, p) => s + p.y, 0) / movedPos.length : 0;
        const relPos     = movedPos.map((p) => ({ id: p.id, dx: p.x - meanX, dy: p.y - meanY }));

        const crossEdges   = savedEdgesRef.current.filter((e) => idSet.has(e.source) !== idSet.has(e.target));
        const crossEdgeIds = new Set(crossEdges.map((e) => e.id));

        setFlowNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
        setFlowEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));
        setSavedEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));

        try {
            const edgeDeletePayload = crossEdges
                .filter((e) => e.data?.edgeId)
                .map((e) => ({
                    id: e.data!.edgeId,
                    sourceId: parseInt(e.source, 10), sourceType: "kQuestion" as const,
                    targetId: parseInt(e.target, 10), targetType: "kQuestion" as const,
                    sourceHandle: e.sourceHandle ?? "bottom",
                    targetHandle: e.targetHandle ?? "top",
                    deletedAt: new Date().toISOString(),
                }));
            if (edgeDeletePayload.length) {
                await flowService._upsertEdges("", edgeDeletePayload);
            }

            if (movedPos.length > 0) {
                const targetQRes = targetNodeId === null
                    ? await KQuizService._getOrphanQuestions()
                    : await KQuizService._getNodeQuestions(targetNodeId);

                const existingIds = (targetQRes.object?.questions ?? [])
                    .filter((q) => !questionIds.includes(q.id))
                    .map((q) => q.id);

                let finalPos: { nodeId: number; nodeType: "kQuestion"; x: number; y: number }[] =
                    movedPos.map((p) => ({ nodeId: p.id, nodeType: "kQuestion", x: p.x, y: p.y }));

                if (existingIds.length > 0) {
                    const posRes  = await flowService._getPositions("", { nodeType: "kQuestion", nodeIds: existingIds.join(",") });
                    const posDtos: FlowNodePositionDTO[] = (posRes.data as FlowNodePositionDTO[]) ?? [];
                    const posMap: Record<number, { x: number; y: number }> = {};
                    posDtos.forEach((p) => { posMap[p.nodeId] = { x: p.x, y: p.y }; });

                    const targetPosArr = existingIds.map((id, i) => posMap[id] ?? buildGridPosition(i));

                    if (hasPositionOverlap(movedPos.map((p) => ({ x: p.x, y: p.y })), targetPosArr)) {
                        const maxTargetY = Math.max(...targetPosArr.map((p) => p.y)) + NODE_HEIGHT + 60;
                        const minDy      = Math.min(...relPos.map((r) => r.dy));
                        finalPos = relPos.map((r) => ({
                            nodeId: r.id, nodeType: "kQuestion",
                            x: meanX + r.dx,
                            y: maxTargetY + (r.dy - minDy),
                        }));
                    }
                }

                await flowService._upsertPositions("", finalPos);
            }

            await Promise.all(questionIds.map((id) => KQuizService._moveQuestion(id, targetNodeId)));

            dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
            const targetEvent = targetNodeId === null ? null : targetNodeId;
            if (targetEvent !== toEventNodeId(currNodeId)) {
                dispatchKFlowQuestionsChanged({ nodeId: targetEvent });
            }
        } catch {
            dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
        }
    };

    // ── Paste questions (Ctrl+V) ───────────────────────────────────────────

    const handlePasteQuestions = async (
        clipboard: KFlowClipboard,
        targetNodeId: number | null,
        cursorFlowPos?: { x: number; y: number },
    ) => {
        const { questionIds, sourceNodeId } = clipboard;
        if (!questionIds.length) return;

        const idSet = new Set(questionIds.map(String));

        const [posRes, edgeRes] = await Promise.all([
            flowService._getPositions("", { nodeType: "kQuestion", nodeIds: questionIds.join(",") }),
            flowService._getEdges(""),
        ]);

        const posDtos: FlowNodePositionDTO[] = (posRes.data as FlowNodePositionDTO[]) ?? [];
        const allEdgeDtos: FlowEdgeDTO[] = (edgeRes.data as FlowEdgeDTO[]) ?? [];

        const posMap: Record<string, { x: number; y: number }> = {};
        posDtos.forEach((p) => { posMap[String(p.nodeId)] = { x: p.x, y: p.y }; });

        let movedPos = questionIds.map((id, i) => ({
            id,
            x: posMap[String(id)]?.x ?? buildGridPosition(i).x,
            y: posMap[String(id)]?.y ?? buildGridPosition(i).y,
        }));

        if (cursorFlowPos && movedPos.length > 0) {
            const cx = movedPos.reduce((s, p) => s + p.x, 0) / movedPos.length;
            const cy = movedPos.reduce((s, p) => s + p.y, 0) / movedPos.length;
            const dx = cursorFlowPos.x - cx;
            const dy = cursorFlowPos.y - cy;
            movedPos = movedPos.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
        }

        const crossEdgeDtos = allEdgeDtos.filter(
            (e) =>
                e.sourceType === "kQuestion" && e.targetType === "kQuestion" &&
                (idSet.has(String(e.sourceId)) !== idSet.has(String(e.targetId))),
        );

        const finalPos: { nodeId: number; nodeType: "kQuestion"; x: number; y: number }[] =
            movedPos.map((p) => ({ nodeId: p.id, nodeType: "kQuestion", x: p.x, y: p.y }));

        const edgeDeletePayload = crossEdgeDtos.map((e) => ({
            id: e.id,
            sourceId: e.sourceId, sourceType: "kQuestion" as const,
            targetId: e.targetId, targetType: "kQuestion" as const,
            sourceHandle: e.sourceHandle ?? "bottom",
            targetHandle: e.targetHandle ?? "top",
            deletedAt: new Date().toISOString(),
        }));

        await Promise.all([
            edgeDeletePayload.length ? flowService._upsertEdges("", edgeDeletePayload) : Promise.resolve(),
            flowService._upsertPositions("", finalPos),
            ...questionIds.map((id) => KQuizService._moveQuestion(id, targetNodeId)),
        ]);

        const patchedPosMap: Record<string, { x: number; y: number }> = {};
        finalPos.forEach((p) => { patchedPosMap[String(p.nodeId)] = { x: p.x, y: p.y }; });
        setSavedPositions((prev) => ({ ...prev, ...patchedPosMap }));

        setPendingSelectIds(questionIds);

        if (targetNodeId !== sourceNodeId) {
            dispatchKFlowQuestionsChanged({ nodeId: sourceNodeId });
            dispatchKFlowQuestionsChanged({ nodeId: targetNodeId });
        }
    };

    return { handleMoveQuestion, handlePasteQuestions };
}
