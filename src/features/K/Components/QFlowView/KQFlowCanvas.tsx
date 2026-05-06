import React, { useEffect, useRef } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, BackgroundVariant, ConnectionMode, SelectionMode, useReactFlow, useStoreApi } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import { useKQFlowHelper } from "@/features/K/hooks/qFlow/useKQFlow.helper";
import { useKQFlowCanvasHelper } from "@/features/K/hooks/qFlow/useKQFlowCanvas.helper";
import { useKQFlowDragHelper } from "@/features/K/hooks/qFlow/useKQFlowDrag.helper";
import { useKQFlowHeadless } from "@/features/K/hooks/qFlow/useKQFlow.headless";
import { useKQFlowCanvasReveal } from "@/features/K/hooks/qFlow/useKQFlowCanvasReveal.helper";
import { useKQFlowWheelZoom } from "@/features/K/hooks/qFlow/useKQFlowWheelZoom.helper";
import { useKQFlowShortcuts } from "@/features/K/hooks/qFlow/useKQFlowShortcuts.helper";
import { useMenuContextHelper } from "@/shared";
import { KQFlowNode } from "./small/KQFlowNode";
import { KQFlowEdge } from "./small/KQFlowEdge";
import type { KQuestion } from "@/features/K/types/kQuiz.type";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";
import type { Edge, Node } from "@xyflow/react";

const nodeTypes = { questionFlowNode: KQFlowNode };
const edgeTypes = { kQuestionEdge: KQFlowEdge };

function makeTempQuestion(): KQuestion {
    return { id: 0, question: "", answer: null, statusCode: "learning", sortOrder: 0, scoreHistory: [], retention: 0 };
}

interface CanvasContentProps {
    knowledgeId: number;
    questions: KQuestion[];
    showDeleted: boolean;
    loading: boolean;
}

