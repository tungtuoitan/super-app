import { useEffect, useRef } from "react";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import type { KTestQuestion } from "@/features/K/types/kTest.type";
import type { QuestionFlowNodeData, KFlowEdgeData } from "@/features/K/types/kTestFlow.type";
import type { Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import { FlowEdgeDTO, FlowNodePositionDTO } from "@/shared";
import { buildGridPosition } from "@/features/K/utils/kTestFlow.utils";

export function useKTestFlowHeadless(knowledgeId: number, questions: KTestQuestion[], showDeleted: boolean) {
    const {
        setFlowNodes, setFlowEdges, setSavedEdges,
        savedPositions, setSavedPositions,
        positionsLoaded, setPositionsLoaded,
        pendingSelectIds, setPendingSelectIds,
        setEditingNodeId, setConnectingSourceId,
    } = useKTestFlowStore();

    // Stable key derived from the current question IDs — changes only when the
    // question set itself changes (new node selected or questions added/removed).
    const questionIdsKey = questions.map(q => q.id).join(",");

    // Tracks which questionIdsKey the currently stored savedPositions belong to.
    // Updated synchronously (as a ref, not state) inside the fetch effect so the
    // rebuild effect can detect stale positions within the SAME render cycle —
    // before React has propagated the new positionsLoaded=false state.
    //
    // Without this guard: when new questions arrive, positionsLoaded is still
    // true in the rebuild effect's stale closure, causing nodes to render at
    // fallback grid positions for one cycle before real positions load (visible jump).
    const positionsForKeyRef = useRef<string>("");

    // ── Reset on knowledge change ─────────────────────────────────────────────
    // Clear all flow state immediately when switching to a different node so the
    // canvas never briefly shows stale content from the previous node.
    useEffect(() => {
        positionsForKeyRef.current = ""; // invalidate cached positions
        setFlowNodes([]);
        setFlowEdges([]);
        setSavedEdges([]);
        setSavedPositions({});
        setPositionsLoaded(false);
        setEditingNodeId(null);
        setConnectingSourceId(null);
        setPendingSelectIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeId]);

    // ── Fetch positions + edges ───────────────────────────────────────────────
    // Runs after questions for the current knowledge are available.
    // knowledgeId=0 is valid (orphan mode) — do NOT guard on !knowledgeId.
    useEffect(() => {
        if (!questionIdsKey) {
            // No questions — nothing to fetch; mark loaded so canvas reveals empty
            positionsForKeyRef.current = "";
            setPositionsLoaded(true);
            return;
        }

        // Invalidate ref so rebuild skips until fetch completes
        positionsForKeyRef.current = "";
        setPositionsLoaded(false);
        setSavedPositions({});
        setSavedEdges([]);

        let cancelled = false;
        const questionIds = questions.map(q => q.id);

        Promise.all([
            flowService._getEdges(""),
            flowService._getPositions("", { nodeType: "kQuestion", nodeIds: questionIds.join(",") }),
        ]).then(([edgeRes, posRes]) => {
            if (cancelled) return;

            const posDtos: FlowNodePositionDTO[] = (posRes.data as FlowNodePositionDTO[]) ?? [];
            const edgeDtos: FlowEdgeDTO[] = (edgeRes.data as FlowEdgeDTO[]) ?? [];

            const positions: Record<string, { x: number; y: number }> = {};
            for (const p of posDtos) {
                positions[String(p.nodeId)] = { x: p.x, y: p.y };
            }
            setSavedPositions(positions);

            const qIdSet = new Set(questionIds.map(String));
            const customEdges: Edge<KFlowEdgeData>[] = edgeDtos
                .filter(e =>
                    e.sourceType === "kQuestion" &&
                    e.targetType === "kQuestion" &&
                    qIdSet.has(String(e.sourceId)) &&
                    qIdSet.has(String(e.targetId))
                )
                .map(e => ({
                    id: `custom-${e.id}`,
                    source: String(e.sourceId),
                    target: String(e.targetId),
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                    type: "kQuestionEdge",
                    data: { edgeId: e.id, note: e.note, arrowDirection: e.arrowDirection ?? "forward" },
                }));

            // Mark positions as valid for this question set BEFORE setting
            // positionsLoaded=true, so the rebuild effect's ref-check passes
            positionsForKeyRef.current = questionIdsKey;
            setSavedEdges(customEdges);
            setFlowEdges(customEdges);
            setPositionsLoaded(true);
        }).catch((err) => {
            console.warn("[kflow-headless] fetch failed:", err);
            if (!cancelled) setPositionsLoaded(true);
        });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeId, questionIdsKey]);

    // ── Rebuild nodes ─────────────────────────────────────────────────────────
    // Re-runs whenever questions, positions, or visibility (showDeleted) changes.
    useEffect(() => {
        if (!positionsLoaded) return;

        // Guard against the stale-closure race: in the same render where new
        // questions arrive, the fetch effect schedules setPositionsLoaded(false)
        // but the rebuild effect still sees the OLD closure value (true). Without
        // this ref check, rebuild would run with questions=new but savedPositions={}
        // → nodes appear at fallback grid positions then jump when fetch completes.
        if (positionsForKeyRef.current !== questionIdsKey) return;

        const selectSet = new Set(pendingSelectIds);
        const visibleQuestions = showDeleted ? questions : questions.filter(q => !q.deletedAt);

        // Functional update preserves prior selection when pendingSelectIds is
        // empty — prevents a double-run after setPendingSelectIds([]) from
        // overwriting selected:true with undefined.
        setFlowNodes((prevNodes) => {
            const prevSelMap = new Map(prevNodes.map(n => [n.id, !!n.selected]));
            return visibleQuestions.map((q, i) => ({
                id: String(q.id),
                type: "questionFlowNode" as const,
                position: savedPositions[String(q.id)] ?? buildGridPosition(i),
                data: { question: q } as QuestionFlowNodeData,
                selected: selectSet.size > 0
                    ? selectSet.has(q.id)
                    : (prevSelMap.get(String(q.id)) ?? false),
            })) as Node<QuestionFlowNodeData>[];
        });

        // Only clear pendingSelectIds once ALL requested IDs are present in the
        // visible set — prevents premature clearing during cross-canvas paste where
        // the question reload arrives after the first rebuild.
        if (selectSet.size > 0) {
            const visibleIds = new Set(visibleQuestions.map(q => q.id));
            if ([...selectSet].every(id => visibleIds.has(id))) {
                setPendingSelectIds([]);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions, savedPositions, positionsLoaded, showDeleted, pendingSelectIds]);
}
