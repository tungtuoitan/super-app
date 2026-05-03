import { useCallback, useEffect, useRef } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { NodeChange, EdgeChange, Connection, Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import type { FlowNodePositionDTO, FlowEdgeDTO } from "@/shared";
import type { KFlowClipboard } from "@/features/K/store/K.store";
import { KTestService } from "@/features/K/service/kTest.service";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import type { KFlowEdgeData, QuestionFlowNodeData, ArrowDirection } from "@/features/K/types/kTestFlow.type";
import type { KTestQuestion, KUpdateQuestionsRequest } from "@/features/K/types/kTest.type";
import { dispatchKFlowQuestionsChanged } from "@/features/K/utils/kEvents.utils";

const ARROW_CYCLE: ArrowDirection[] = ["forward", "backward", "both"];

// ── Move helpers ───────────────────────────────────────────────────────────
const MOVE_NODE_W = 280, MOVE_NODE_H = 160, MOVE_OVERLAP_GAP = 40;

function _buildGridPos(index: number) {
    return { x: (index % 4) * (260 + 40), y: Math.floor(index / 4) * (160 + 60) };
}

function _hasOverlap(moved: { x: number; y: number }[], target: { x: number; y: number }[]) {
    for (const m of moved)
        for (const t of target)
            if (Math.abs(m.x - t.x) < MOVE_NODE_W + MOVE_OVERLAP_GAP && Math.abs(m.y - t.y) < MOVE_NODE_H + MOVE_OVERLAP_GAP)
                return true;
    return false;
}
// ──────────────────────────────────────────────────────────────────────────

function makeTempQuestion(): KTestQuestion {
    return { id: 0, question: "", answer: null, isActive: true, sortOrder: 0, scoreHistory: [], retention: 0 };
}

export function useKTestFlowHelper() {
    const {
        flowNodes, setFlowNodes,
        flowEdges, setFlowEdges,
        savedEdges, setSavedEdges,
        savedPositions, setSavedPositions,
        setConnectingSourceId,
        editingNodeId, setEditingNodeId,
        knowledgeId,
        setPendingSelectIds,
    } = useKTestFlowStore();

    const savedEdgesRef = useRef(savedEdges);
    const flowNodesRef = useRef(flowNodes);
    const knowledgeIdRef = useRef(knowledgeId);

    useEffect(() => { savedEdgesRef.current = savedEdges; }, [savedEdges]);
    useEffect(() => { flowNodesRef.current = flowNodes; }, [flowNodes]);
    useEffect(() => { knowledgeIdRef.current = knowledgeId; }, [knowledgeId]);
    const reconnectingRef = useRef(false);

    // IDs whose deselect changes should be blocked (drag, Ctrl+X, etc.)
    const selectionLockRef = useRef<Set<string>>(new Set());
    const lockSelectionTimer = useRef<ReturnType<typeof setTimeout>>();

    /** Block ReactFlow deselect changes for the given node IDs for `ms` milliseconds. */
    const lockSelection = (ids: string[], ms = 400) => {
        ids.forEach(id => selectionLockRef.current.add(id));
        clearTimeout(lockSelectionTimer.current);
        lockSelectionTimer.current = setTimeout(() => selectionLockRef.current.clear(), ms);
        console.log('[kflow] lockSelection', ids);
    };

    // ── Node change / edge change ───────────────────────────────────────────

    const handleNodesChange = (changes: NodeChange<Node<QuestionFlowNodeData>>[]) => {
        // Filter out deselect changes for selection-locked nodes
        const locked = selectionLockRef.current;
        const filtered = locked.size > 0
            ? changes.filter(c => !(c.type === 'select' && !(c as { type: 'select'; selected: boolean }).selected && locked.has((c as { type: 'select'; id: string }).id)))
            : changes;

        // Debug: log any select changes so we can see what ReactFlow sends
        const selChanges = changes.filter(c => c.type === 'select');
        if (selChanges.length > 0) {
            console.log('[kflow] onNodesChange select:', selChanges.map(c => `${(c as any).id}→${(c as any).selected}`), 'locked:', [...locked]);
        }

        setFlowNodes((prev) => applyNodeChanges(filtered, prev) as Node<QuestionFlowNodeData>[]);
    }

    const handleEdgesChange = (changes: EdgeChange<Edge<KFlowEdgeData>>[]) => {
        setFlowEdges((prev) => {
            // Block any select change while reconnecting — keeps edge selected + nubs visible
            if (reconnectingRef.current) return prev;
            const updated = applyEdgeChanges(changes, prev) as Edge<KFlowEdgeData>[];
            const hasSelectChange = changes.some((c) => c.type === 'select');
            if (!hasSelectChange) return updated;
            return updated.map((e) =>
                e.type === 'kQuestionEdge' ? { ...e, reconnectable: !!e.selected } : e,
            );
        });
    }

    // ── Node drag stop — persist positions ─────────────────────────────────

    const handleNodeDragStop =
        (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
            if (!draggedNodes.length) return;
            const draggedIds = new Set(draggedNodes.map((n) => n.id));
            console.log('[kflow] dragStop ids:', [...draggedIds], 'selected before lock:', draggedNodes.map(n => n.selected));

            // Block incoming ReactFlow deselect changes for dragged nodes
            lockSelection([...draggedIds]);

            requestAnimationFrame(() => {
                setFlowNodes((prev) => {
                    const posUpdate: Record<string, { x: number; y: number }> = {};
                    const payload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];
                    const updated = prev.map((n) => {
                        if (!draggedIds.has(n.id) || n.id.startsWith("temp-node-")) return n;
                        posUpdate[n.id] = n.position;
                        const nodeId = parseInt(n.id, 10);
                        if (nodeId) payload.push({ nodeId, nodeType: "kQuestion", x: n.position.x, y: n.position.y });
                        return { ...n, selected: true };
                    });
                    setSavedPositions((p) => ({ ...p, ...posUpdate }));
                    if (payload.length > 0) flowService._upsertPositions("", payload).catch(() => {});
                    return updated;
                });
            });
        }

    // ── Resolve nearest handle pair when connecting ────────────────────────

    const resolveHandles =
        (sourceId: string, targetId: string, sourceHandle?: string | null, targetHandle?: string | null) => {
            if (sourceHandle && targetHandle) return { sourceHandle, targetHandle };
            const srcNode = flowNodesRef.current.find((n) => n.id === sourceId);
            const tgtNode = flowNodesRef.current.find((n) => n.id === targetId);
            if (!srcNode || !tgtNode) return { sourceHandle: sourceHandle ?? "bottom", targetHandle: targetHandle ?? "top" };
            const W = 280;
            const srcH = srcNode.measured?.height ?? 120;
            const tgtH = tgtNode.measured?.height ?? 120;
            const dx = (tgtNode.position.x + W / 2) - (srcNode.position.x + W / 2);
            const dy = (tgtNode.position.y + tgtH / 2) - (srcNode.position.y + srcH / 2);
            const pair = Math.abs(dx) >= Math.abs(dy)
                ? (dx >= 0 ? { sourceHandle: "right", targetHandle: "left" } : { sourceHandle: "left", targetHandle: "right" })
                : (dy >= 0 ? { sourceHandle: "bottom", targetHandle: "top" } : { sourceHandle: "top", targetHandle: "bottom" });
            return { sourceHandle: sourceHandle ?? pair.sourceHandle, targetHandle: targetHandle ?? pair.targetHandle };
        }
    // ── Edge connect — persist ─────────────────────────────────────────────

    const handleConnect = async (connection: Connection) => {
        if (!connection.source || !connection.target) return;
        if (connection.source.startsWith("temp-node-") || connection.target.startsWith("temp-node-")) return;

        const { sourceHandle, targetHandle } = resolveHandles(
            connection.source, connection.target,
            connection.sourceHandle, connection.targetHandle,
        );

        const tempId = `temp-edge-${Date.now()}`;
        const newEdge: Edge<KFlowEdgeData> = {
            id: tempId, source: connection.source, target: connection.target,
            sourceHandle,
            targetHandle,
            type: "kQuestionEdge",
            data: { edgeId: 0, note: null, arrowDirection: "forward" },
        };
        setFlowEdges((prev) => addEdge(newEdge, prev) as Edge<KFlowEdgeData>[]);

        try {
            const result = await flowService._upsertEdges("", [{
                sourceId: parseInt(connection.source, 10), sourceType: "kQuestion",
                sourceHandle,
                targetId: parseInt(connection.target, 10), targetType: "kQuestion",
                targetHandle,
                note: null,
            }]);
            if (!result.success) throw new Error();
            const saved = (result.data as { id: number }[])?.[0];
            if (!saved?.id) throw new Error();
            const persisted: Edge<KFlowEdgeData> = { ...newEdge, id: `custom-${saved.id}`, data: { edgeId: saved.id, note: null, arrowDirection: "forward" } };
            setFlowEdges((prev) => prev.map((e) => (e.id === tempId ? persisted : e)));
            setSavedEdges((prev) => [...prev, persisted]);
        } catch {
            setFlowEdges((prev) => prev.filter((e) => e.id !== tempId));
        }
    }
    // ── Edge delete ────────────────────────────────────────────────────────

    const handleEdgeDelete = async (edgeId: string) => {
        const edge = savedEdgesRef.current.find((e) => e.id === edgeId);
        setFlowEdges((prev) => prev.filter((e) => e.id !== edgeId));
        setSavedEdges((prev) => prev.filter((e) => e.id !== edgeId));
        const backendId = edge?.data?.edgeId;
        if (!backendId) return;
        try {
            await flowService._upsertEdges("", [{
                id: backendId,
                sourceId: parseInt(edge!.source, 10), targetId: parseInt(edge!.target, 10),
                sourceHandle: edge!.sourceHandle ?? "bottom",
                targetHandle: edge!.targetHandle ?? "top",
                deletedAt: new Date().toISOString(),
            }]);
        } catch { /* silent */ }
    }

    // ── Edge direction toggle ─────────────────────────────────────────────

    const handleEdgeToggleDirection = async (edgeId: string, nextDir: ArrowDirection) => {
        const update = (prev: Edge<KFlowEdgeData>[]) =>
            prev.map((e) => e.id === edgeId ? { ...e, data: { ...(e.data as KFlowEdgeData), arrowDirection: nextDir } } : e);
        setFlowEdges(update);
        setSavedEdges(update);

        const edge = savedEdgesRef.current.find((e) => e.id === edgeId);
        const backendId = edge?.data?.edgeId;
        if (!backendId) return;
        try {
            await flowService._upsertEdges("", [{
                id: backendId,
                sourceId: parseInt(edge!.source, 10), targetId: parseInt(edge!.target, 10),
                arrowDirection: nextDir,
            }]);
        } catch { /* silent */ }
    }

    // ── Rename: start / cancel ─────────────────────────────────────────────

    const handleRenameStart = (nodeId: string) => {
        if (editingNodeId !== null) return;
        setEditingNodeId(nodeId);
    }
    const handleRenameCancel = (nodeId: string | null) => {
        setEditingNodeId(null);
        if (nodeId?.startsWith("temp-node-")) {
            setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
        }
    }

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

    // ── Rename confirm — create or update question ─────────────────────────

    const handleRenameConfirm = async (nodeId: string, questionText: string, answerText: string) => {
        const kId = knowledgeIdRef.current;
        const trimmedQ = questionText.trim();
        const trimmedA = answerText.trim();

        setEditingNodeId(null);

        // ── Temp node: create new question ───────────────────────────────
        if (nodeId.startsWith("temp-node-")) {
            if (!trimmedQ) {
                setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
                return;
            }

            const tempNode = flowNodesRef.current.find((n) => n.id === nodeId);
            if (!tempNode) return;

            // Optimistic label
            setFlowNodes((prev) => prev.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { question: { ...(n.data as QuestionFlowNodeData).question, question: trimmedQ, answer: trimmedA || null } } as QuestionFlowNodeData }
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
                    addQuestions: [{ name: trimmedQ, description: trimmedA || null }],
                    updateQuestions: [], toggleQuestionIds: [],
                    deleteQuestionIds: [], restoreQuestionIds: [],
                });

                const res = await getQForNode(kId);
                if (!res.success || !res.object) throw new Error();

                const newQ = res.object.questions.find((q) => !existingIds.has(q.id) && q.question === trimmedQ);
                if (!newQ) throw new Error();

                const realId = String(newQ.id);
                const pos = tempNode.position;

                // Save position for real ID so headless rebuilds the node at the right spot
                setSavedPositions((p) => ({ ...p, [realId]: pos }));
                flowService._upsertPositions("", [{ nodeId: newQ.id, nodeType: "kQuestion", x: pos.x, y: pos.y }]).catch(() => {});

                // Remove temp node — headless will add the real node when questions reload
                setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
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

        setFlowNodes((prev) => prev.map((n) =>
            n.id === nodeId
                ? { ...n, data: { question: { ...(n.data as QuestionFlowNodeData).question, question: trimmedQ, answer: trimmedA || null } } as QuestionFlowNodeData }
                : n,
        ));

        try {
            await updateQForNode(kId, {
                addQuestions: [], toggleQuestionIds: [],
                updateQuestions: [{ id: questionId, name: trimmedQ, description: trimmedA || null }],
                deleteQuestionIds: [], restoreQuestionIds: [],
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic already applied */ }
    }
    // ── Delete / restore question ──────────────────────────────────────────

    const handleDeleteQuestion = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as QuestionFlowNodeData), question: { ...(n.data as QuestionFlowNodeData).question, deletedAt: new Date().toISOString() } } }
                : n,
        ));
        try {
            await updateQForNode(kId, {
                addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
                deleteQuestionIds: [questionId], restoreQuestionIds: [],
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic applied */ }
    }
    const handleRestoreQuestion = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as QuestionFlowNodeData), question: { ...(n.data as QuestionFlowNodeData).question, deletedAt: undefined } } }
                : n,
        ));
        try {
            await updateQForNode(kId, {
                addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
                deleteQuestionIds: [], restoreQuestionIds: [questionId],
            });
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        } catch { /* silent — optimistic applied */ }
    }

    const handleMoveQuestion = async (questionIds: number[], targetNodeId: number | null) => {
        const kId = knowledgeIdRef.current;
        const idSet = new Set(questionIds.map(String));

        // ── 1. Collect current positions + compute relative offsets ──────────
        const movedNodes = flowNodesRef.current.filter((n) => idSet.has(n.id));
        const movedPos   = movedNodes.map((n) => ({ id: parseInt(n.id, 10), x: n.position.x, y: n.position.y }));
        const meanX      = movedPos.length ? movedPos.reduce((s, p) => s + p.x, 0) / movedPos.length : 0;
        const meanY      = movedPos.length ? movedPos.reduce((s, p) => s + p.y, 0) / movedPos.length : 0;
        const relPos     = movedPos.map((p) => ({ id: p.id, dx: p.x - meanX, dy: p.y - meanY }));

        // ── 2. Cross-boundary edges (one endpoint in moved set, other not) ───
        const crossEdges    = savedEdgesRef.current.filter((e) => idSet.has(e.source) !== idSet.has(e.target));
        const crossEdgeIds  = new Set(crossEdges.map((e) => e.id));

        // ── 3. Optimistic UI — remove nodes + cross edges ─────────────────
        setFlowNodes((prev) => prev.filter((n) => !idSet.has(n.id)));
        setFlowEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));
        setSavedEdges((prev) => prev.filter((e) => !crossEdgeIds.has(e.id)));

        try {
            // ── 4. Delete cross-boundary edges in backend ──────────────────
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

            // ── 5. Position conflict detection & resolution ────────────────
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

                    // Unpositioned target questions get grid positions
                    const targetPosArr = existingIds.map((id, i) => posMap[id] ?? _buildGridPos(i));

                    if (_hasOverlap(movedPos.map((p) => ({ x: p.x, y: p.y })), targetPosArr)) {
                        // Place moved group below the lowest target node, preserving relative layout
                        const maxTargetY = Math.max(...targetPosArr.map((p) => p.y)) + MOVE_NODE_H + 60;
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

            // ── 6. Move questions in backend ───────────────────────────────
            await Promise.all(questionIds.map((id) => KTestService._moveQuestion(id, targetNodeId)));

            // ── 7. Reload source + target views ───────────────────────────
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
            const targetEvent = targetNodeId === null ? null : targetNodeId;
            if (targetEvent !== nodeIdForEvent(kId)) {
                dispatchKFlowQuestionsChanged({ knowledgeId: targetEvent });
            }
        } catch {
            dispatchKFlowQuestionsChanged({ knowledgeId: nodeIdForEvent(kId) });
        }
    }
    // ── Paste questions (Ctrl+V) ───────────────────────────────────────────

    const handlePasteQuestions = async (
        clipboard: KFlowClipboard,
        targetNodeId: number | null,
        cursorFlowPos?: { x: number; y: number },
    ) => {
        const { questionIds, sourceNodeId } = clipboard;
        if (!questionIds.length) return;

        const idSet = new Set(questionIds.map(String));

        // ── 1. Fetch saved positions + all edges ──────────────────────────
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
            x: posMap[String(id)]?.x ?? _buildGridPos(i).x,
            y: posMap[String(id)]?.y ?? _buildGridPos(i).y,
        }));

        // ── 2. Place centroid at cursor (if provided) ─────────────────────
        console.log('[kflow] paste: raw movedPos', movedPos, 'cursorFlowPos', cursorFlowPos);
        if (cursorFlowPos && movedPos.length > 0) {
            const cx = movedPos.reduce((s, p) => s + p.x, 0) / movedPos.length;
            const cy = movedPos.reduce((s, p) => s + p.y, 0) / movedPos.length;
            const dx = cursorFlowPos.x - cx;
            const dy = cursorFlowPos.y - cy;
            movedPos = movedPos.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
            console.log('[kflow] paste: after cursor-center movedPos', movedPos, 'dx/dy', dx, dy);
        }

        // ── 3. Cross-boundary edges (one endpoint in clipboard set, other not) ──
        const crossEdgeDtos = allEdgeDtos.filter(
            (e) =>
                e.sourceType === "kQuestion" && e.targetType === "kQuestion" &&
                (idSet.has(String(e.sourceId)) !== idSet.has(String(e.targetId))),
        );

        // ── 4. Final positions — paste exactly at cursor, no overlap avoidance ──
        const finalPos: { nodeId: number; nodeType: "kQuestion"; x: number; y: number }[] =
            movedPos.map((p) => ({ nodeId: p.id, nodeType: "kQuestion", x: p.x, y: p.y }));

        // ── 5. Delete cross-boundary edges + upsert positions + move ─────
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

        // ── 6. Sync savedPositions so headless rebuilds at correct coords ──
        // If questionIdsKey hasn't changed (same-canvas paste), Effect 2 won't
        // re-fetch → nodes snap back without this patch.
        const patchedPosMap: Record<string, { x: number; y: number }> = {};
        finalPos.forEach((p) => { patchedPosMap[String(p.nodeId)] = { x: p.x, y: p.y }; });
        setSavedPositions((prev) => ({ ...prev, ...patchedPosMap }));

        // ── 7. Select pasted nodes + reload ──────────────────────────────
        setPendingSelectIds(questionIds);

        if (targetNodeId === sourceNodeId) {
            // Same-canvas paste: questions didn't move, positions already patched above.
            // No reload needed — Effect 3 will fire from savedPositions + pendingSelectIds changes.
        } else {
            // Cross-canvas paste: questions moved between nodes, both need reload.
            dispatchKFlowQuestionsChanged({ knowledgeId: sourceNodeId });
            dispatchKFlowQuestionsChanged({ knowledgeId: targetNodeId });
        }
    }

    // ── Connection tracking ────────────────────────────────────────────────

    const handleConnectStart =
        (_: unknown, params: { nodeId?: string | null }) => setConnectingSourceId(params.nodeId ?? null)

    const handleConnectEnd = () => setConnectingSourceId(null)
    // ── Reconnect (drag edge endpoint to new node) ─────────────────────────

    const handleReconnectStart = () => { reconnectingRef.current = true; }
    const handleReconnectEnd = () => {
        // Delay clear so handleEdgesChange's final deselect-after-drop is blocked
        setTimeout(() => { reconnectingRef.current = false; }, 80);
    }

    const handleReconnect = async (oldEdge: Edge<KFlowEdgeData>, newConnection: Connection) => {
        if (!newConnection.source || !newConnection.target) return;
        if (newConnection.source.startsWith('temp-node-') || newConnection.target.startsWith('temp-node-')) return;

        const { sourceHandle, targetHandle } = resolveHandles(
            newConnection.source, newConnection.target,
            newConnection.sourceHandle, newConnection.targetHandle,
        );

        const updatedEdge: Edge<KFlowEdgeData> = {
            ...oldEdge,
            source: newConnection.source,
            target: newConnection.target,
            sourceHandle,
            targetHandle,
            reconnectable: true,  // keep nubs visible — edge stays selected
        };

        setFlowEdges((prev) => prev.map((e: Edge<KFlowEdgeData>) => e.id === oldEdge.id ? updatedEdge : e));
        setSavedEdges((prev) => prev.map((e: Edge<KFlowEdgeData>) => e.id === oldEdge.id ? updatedEdge : e));

        const backendId = oldEdge.data?.edgeId;
        if (!backendId) return;

        try {
            await flowService._upsertEdges('', [{
                id: backendId,
                sourceId: parseInt(newConnection.source, 10), sourceType: 'kQuestion', sourceHandle,
                targetId: parseInt(newConnection.target, 10), targetType: 'kQuestion', targetHandle,
            }]);
        } catch { /* silent */ }
    }
    return {
        flowNodes, flowEdges, editingNodeId,
        handleNodesChange, handleEdgesChange,
        handleNodeDragStop, lockSelection,
        handleConnect, handleEdgeDelete, handleEdgeToggleDirection,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
        handleRenameStart, handleRenameConfirm, handleRenameCancel,
        handleDeleteQuestion, handleRestoreQuestion, handleMoveQuestion, handlePasteQuestions,
    };
}