function KQFlowCanvasContent({ knowledgeId, questions, showDeleted, loading }: CanvasContentProps) {
    useKQFlowHeadless(knowledgeId, questions, showDeleted);
    const { setKnowledgeId, setFlowNodes, setEditingNodeId, positionsLoaded, flowNodes, flowEdges } = useKQFlowStore();
    const storeNodes = flowNodes;
    const rfInstance = useReactFlow();
    const storeApi = useStoreApi();

    // ── Canvas reveal (overlay / viewport restore / fitView) ─────────────────
    const { isCanvasReady } = useKQFlowCanvasReveal({
        knowledgeId,
        loading,
        questionsLength: questions.length,
        storeNodesLength: storeNodes.length,
        positionsLoaded,
    });

    const containerRef = useRef<HTMLDivElement>(null);

    // ── Custom wheel zoom + viewport persistence ───────────────────────────
    const { handleMoveEnd } = useKQFlowWheelZoom(containerRef, knowledgeId);

    const {
        selectionLockRef, lockSelection,
        handleEdgesChange,
        handleConnect,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
        handleEdgeDelete, handleEdgeReoptimize,
        handleOrganize,
    } = useKQFlowCanvasHelper();

    const { handleNodesChange, handleNodeDragStart, handleNodeDrag, handleNodeDragStop } =
        useKQFlowDragHelper(selectionLockRef, lockSelection);
    const { handleDeleteQuestion, handlePasteQuestions } = useKQFlowHelper();
    const { showContextMenu } = useMenuContextHelper();

    // ── Keyboard shortcuts (delete / cut / paste / escape / ctrl+o) ──────────
    const selectedEdgeIds = flowEdges.filter((e) => e.selected).map((e) => e.id);
    const selectedNodeIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
        .map((n) => parseInt(n.id, 10));
    const selectedStringIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
        .map((n) => n.id);
    const targetNodeId = knowledgeId === 0 ? null : knowledgeId;

    useKQFlowShortcuts({
        selectedEdgeIds,
        selectedNodeIds,
        selectedStringIds,
        handleEdgeDelete,
        handleDeleteQuestion,
        handleOrganize,
        lockSelection,
        targetNodeId,
        handlePasteQuestions,
    });

    const isDragSelecting = useRef(false);

    // ReactFlow's nodesSelectionActive overlay intercepts pointer events by
    // default. We disable that with pointer-events:none via CSS so onNodeClick
    // fires normally; Shift+click deselect is handled manually here.
    const handleNodeClick = (e: React.MouseEvent, node: Node) => {
        if (e.shiftKey && node.selected) {
            handleNodesChange([{ id: node.id, type: "select" as const, selected: false }]);
        }
    };

    // During drag-selection we suppress edge selection so that rubber-banding
    // over edges doesn't unintentionally select them.
    const handleSelectionChange = ({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: { id: string }[] }) => {
        if (isDragSelecting.current && selEdges.length > 0) {
            handleEdgesChange(selEdges.map((e) => ({ id: e.id, type: "select" as const, selected: false })));
        }
        const store = storeApi.getState() as unknown as { nodesSelectionActive: boolean };
        if (selNodes.length > 1 && !store.nodesSelectionActive) {
            storeApi.setState({ nodesSelectionActive: true });
        } else if (selNodes.length <= 1 && store.nodesSelectionActive) {
            storeApi.setState({ nodesSelectionActive: false });
        }
    };

    useEffect(() => { setKnowledgeId(knowledgeId); }, [knowledgeId]);

    const handlePaneContextMenu = (event: MouseEvent | React.MouseEvent) => {
        event.preventDefault();
        const flowPos = rfInstance.screenToFlowPosition({
            x: (event as React.MouseEvent).clientX,
            y: (event as React.MouseEvent).clientY,
        });
        const selectedIds = flowNodes
            .filter((n) => n.selected && !(n.data as KQFlowNodeData).question.deletedAt)
            .map((n) => parseInt(n.id, 10));

        showContextMenu(
            event as React.MouseEvent,
            "k-quiz-flow",
            {
                onAddQuestion: () => {
                    const tempId = `temp-node-${Date.now()}`;
                    const tempNode: Node<KQFlowNodeData> = {
                        id: tempId, type: "questionFlowNode",
                        position: { x: flowPos.x - 140, y: flowPos.y - 60 },
                        data: { question: makeTempQuestion() },
                    };
                    setFlowNodes((prev) => [...prev, tempNode]);
                    setEditingNodeId(tempId);
                },
                onDeleteSelected: selectedIds.length > 0
                    ? () => selectedIds.forEach((id) => handleDeleteQuestion(id))
                    : undefined,
                onOrganize: selectedStringIds.length >= 2
                    ? () => handleOrganize(selectedStringIds)
                    : undefined,
                selectedIds,
            },
        );
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full kflow-canvas relative"
        >
            {/* Layer order: edges (0) → nodes (1) → edge labels (2).
                Edges must render below nodes even when their path geometrically
                crosses a node rectangle. */}
            <style>{`
                .kflow-canvas .react-flow__nodesselection-rect { pointer-events: none !important; }
                .kflow-canvas .react-flow__edges      { z-index: 0; }
                .kflow-canvas .react-flow__nodes      { z-index: 1; }
                .kflow-canvas .react-flow__edgelabels { z-index: 2; }
            `}</style>

            {/* Transition overlay — snaps to opaque instantly (no transition class
                on opacity-100) so viewport teleports are never visible; fades out
                smoothly once the canvas is fully ready */}
            <div
                className={`absolute inset-0 z-50 bg-zinc-950 ${
                    isCanvasReady
                        ? "opacity-0 pointer-events-none transition-opacity duration-150"
                        : "opacity-100"
                }`}
            />
            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onNodeDragStart={handleNodeDragStart}
                onNodeDrag={handleNodeDrag}
                onNodeDragStop={handleNodeDragStop}
                onConnect={handleConnect}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onReconnectStart={handleReconnectStart}
                onReconnectEnd={handleReconnectEnd}
                onReconnect={handleReconnect}
                onEdgeDoubleClick={(_: React.MouseEvent, edge: Edge) => handleEdgeReoptimize(edge.id)}
                onPaneContextMenu={handlePaneContextMenu}
                onNodeClick={handleNodeClick}
                onSelectionChange={handleSelectionChange}
                onSelectionStart={() => { isDragSelecting.current = true; }}
                onSelectionEnd={() => { isDragSelecting.current = false; }}
                onMoveEnd={handleMoveEnd}
                selectionOnDrag
                selectNodesOnDrag
                connectionMode={ConnectionMode.Loose}
                connectionRadius={80}
                minZoom={0.15}
                maxZoom={2}
                defaultEdgeOptions={{ type: "kQuestionEdge" }}
                deleteKeyCode={null}
                selectionKeyCode={null}
                multiSelectionKeyCode="Shift"
                selectionMode={SelectionMode.Partial}
                zoomOnScroll={false}
                panOnScroll={false}
                panOnDrag={[1]}
            >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(113,113,122,0.2)" />
                <Controls showInteractive={false} />
                <MiniMap
                    nodeColor={() => "rgba(99,102,241,0.4)"}
                    maskColor="rgba(0,0,0,0.6)"
                    style={{ background: "rgba(24,24,27,0.9)" }}
                />
            </ReactFlow>
        </div>
    );
}

interface KQFlowCanvasProps {
    knowledgeId: number;
    questions: KQuestion[];
    showDeleted: boolean;
    loading: boolean;
}

export function KQFlowCanvas({ knowledgeId, questions, showDeleted, loading }: KQFlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <KQFlowCanvasContent
                knowledgeId={knowledgeId}
                questions={questions}
                showDeleted={showDeleted}
                loading={loading}
            />
        </ReactFlowProvider>
    );
}
