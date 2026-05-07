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
    //
    // PROBLEM SOLVED HERE:
    // When a user creates a new question (temp node placed immediately), then saves,
    // this fetch fires and merges backend positions. The merge must NOT clear
    // locally-set positions (e.g., the temp node's position) that the backend
    // hasn't persisted yet, otherwise those positions disappear until fetch completes.
    // Solution: Use "merge" strategy (prev → {...prev, ...positions}) instead of
    // replacing. This keeps local positions while trusting backend as authoritative.
    useEffect(() => {
        if (!questionIdsKey) {
            // No questions — nothing to fetch; mark loaded so canvas reveals empty
            positionsForKeyRef.current = "";
            setPositionsLoaded(true);
            return;
        }

        // Invalidate ref so rebuild skips until fetch completes
        // (See rebuild effect below for explanation of the race condition)
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
    //
    // PROBLEM SOLVED HERE:
    // After creating a question and saving, two problems occurred:
    // 1. FLASH: Node visible → disappears briefly → reappears
    //    Root cause: When a new real node arrives (from API response), it takes
    //    a different identity. The rebuild creates a new Node object reference
    //    even if all displayed fields are identical. React Flow re-processes this
    //    "new" node and causes visible jitter.
    //    Solution: "Smart rebuild" — compare rendered fields (position, selected,
    //    question text, status, etc.) and REUSE the exact same Node object if
    //    nothing visible changed. This prevents React Flow from flickering.
    //
    // 2. OPTIMISTIC UPDATES: After create API call completes, the backend auto-
    //    fetches updated questions. But between "replace temp→real" and "fetch
    //    completes", a rebuild fires with stale savedPositions (still empty).
    //    This rebuild would drop the optimistic real node because it doesn't exist
    //    in the fetch response yet.
    //    Solution: "Optimistic node preservation" — preserve nodes from prevNodes
    //    that aren't yet in visibleQuestions (the fetch response). When fetch
    //    finally arrives with the real data, the next rebuild finds the node in
    //    visibleQuestions and takes over, no flash.
    //
    // 3. STALE CLOSURE RACE: In the render cycle where new questions arrive:
    //    - Fetch effect: calls setPositionsLoaded(false)
    //    - Rebuild effect: still sees positionsLoaded=true (stale closure)
    //    Without the ref check below, rebuild runs with questions=new but
    //    savedPositions={} (hasn't updated yet), causing nodes to appear at
    //    fallback positions, then jump when positions load. Visible flash.
    //    Solution: positionsForKeyRef tracks which questionIdsKey the current
    //    savedPositions belong to. Both effects update this ref synchronously,
    //    allowing rebuild to detect stale data IN THE SAME CYCLE before paint.
    const rebuildRunRef = useRef(0);
    useEffect(() => {
        const runId = ++rebuildRunRef.current;

        if (!positionsLoaded) {
            return;
        }

        if (positionsForKeyRef.current !== questionIdsKey) {
            return;
        }

        const selectSet = new Set(pendingSelectIds);
        const visibleQuestions = showDeleted ? questions : questions.filter(q => !q.deletedAt);

        // Reuse existing node references when nothing rendered has changed.
        // This prevents React Flow from re-processing all nodes after every
        // background fetch, which would cause a visible jitter even when positions
        // and question data are identical (new API response objects, same values).
        //
        // HOW SMART REBUILD WORKS:
        // For each visible question, check if the previous node for that question
        // still has the SAME rendered values (position, selected state, question text,
        // answer, status, score history length, SRS date, retention). If YES, return
        // the exact same Node object reference. If NO, create a new one.
        //
        // This is critical for performance: React Flow tracks node identity by reference.
        // If we create a new Node object even when nothing visible changed, React Flow
        // sees it as "new node" and re-processes the entire node (recalculate layout,
        // re-render internals, etc.), causing visible flicker.
        //
        // NULLISH COALESCING IN COMPARISONS:
        // The backend returns null for nullable fields (answer, deletedAt, srsNextReviewAt).
        // But when we construct nodes locally (e.g., after create, before fetch),
        // we might set them to null explicitly. JSON serialization can sometimes
        // leave fields undefined. To compare fairly, we use (a ?? null) === (b ?? null)
        // so undefined and null are treated as equal. This prevents false "changed"
        // detections just because of serialization differences.
        setFlowNodes((prevNodes) => {
            const prevMap = new Map(prevNodes.map(n => [n.id, n]));
            const visibleQIds = new Set(visibleQuestions.map(q => String(q.id)));

            // OPTIMISTIC NODE PRESERVATION:
            // After a new question is created, the flow is:
            // 1. handleRenameConfirm: replace temp-node-123 → real node 456 (id from API)
            // 2. handleRenameConfirm: dispatch event to trigger fetchQuestions
            // 3. Event handler: fetches updated questions (no spinner, silent reload)
            // 4. Meanwhile: THIS rebuild fires with the PREVIOUS fetch result (no node 456 yet)
            //
            // Without this guard, the rebuild sees node 456 in prevNodes but NOT in
            // visibleQuestions (the fetch response is still in-flight). So it drops node 456,
            // intending to recreate it when fetch completes. But React has already painted
            // the node, and dropping it looks like the node disappeared.
            //
            // Solution: Preserve nodes from prevNodes that are:
            // - NOT temp nodes (already replaced)
            // - NOT in visibleQuestions (haven't been returned by fetch yet)
            // - NOT soft-deleted (marked as deleted)
            // These are "optimistic" nodes — placed immediately, waiting for fetch confirmation.
            const optimisticNodes = prevNodes.filter((n) => {
                if (n.id.startsWith("temp-node-")) return false; // temp was replaced
                if (visibleQIds.has(n.id)) return false; // already in fetch response
                const q = (n.data as KQFlowNodeData).question;
                if (q.deletedAt) return false; // soft-deleted, exclude
                return true; // preserve optimistic node
            });
            const result = visibleQuestions.map((q, i) => {
                const newPos = savedPositions[String(q.id)] ?? buildGridPosition(i);
                const newSelected = selectSet.size > 0
                    ? selectSet.has(q.id)
                    : (prevMap.get(String(q.id))?.selected ?? false);
                const prev = prevMap.get(String(q.id));
                if (prev) {
                    const prevQ = (prev.data as KQFlowNodeData).question;
                    // Nullish-coalesce nullable fields so undefined and null compare
                    // equal — JSON serialization and local construction can differ
                    // (e.g. backend returns null, local construction may have undefined).
                    const checks: Record<string, boolean> = {
                        position: prev.position.x === newPos.x && prev.position.y === newPos.y,
                        selected: (prev.selected ?? false) === newSelected,
                        question: prevQ.question === q.question,
                        answer: (prevQ.answer ?? null) === (q.answer ?? null),
                        statusCode: prevQ.statusCode === q.statusCode,
                        deletedAt: (prevQ.deletedAt ?? null) === (q.deletedAt ?? null),
                        scoreHistoryLen: prevQ.scoreHistory.length === q.scoreHistory.length,
                        srsNextReviewAt: (prevQ.srsNextReviewAt ?? null) === (q.srsNextReviewAt ?? null),
                        retention: prevQ.retention === q.retention,
                    };
                    const allPass = Object.values(checks).every(Boolean);
                    if (allPass) {
                        return prev;
                    }
                } else {
                    // New question
                }
                return {
                    id: String(q.id),
                    type: "questionFlowNode" as const,
                    position: newPos,
                    data: { question: q } as KQFlowNodeData,
                    selected: newSelected,
                };
            }) as Node<KQFlowNodeData>[];
            return optimisticNodes.length > 0 ? [...result, ...optimisticNodes] : result;
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
