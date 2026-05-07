import { useEffect, useRef } from "react";
import { flowService } from "@/shared";
import type { FlowNodePositionDTO, FlowEdgeDTO } from "@/shared";
import type { KFlowClipboard } from "@/features/K/types/kContext.type";
import { KQuizService } from "@/features/K/service/kQuiz.service";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";
import type { KUpdateQuestionsRequest } from "@/features/K/types/kQuiz.type";
import { dispatchKFlowQuestionsChanged } from "@/features/K/utils/kEvents.utils";
import { buildGridPosition, hasPositionOverlap } from "@/features/K/utils/kQFlow.utils";
import { NODE_HEIGHT } from "@/features/K/utils/kQFlow.constants";

// Strip "DRAFT" keyword from an answer and determine if the question should be drafted.
// Rules: empty answer → draft; answer contains "DRAFT" → draft + remove "DRAFT".
export function resolveDraft(raw: string): { cleanedAnswer: string; shouldBeDraft: boolean } {
    const hasDraftKeyword = raw.includes("DRAFT");
    const cleanedAnswer   = hasDraftKeyword ? raw.replace(/DRAFT/g, "").trim() : raw;
    return { cleanedAnswer, shouldBeDraft: !cleanedAnswer || hasDraftKeyword };
}

export function useKQFlowHelper() {
    const {
        flowNodes, setFlowNodes,
        setFlowEdges,
        savedEdges,
        setSavedEdges,
        setSavedPositions,
        editingNodeId, setEditingNodeId,
        nodeId,
        setPendingSelectIds,
    } = useKQFlowStore();

    const flowNodesRef = useRef(flowNodes);
    const savedEdgesRef = useRef(savedEdges);
    const nodeIdRef = useRef(nodeId);

    useEffect(() => { flowNodesRef.current = flowNodes; }, [flowNodes]);
    useEffect(() => { savedEdgesRef.current = savedEdges; }, [savedEdges]);
    useEffect(() => { nodeIdRef.current = nodeId; }, [nodeId]);

    // ── Orphan-aware API helpers ───────────────────────────────────────────
    // nodeId === 0 means "orphan mode" (node_id IS NULL in DB)

    const updateQForNode = (nodeId: number, request: KUpdateQuestionsRequest) =>
        nodeId === 0
            ? KQuizService._updateOrphanQuestions(request)
            : KQuizService._updateQuestions(nodeId, request);

    const getQForNode = (nodeId: number) =>
        nodeId === 0
            ? KQuizService._getOrphanQuestions()
            : KQuizService._getNodeQuestions(nodeId);

    const toEventNodeId = (nodeId: number): number | null => nodeId === 0 ? null : nodeId;

    // ── Rename: start / cancel ─────────────────────────────────────────────

    const handleRenameStart = (nodeId: string) => {
        if (editingNodeId !== null) return;
        setEditingNodeId(nodeId);
    };

    const handleRenameCancel = (nodeId: string | null) => {
        setEditingNodeId(null);
        if (nodeId?.startsWith("temp-node-")) {
            setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
        }
    };

    // ── Rename confirm — create or update question ─────────────────────────
    //
    // PROBLEM SOLVED HERE:
    // Previously, creating a new question followed this pattern:
    // 1. Create temp node with temp ID (temp-node-123)
    // 2. Call create API
    // 3. Call getQuestions() again to fetch the created question
    // 4. Find the created question by matching text: questions.find(q => q.question === trimmedQ)
    //
    // This approach was fragile:
    // - If network delayed the fetch, user saw empty canvas
    // - If question text didn't match exactly (whitespace, encoding), search failed silently
    // - Required backend round-trip: create → fetch all
    //
    // Solution: Make backend return the created question's ID directly.
    // Now the flow is:
    // 1. Create temp node with temp ID
    // 2. Call create API → get back newQuestionId immediately
    // 3. Construct question object locally using what we know
    // 4. Replace temp node with real node (same position, immediately visible)
    // 5. Trigger silent event-driven fetch to sync backend state
    //
    // This is the "optimistic update" pattern:
    // - User sees result immediately (no wait for fetch)
    // - Data comes from local construction (guaranteed to match)
    // - Backend fetch arrives later, silent rebuild preserves our node (no flash)
    // - If backend differs, smart rebuild detects and updates only changed fields

    const handleRenameConfirm = async (nodeId: string, questionText: string, answerText: string) => {
        const currNodeId = nodeIdRef.current;
        const trimmedQ = questionText.trim();
        const trimmedA = answerText.trim();

        const { cleanedAnswer, shouldBeDraft } = resolveDraft(trimmedA);

        setEditingNodeId(null);

        // ── Temp node: create new question ───────────────────────────────
        if (nodeId.startsWith("temp-node-")) {
            if (!trimmedQ) {
                setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
                return;
            }

            const tempNode = flowNodesRef.current.find((n) => n.id === nodeId);
            if (!tempNode) return;

            // Optimistically update temp node text so it's visible while saving
            setFlowNodes((prev) => prev.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { question: { ...(n.data as KQFlowNodeData).question, question: trimmedQ, answer: cleanedAnswer || null, statusCode: shouldBeDraft ? "draft" : "learning" } } as KQFlowNodeData }
                    : n,
            ));

            try {
                // Create the question — backend returns the new question's ID directly
                // (not a text-based search or a second fetch)
                const createRes = await updateQForNode(currNodeId, {
                    addQuestions: [{ name: trimmedQ, description: cleanedAnswer || null }],
                    updateQuestions: [], deleteQuestionIds: [], restoreQuestionIds: [],
                });

                const newQuestionId: number | undefined = createRes?.object?.addedQuestionIds?.[0];
                if (!newQuestionId) throw new Error("No ID returned from create");

                if (shouldBeDraft) {
                    await updateQForNode(currNodeId, {
                        addQuestions: [], updateQuestions: [],
                        deleteQuestionIds: [], restoreQuestionIds: [],
                        toggleDraftQuestionIds: [newQuestionId],
                    });
                }

                const realId = String(newQuestionId);
                const pos = tempNode.position;

                setSavedPositions((p) => ({ ...p, [realId]: pos }));
                flowService._upsertPositions("", [{ nodeId: newQuestionId, nodeType: "kQuestion", x: pos.x, y: pos.y }]).catch(() => {});

                // Build the real question data from what we know — no re-fetch needed.
                //
                // WHY NO RE-FETCH:
                // We have all the data needed:
                // - id: from API response (newQuestionId)
                // - question, answer, statusCode: from user input
                // - scoreHistory, retention, etc.: defaults (never modified on create)
                // - deletedAt: null (new questions aren't deleted)
                //
                // By constructing locally, we:
                // 1. Show the node immediately (no network latency)
                // 2. Guarantee data matches what user typed (no serialization surprises)
                // 3. Match what the backend will return (so smart rebuild won't flash)
                //
                // CRITICAL: Field values MUST match what the backend returns.
                // If we set something to null here but backend returns undefined (or vice versa),
                // the smart rebuild in useKQFlow.headless will see a "change" and recreate
                // the node reference, causing a visible flash. See that file for nullish
                // coalescing comparisons that handle this.
                const newQuestion = {
                    id: newQuestionId,
                    nodeId: currNodeId === 0 ? null : currNodeId,
                    nodeName: "",
                    question: trimmedQ,
                    answer: cleanedAnswer || null,
                    statusCode: (shouldBeDraft ? "draft" : "learning") as "draft" | "learning",
                    sortOrder: 0,
                    scoreHistory: [],
                    retention: 0,
                    deletedAt: null,  // Explicitly null, not undefined (matters for smart rebuild)
                    srsNextReviewAt: null,  // Explicitly null
                };

                // Replace temp node with real node atomically — no flash, no re-fetch.
                // The temp node had an unstable ID (temp-node-123). Now we replace it
                // with the real, stable ID from the backend. The node itself has the same
                // position and all visible data, so React Flow's layout engine doesn't
                // need to recalculate anything — just swap the identity.
                // selected:false matches the rebuild's default for non-selected nodes.
                setFlowNodes((prev) => prev.map((n) =>
                    n.id === nodeId
                        ? { id: realId, type: "questionFlowNode" as const, position: pos, selected: false, data: { question: newQuestion } as KQFlowNodeData }
                        : n,
                ));

                // Dispatch event to trigger a silent background fetch.
                // This event is caught in KQFlowView.tsx and calls fetchQuestions()
                // WITHOUT showing a spinner. It merges the backend's view with our
                // local state. The smart rebuild in useKQFlow.headless will:
                // 1. See that node 456 (our new ID) now exists in visibleQuestions ✓
                // 2. Compare its fields with our locally-constructed newQuestion ✓
                // 3. Find them all match (we built it to match) ✓
                // 4. REUSE the exact same Node reference (no flash) ✓
                dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
            } catch {
                // If create fails, remove the temp node
                setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
            }
            return;
        }

        // ── Existing node: update question ────────────────────────────────
        if (!trimmedQ) return;

        const questionId = parseInt(nodeId, 10);
        if (!questionId) return;

        const currentNode    = flowNodesRef.current.find((n) => n.id === nodeId);
        const currentIsDraft = (currentNode?.data as KQFlowNodeData)?.question?.statusCode === "draft";
        const needsDraftToggle = shouldBeDraft && !currentIsDraft;

        setFlowNodes((prev) => prev.map((n) =>
            n.id === nodeId
                ? { ...n, data: { question: { ...(n.data as KQFlowNodeData).question, question: trimmedQ, answer: cleanedAnswer || null, statusCode: currentIsDraft || shouldBeDraft ? "draft" : "learning" } } as KQFlowNodeData }
                : n,
        ));

        try {
            await updateQForNode(currNodeId, {
                addQuestions: [],                updateQuestions: [{ id: questionId, name: trimmedQ, description: cleanedAnswer || null }],
                deleteQuestionIds: [], restoreQuestionIds: [],
                ...(needsDraftToggle ? { toggleDraftQuestionIds: [questionId] } : {}),
            });
            dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
        } catch { /* silent — optimistic already applied */ }
    };

    // ── Delete / restore question ──────────────────────────────────────────

    const handleDeleteQuestion = async (questionId: number) => {
        const currNodeId = nodeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as KQFlowNodeData), question: { ...(n.data as KQFlowNodeData).question, deletedAt: new Date().toISOString() } } }
                : n,
        ));
        try {
            await updateQForNode(currNodeId, {
                addQuestions: [], updateQuestions: [],                deleteQuestionIds: [questionId], restoreQuestionIds: [],
            });
            dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
        } catch { /* silent — optimistic applied */ }
    };

    const handleRestoreQuestion = async (questionId: number) => {
        const currNodeId = nodeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as KQFlowNodeData), question: { ...(n.data as KQFlowNodeData).question, deletedAt: undefined } } }
                : n,
        ));
        try {
            await updateQForNode(currNodeId, {
                addQuestions: [], updateQuestions: [],                deleteQuestionIds: [], restoreQuestionIds: [questionId],
            });
            dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
        } catch { /* silent — optimistic applied */ }
    };

    const handleToggleDraft = async (questionId: number) => {
        const currNodeId = nodeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as KQFlowNodeData), question: { ...(n.data as KQFlowNodeData).question, statusCode: (n.data as KQFlowNodeData).question.statusCode === "draft" ? "learning" : "draft" } } }
                : n,
        ));
        try {
            await updateQForNode(currNodeId, {
                addQuestions: [], updateQuestions: [],                deleteQuestionIds: [], restoreQuestionIds: [],
                toggleDraftQuestionIds: [questionId],
            });
            dispatchKFlowQuestionsChanged({ nodeId: toEventNodeId(currNodeId) });
        } catch { /* silent — optimistic applied */ }
    };

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

    return {
        editingNodeId,
        handleRenameStart, handleRenameConfirm, handleRenameCancel,
        handleDeleteQuestion, handleRestoreQuestion, handleToggleDraft,
        handleMoveQuestion, handlePasteQuestions,
    };
}
