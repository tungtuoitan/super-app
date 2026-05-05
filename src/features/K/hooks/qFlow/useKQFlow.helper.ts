import { useEffect, useRef } from "react";
import { flowService } from "@/shared";
import type { FlowNodePositionDTO, FlowEdgeDTO } from "@/shared";
import type { KFlowClipboard } from "@/features/K/types/kContext.type";
import { KTestService } from "@/features/K/service/kTest.service";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";
import type { KUpdateQuestionsRequest } from "@/features/K/types/kTest.type";
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
        knowledgeId,
        setPendingSelectIds,
    } = useKQFlowStore();

    const flowNodesRef = useRef(flowNodes);
    const savedEdgesRef = useRef(savedEdges);
    const knowledgeIdRef = useRef(knowledgeId);

    useEffect(() => { flowNodesRef.current = flowNodes; }, [flowNodes]);
    useEffect(() => { savedEdgesRef.current = savedEdges; }, [savedEdges]);
    useEffect(() => { knowledgeIdRef.current = knowledgeId; }, [knowledgeId]);

    // ── Orphan-aware API helpers ───────────────────────────────────────────
    // kId === 0 means "orphan mode" (nodeId = null in DB)

    const updateQForNode = (kId: number, request: KUpdateQuestionsRequest) =>
        kId === 0
            ? KTestService._updateOrphanQuestions(request)
            : KTestService._updateQuestions(kId, request);

    const getQForNode = (kId: number) =>
        kId === 0
            ? KTestService._getOrphanQuestions()
            : KTestService._getQuestions(kId);

    const nodeIdForEvent = (kId: number): number | null => kId === 0 ? null : kId;

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

    const handleRenameConfirm = async (nodeId: string, questionText: string, answerText: string) => {
        const kId = knowledgeIdRef.current;
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

            setFlowNodes((prev) => prev.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { question: { ...(n.data as KQFlowNodeData).question, question: trimmedQ, answer: cleanedAnswer || null, statusCode: shouldBeDraft ? "draft" : "learning" } } as KQFlowNodeData }
                    : n,
            ));

            const existingIds = new Set(
                flowNodesRef.current
                    .filter((n) => !n.id.startsWith("temp-node-"))
                    .map((n) => parseInt(n.id, 10))
                    .filter(Boolean),
            );

            try {
                await updateQForNode(kId, {
                    addQuestions: [{ name: trimmedQ, description: cleanedAnswer || null }],
                    updateQuestions: [],                    deleteQuestionIds: [], restoreQuestionIds: [],
                });

                const res = await getQForNode(kId);
                if (!res.success || !res.object) throw new Error();

                const newQ = res.object.questions.find((q) => !existingIds.has(q.id) && q.question === trimmedQ);
                if (!newQ) throw new Error();

                if (shouldBeDraft) {
                    await updateQForNode(kId, {
                        addQuestions: [], updateQuestions: [],                        deleteQuestionIds: [], restoreQuestionIds: [],
                        toggleDraftQuestionIds: [newQ.id],
                    });
                }

                const realId = String(newQ.id);
                const pos = tempNode.position;

                setSavedPositions((p) => ({ ...p, [realId]: pos }));
                flowService._upsertPositions("", [{ nodeId: newQ.id, nodeType: "kQuestion", x: pos.x, y: pos.y }]).catch(() => {});

                // Replace temp node with real node atomically — prevents flash
                // while the questions reload (rebuild skips until positionsLoaded=true).
                setFlowNodes((prev) => prev.map((n) =>
                    n.id === nodeId
                        ? { id: realId, type: "questionFlowNode" as const, position: pos, data: { question: { ...newQ, statusCode: shouldBeDraft ? "draft" : newQ.statusCode } } as KQFlowNodeData }
                        : n,
                ));
                dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
            } catch {
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
            await updateQForNode(kId, {
                addQuestions: [],                updateQuestions: [{ id: questionId, name: trimmedQ, description: cleanedAnswer || null }],
                deleteQuestionIds: [], restoreQuestionIds: [],
                ...(needsDraftToggle ? { toggleDraftQuestionIds: [questionId] } : {}),
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic already applied */ }
    };

    // ── Delete / restore question ──────────────────────────────────────────

    const handleDeleteQuestion = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as KQFlowNodeData), question: { ...(n.data as KQFlowNodeData).question, deletedAt: new Date().toISOString() } } }
                : n,
        ));
        try {
            await updateQForNode(kId, {
                addQuestions: [], updateQuestions: [],                deleteQuestionIds: [questionId], restoreQuestionIds: [],
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic applied */ }
    };

    const handleRestoreQuestion = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as KQFlowNodeData), question: { ...(n.data as KQFlowNodeData).question, deletedAt: undefined } } }
                : n,
        ));
        try {
            await updateQForNode(kId, {
                addQuestions: [], updateQuestions: [],                deleteQuestionIds: [], restoreQuestionIds: [questionId],
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic applied */ }
    };

    const handleToggleDraft = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as KQFlowNodeData), question: { ...(n.data as KQFlowNodeData).question, statusCode: (n.data as KQFlowNodeData).question.statusCode === "draft" ? "learning" : "draft" } } }
                : n,
        ));
        try {
            await updateQForNode(kId, {
                addQuestions: [], updateQuestions: [],                deleteQuestionIds: [], restoreQuestionIds: [],
                toggleDraftQuestionIds: [questionId],
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic applied */ }
    };

    // ── Move question(s) ──────────────────────────────────────────────────

    const handleMoveQuestion = async (questionIds: number[], targetNodeId: number | null) => {
        const kId = knowledgeIdRef.current;
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
                    ? await KTestService._getOrphanQuestions()
                    : await KTestService._getQuestions(targetNodeId);

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

            await Promise.all(questionIds.map((id) => KTestService._moveQuestion(id, targetNodeId)));

            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
            const targetEvent = targetNodeId === null ? null : targetNodeId;
            if (targetEvent !== nodeIdForEvent(kId)) {
                dispatchKFlowQuestionsChanged({ knowledgeId: targetEvent });
            }
        } catch {
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
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
            ...questionIds.map((id) => KTestService._moveQuestion(id, targetNodeId)),
        ]);

        const patchedPosMap: Record<string, { x: number; y: number }> = {};
        finalPos.forEach((p) => { patchedPosMap[String(p.nodeId)] = { x: p.x, y: p.y }; });
        setSavedPositions((prev) => ({ ...prev, ...patchedPosMap }));

        setPendingSelectIds(questionIds);

        if (targetNodeId !== sourceNodeId) {
            dispatchKFlowQuestionsChanged({ knowledgeId: sourceNodeId });
            dispatchKFlowQuestionsChanged({ knowledgeId: targetNodeId });
        }
    };

    return {
        editingNodeId,
        handleRenameStart, handleRenameConfirm, handleRenameCancel,
        handleDeleteQuestion, handleRestoreQuestion, handleToggleDraft,
        handleMoveQuestion, handlePasteQuestions,
    };
}
