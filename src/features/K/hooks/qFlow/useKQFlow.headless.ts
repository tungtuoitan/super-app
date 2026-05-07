import { useEffect, useRef } from "react";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KQuestion } from "@/features/K/types/kQuiz.type";
import type { KQFlowNodeData, KFlowEdgeData } from "@/features/K/types/kQFlow.type";
import type { Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import { FlowEdgeDTO, FlowNodePositionDTO } from "@/shared";
import { buildGridPosition } from "@/features/K/utils/kQFlow.utils";

export function useKQFlowHeadless(nodeId: number, questions: KQuestion[], showDeleted: boolean) {
    const {
        setFlowNodes, setFlowEdges, setSavedEdges,
        savedPositions, setSavedPositions,
        positionsLoaded, setPositionsLoaded,
        pendingSelectIds, setPendingSelectIds,
        setEditingNodeId, setConnectingSourceId,
    } = useKQFlowStore();

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
    }, [nodeId]);

    // ── Fetch positions + edges ───────────────────────────────────────────────
    // Runs after questions for the current knowledge are available.
    // nodeId=0 is valid (orphan mode) — do NOT guard on !nodeId.
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
        // Do NOT clear savedPositions or savedEdges here — clearing before the fetch
        // completes causes a race where locally-set positions (e.g. newly created
        // question) or edges disappear if the backend hasn't persisted them yet.
        // We merge after the fetch so backend positions are authoritative while
        // locally-set ones survive when the backend hasn't caught up yet.

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
            // Merge: backend positions take precedence, but locally-set positions
            // for questions not yet persisted by the backend are preserved.
            setSavedPositions(prev => ({ ...prev, ...positions }));

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

            // Merge: backend edges are authoritative. Preserve edges already in local
            // state that connect current questions but were not returned by backend
            // (backend may have pagination gaps or return a subset of all edges).
            const backendIds = new Set(customEdges.map(e => e.id));
            const mergeWithPrev = (prev: Edge<KFlowEdgeData>[]) => {
                const preserved = prev.filter(e =>
                    !backendIds.has(e.id) &&
                    qIdSet.has(e.source) &&
                    qIdSet.has(e.target)
                );
                return [...customEdges, ...preserved];
            };

            // Mark positions as valid for this question set BEFORE setting
            // positionsLoaded=true, so the rebuild effect's ref-check passes
            positionsForKeyRef.current = questionIdsKey;
            setSavedEdges(mergeWithPrev);
            setFlowEdges(mergeWithPrev);
            setPositionsLoaded(true);
        }).catch((err) => {
            console.warn("[kflow-headless] fetch failed:", err);
            if (!cancelled) setPositionsLoaded(true);
        });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId, questionIdsKey]);

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

        // Reuse existing node references when nothing rendered has changed.
        // This prevents React Flow from re-processing all nodes after every
        // background fetch, which would cause a visible jitter even when positions
        // and question data are identical (new API response objects, same values).
        setFlowNodes((prevNodes) => {
            const prevMap = new Map(prevNodes.map(n => [n.id, n]));
            return visibleQuestions.map((q, i) => {
                const newPos = savedPositions[String(q.id)] ?? buildGridPosition(i);
                const newSelected = selectSet.size > 0
                    ? selectSet.has(q.id)
                    : (prevMap.get(String(q.id))?.selected ?? false);
                const prev = prevMap.get(String(q.id));
                if (prev) {
                    const prevQ = (prev.data as KQFlowNodeData).question;
                    if (prev.position.x === newPos.x && prev.position.y === newPos.y &&
                        prev.selected === newSelected &&
                        prevQ.question === q.question &&
                        prevQ.answer === q.answer &&
                        prevQ.statusCode === q.statusCode &&
                        prevQ.deletedAt === q.deletedAt &&
                        prevQ.scoreHistory.length === q.scoreHistory.length &&
                        prevQ.srsNextReviewAt === q.srsNextReviewAt &&
                        prevQ.retention === q.retention) {
                        return prev;
                    }
                }
                return {
                    id: String(q.id),
                    type: "questionFlowNode" as const,
                    position: newPos,
                    data: { question: q } as KQFlowNodeData,
                    selected: newSelected,
                };
            }) as Node<KQFlowNodeData>[];
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
