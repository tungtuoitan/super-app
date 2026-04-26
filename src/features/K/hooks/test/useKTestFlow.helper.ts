import { useCallback, useEffect, useRef } from "react";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import type { NodeChange, EdgeChange, Connection, Edge, Node } from "@xyflow/react";
import { flowService } from "@/features/multiProject/service/flow.service";
import { KTestService } from "@/features/K/service/kTest.service";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import type { KFlowEdgeData, QuestionFlowNodeData, ArrowDirection } from "@/features/K/types/kTestFlow.type";
import type { KTestQuestion } from "@/features/K/types/kTest.type";

const ARROW_CYCLE: ArrowDirection[] = ["forward", "backward", "both"];

function makeTempQuestion(): KTestQuestion {
    return { id: 0, question: "", answer: null, isActive: true, sortOrder: 0, scoreHistory: [], retention: 0 };
}

export function useKTestFlowHelper() {
    const {
        flowNodes, setFlowNodes,
        flowEdges, setFlowEdges,
        savedEdges, setSavedEdges,
        setSavedPositions,
        setConnectingSourceId,
        editingNodeId, setEditingNodeId,
        knowledgeId, activeTestId,
    } = useKTestFlowStore();

    const savedEdgesRef = useRef(savedEdges);
    const flowNodesRef = useRef(flowNodes);
    const knowledgeIdRef = useRef(knowledgeId);
    const activeTestIdRef = useRef(activeTestId);

    useEffect(() => { savedEdgesRef.current = savedEdges; }, [savedEdges]);
    useEffect(() => { flowNodesRef.current = flowNodes; }, [flowNodes]);
    useEffect(() => { knowledgeIdRef.current = knowledgeId; }, [knowledgeId]);
    useEffect(() => { activeTestIdRef.current = activeTestId; }, [activeTestId]);
    const reconnectingRef = useRef(false);

    // ── Node change / edge change ───────────────────────────────────────────

    const handleNodesChange = (changes: NodeChange<Node<QuestionFlowNodeData>>[]) => {
        setFlowNodes((prev) => applyNodeChanges(changes, prev) as Node<QuestionFlowNodeData>[]);
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
            requestAnimationFrame(() => {
                setFlowNodes((prev) => {
                    const draggedIds = new Set(draggedNodes.map((n) => n.id));
                    const posUpdate: Record<string, { x: number; y: number }> = {};
                    const payload: { nodeId: number; nodeType: string; x: number; y: number }[] = [];
                    const updated = prev.map((n) => {
                        if (!draggedIds.has(n.id) || n.id.startsWith("temp-node-")) return n;
                        posUpdate[n.id] = n.position;
                        const nodeId = parseInt(n.id, 10);
                        if (nodeId) payload.push({ nodeId, nodeType: "kQuestion", x: n.position.x, y: n.position.y });
                        return n;
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

    // ── Rename confirm — create or update question ─────────────────────────

    const handleRenameConfirm = async (nodeId: string, questionText: string, answerText: string) => {
        const kId = knowledgeIdRef.current;
        const testId = activeTestIdRef.current;
        const trimmedQ = questionText.trim();
        const trimmedA = answerText.trim();

        setEditingNodeId(null);

        // ── Temp node: create new question ───────────────────────────────
        if (nodeId.startsWith("temp-node-")) {
            if (!trimmedQ || !testId) {
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
                await KTestService._updateQuestions(kId, testId, {
                    addQuestions: [{ name: trimmedQ, description: trimmedA || null }],
                    updateQuestions: [], toggleQuestionIds: [],
                    deleteQuestionIds: [], restoreQuestionIds: [],
                });

                const res = await KTestService._getTestDetail(kId, testId);
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
                window.dispatchEvent(new CustomEvent("kflow:questions-changed", { detail: { testId } }));
            } catch {
                setFlowNodes((prev) => prev.filter((n) => n.id !== nodeId));
            }
            return;
        }

        // ── Existing node: update question ────────────────────────────────
        if (!trimmedQ || !testId) return;

        const questionId = parseInt(nodeId, 10);
        if (!questionId) return;

        setFlowNodes((prev) => prev.map((n) =>
            n.id === nodeId
                ? { ...n, data: { question: { ...(n.data as QuestionFlowNodeData).question, question: trimmedQ, answer: trimmedA || null } } as QuestionFlowNodeData }
                : n,
        ));

        try {
            await KTestService._updateQuestions(kId, testId, {
                addQuestions: [], toggleQuestionIds: [],
                updateQuestions: [{ id: questionId, name: trimmedQ, description: trimmedA || null }],
                deleteQuestionIds: [], restoreQuestionIds: [],
            });
            window.dispatchEvent(new CustomEvent("kflow:questions-changed", { detail: { testId } }));
        } catch { /* silent — optimistic already applied */ }
    }
    // ── Delete / restore question ──────────────────────────────────────────

    const handleDeleteQuestion = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        const testId = activeTestIdRef.current;
        if (!testId) return;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as QuestionFlowNodeData), question: { ...(n.data as QuestionFlowNodeData).question, deletedAt: new Date().toISOString() } } }
                : n,
        ));
        try {
            await KTestService._updateQuestions(kId, testId, {
                addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
                deleteQuestionIds: [questionId], restoreQuestionIds: [],
            });
            window.dispatchEvent(new CustomEvent("kflow:questions-changed", { detail: { testId } }));
        } catch { /* silent — optimistic applied */ }
    }
    const handleRestoreQuestion = async (questionId: number) => {
        const kId = knowledgeIdRef.current;
        const testId = activeTestIdRef.current;
        if (!testId) return;
        setFlowNodes((prev) => prev.map((n) =>
            n.id === String(questionId)
                ? { ...n, data: { ...(n.data as QuestionFlowNodeData), question: { ...(n.data as QuestionFlowNodeData).question, deletedAt: undefined } } }
                : n,
        ));
        try {
            await KTestService._updateQuestions(kId, testId, {
                addQuestions: [], updateQuestions: [], toggleQuestionIds: [],
                deleteQuestionIds: [], restoreQuestionIds: [questionId],
            });
            window.dispatchEvent(new CustomEvent("kflow:questions-changed", { detail: { testId } }));
        } catch { /* silent — optimistic applied */ }
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
        handleNodeDragStop,
        handleConnect, handleEdgeDelete, handleEdgeToggleDirection,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
        handleRenameStart, handleRenameConfirm, handleRenameCancel,
        handleDeleteQuestion, handleRestoreQuestion,
    };
}
