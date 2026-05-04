import React, { useEffect, useRef } from "react";
import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, BackgroundVariant, ConnectionMode, SelectionMode, useReactFlow, useStoreApi } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import { useKTestFlowHelper } from "@/features/K/hooks/test/useKTestFlow.helper";
import { useKTestFlowCanvasHelper } from "@/features/K/hooks/test/useKTestFlowCanvas.helper";
import { useKTestFlowHeadless } from "@/features/K/hooks/test/useKTestFlow.headless";
import { useKFlowCanvasReveal } from "@/features/K/hooks/test/useKFlowCanvasReveal.helper";
import { useKFlowWheelZoom } from "@/features/K/hooks/test/useKFlowWheelZoom.helper";
import { useKFlowShortcuts } from "@/features/K/hooks/test/useKFlowShortcuts.helper";
import { useMenuContextHelper } from "@/shared";
import { QuestionFlowNode } from "./small/QuestionFlowNode";
import { KQuestionFlowEdge } from "./small/KQuestionFlowEdge";
import type { KTestQuestion } from "@/features/K/types/kTest.type";
import type { QuestionFlowNodeData } from "@/features/K/types/kTestFlow.type";
import type { Node } from "@xyflow/react";

const nodeTypes = { questionFlowNode: QuestionFlowNode };
const edgeTypes = { kQuestionEdge: KQuestionFlowEdge };

function makeTempQuestion(): KTestQuestion {
    return { id: 0, question: "", answer: null, isActive: true, isDraft: false, sortOrder: 0, scoreHistory: [], retention: 0 };
}

interface CanvasContentProps {
    knowledgeId: number;
    questions: KTestQuestion[];
    showDeleted: boolean;
    loading: boolean;
}

function KQuestionFlowCanvasContent({ knowledgeId, questions, showDeleted, loading }: CanvasContentProps) {
    useKTestFlowHeadless(knowledgeId, questions, showDeleted);
    const { setKnowledgeId, setFlowNodes, setEditingNodeId, positionsLoaded, flowNodes, flowEdges } = useKTestFlowStore();
    const storeNodes = flowNodes;
    const rfInstance = useReactFlow();
    const storeApi = useStoreApi();

    // ── Canvas reveal (overlay / viewport restore / fitView) ─────────────────
    const { isCanvasReady } = useKFlowCanvasReveal({
        knowledgeId,
        loading,
        questionsLength: questions.length,
        storeNodesLength: storeNodes.length,
        positionsLoaded,
    });

    const containerRef = useRef<HTMLDivElement>(null);

    // ── Custom wheel zoom + viewport persistence ───────────────────────────
    const { handleMoveEnd } = useKFlowWheelZoom(containerRef, knowledgeId);

    const {
        handleNodesChange, handleEdgesChange,
        handleNodeDragStop, lockSelection,
        handleConnect,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
        handleEdgeDelete,
    } = useKTestFlowCanvasHelper();
    const { handleDeleteQuestion, handlePasteQuestions } = useKTestFlowHelper();
    const { showContextMenu } = useMenuContextHelper();

    // ── Keyboard shortcuts (delete / cut / paste / escape) ────────────────────
    const selectedEdgeIds = flowEdges.filter((e) => e.selected).map((e) => e.id);
    const selectedNodeIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as QuestionFlowNodeData).question.deletedAt)
        .map((n) => parseInt(n.id, 10));
    const targetNodeId = knowledgeId === 0 ? null : knowledgeId;

    useKFlowShortcuts({
        selectedEdgeIds,
        selectedNodeIds,
        handleEdgeDelete,
        handleDeleteQuestion,
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
        const store = storeApi.getState() as any;
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
            .filter((n) => n.selected && !(n.data as QuestionFlowNodeData).question.deletedAt)
            .map((n) => parseInt(n.id, 10));

        showContextMenu(
            event as React.MouseEvent,
            "k-test-flow",
            {
                onAddQuestion: () => {
                    const tempId = `temp-node-${Date.now()}`;
                    const tempNode: Node<QuestionFlowNodeData> = {
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
                selectedIds,
            },
        );
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full kflow-canvas relative"
        >
            {/* Disable pointer events on ReactFlow's selection rect so clicks on
                nodes behind the bounding box still register */}
            <style>{`.kflow-canvas .react-flow__nodesselection-rect { pointer-events: none !important; }`}</style>

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
                onNodeDragStop={handleNodeDragStop}
                onConnect={handleConnect}
                onConnectStart={handleConnectStart}
                onConnectEnd={handleConnectEnd}
                onReconnectStart={handleReconnectStart}
                onReconnectEnd={handleReconnectEnd}
                onReconnect={handleReconnect}
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

interface KQuestionFlowCanvasProps {
    knowledgeId: number;
    questions: KTestQuestion[];
    showDeleted: boolean;
    loading: boolean;
}

export function KQuestionFlowCanvas({ knowledgeId, questions, showDeleted, loading }: KQuestionFlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <KQuestionFlowCanvasContent
                knowledgeId={knowledgeId}
                questions={questions}
                showDeleted={showDeleted}
                loading={loading}
            />
        </ReactFlowProvider>
    );
}
