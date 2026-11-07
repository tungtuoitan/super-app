import { useEffect, useRef } from "react";
import { flowService } from "@/shared";
import { KQuizService } from "@/features/K/service/kQuiz.service";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";
import type { KUpdateQuestionsRequest } from "@/features/K/types/kQuiz.type";
import { dispatchKFlowQuestionsChanged } from "@/features/K/utils/kEvents.utils";
import { resolveDraft, toEventNodeId } from "@/features/K/utils/kQFlowQuestion.utils";
import { useKQFlowMoveHelper } from "./useKQFlowMove.helper";

export function useKQFlowHelper() {
    const {
        flowNodes, setFlowNodes,
        savedEdges,
        setSavedPositions,
        editingNodeId, setEditingNodeId,
        nodeId,
    } = useKQFlowStore();

    const flowNodesRef = useRef(flowNodes);
    const savedEdgesRef = useRef(savedEdges);
    const nodeIdRef = useRef(nodeId);

    useEffect(() => { flowNodesRef.current = flowNodes; }, [flowNodes]);
    useEffect(() => { savedEdgesRef.current = savedEdges; }, [savedEdges]);
    useEffect(() => { nodeIdRef.current = nodeId; }, [nodeId]);

    const { handleMoveQuestion, handlePasteQuestions } = useKQFlowMoveHelper(nodeIdRef, flowNodesRef, savedEdgesRef);

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

    return {
        editingNodeId,
        handleRenameStart, handleRenameConfirm, handleRenameCancel,
        handleDeleteQuestion, handleRestoreQuestion, handleToggleDraft,
        handleMoveQuestion, handlePasteQuestions,
    };
}
