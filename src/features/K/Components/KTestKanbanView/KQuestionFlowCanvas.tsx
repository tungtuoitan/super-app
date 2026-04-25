import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, BackgroundVariant, ConnectionMode, SelectionMode, useReactFlow, useStoreApi } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import { useKTestFlowHelper } from "@/features/K/hooks/useKTestFlow.helper";
import { useKTestFlowHeadless } from "@/features/K/hooks/useKTestFlow.headless";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { QuestionFlowNode } from "./small/QuestionFlowNode";
import { KQuestionFlowEdge } from "./small/KQuestionFlowEdge";
import { constants } from "@/utils/constants";
import { useGlobalShortcut } from "@/shared/hooks/useGlobalShortcut";
import type { KTestQuestion } from "@/features/K/types/kTest.type";
import type { QuestionFlowNodeData } from "@/features/K/types/kTestFlow.type";
import type { Node } from "@xyflow/react";

const PAN_SPEED = 0.8;

const nodeTypes = { questionFlowNode: QuestionFlowNode };
const edgeTypes = { kQuestionEdge: KQuestionFlowEdge };

function makeTempQuestion(): KTestQuestion {
    return { id: 0, question: "", answer: null, isActive: true, sortOrder: 0, scoreHistory: [], retention: 0 };
}

interface CanvasContentProps {
    selectedTestId: number | null;
    questions: KTestQuestion[];
    knowledgeId: number;
    showDeleted: boolean;
    onQuestionsChanged: () => void;
}

function KQuestionFlowCanvasContent({ selectedTestId, questions, knowledgeId, showDeleted, onQuestionsChanged }: CanvasContentProps) {
    useKTestFlowHeadless(selectedTestId, questions, showDeleted);
    const { setKnowledgeId, setActiveTestId, setFlowNodes, setEditingNodeId, positionsLoaded, flowNodes: storeNodes } = useKTestFlowStore();
    const rfInstance = useReactFlow();
    const storeApi = useStoreApi();
    const [hasFitView, setHasFitView] = useState(false);

    // Reset fit-view tracking whenever the selected test changes
    useEffect(() => { setHasFitView(false); }, [selectedTestId]);

    // Fit once after positions finish loading and nodes are present
    useEffect(() => {
        if (positionsLoaded && storeNodes.length > 0 && !hasFitView) {
            setHasFitView(true);
            setTimeout(() => rfInstance.fitView({ padding: 0.2, duration: 250 }), 30);
        }
    }, [positionsLoaded, storeNodes.length, hasFitView, rfInstance]);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        flowNodes, flowEdges,
        handleNodesChange, handleEdgesChange,
        handleNodeDragStop, handleConnect,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
        handleDeleteQuestion,
        handleEdgeDelete
    } = useKTestFlowHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();

    // Delete selected edges with Delete/Backspace (higher priority)
    const selectedEdgeIds = flowEdges.filter((e) => e.selected).map((e) => e.id);
    useGlobalShortcut("delete", { id: "kflow-delete-edge", priority: 65, enabled: selectedEdgeIds.length > 0 }, () => {
        selectedEdgeIds.forEach((id) => handleEdgeDelete(id));
        return true;
    });
    useGlobalShortcut("backspace", { id: "kflow-backspace-edge", priority: 65, enabled: selectedEdgeIds.length > 0 }, () => {
        selectedEdgeIds.forEach((id) => handleEdgeDelete(id));
        return true;
    });

    // Delete selected nodes (only when no edges are selected)
    const selectedNodeIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as QuestionFlowNodeData).question.deletedAt)
        .map((n) => parseInt(n.id, 10));
    useGlobalShortcut("delete", { id: "kflow-delete-nodes", priority: 60, enabled: selectedNodeIds.length > 0 && selectedEdgeIds.length === 0 }, () => {
        selectedNodeIds.forEach((id) => handleDeleteQuestion(id));
        return true;
    });
    useGlobalShortcut("backspace", { id: "kflow-backspace-nodes", priority: 60, enabled: selectedNodeIds.length > 0 && selectedEdgeIds.length === 0 }, () => {
        selectedNodeIds.forEach((id) => handleDeleteQuestion(id));
        return true;
    });

    const isDragSelecting = useRef(false);

    // nodesSelectionActive overlay intercepts pointer events — pointer-events:none via CSS
    // so onNodeClick fires normally; we only need to manually deselect on Shift+click
    const handleNodeClick = useCallback((e: React.MouseEvent, node: Node) => {
        if (e.shiftKey && node.selected) {
            handleNodesChange([{ id: node.id, type: "select" as const, selected: false }]);
        }
    }, [handleNodesChange]);

    const handleSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: { id: string }[] }) => {
        if (isDragSelecting.current && selEdges.length > 0) {
            handleEdgesChange(selEdges.map((e) => ({ id: e.id, type: "select" as const, selected: false })));
        }
        // Blue overlay bounding box — safe now that the rect has pointer-events:none
        const store = storeApi.getState() as any;
        if (selNodes.length > 1 && !store.nodesSelectionActive) {
            storeApi.setState({ nodesSelectionActive: true });
        } else if (selNodes.length <= 1 && store.nodesSelectionActive) {
            storeApi.setState({ nodesSelectionActive: false });
        }
    }, [handleEdgesChange, storeApi]);

    useEffect(() => { setKnowledgeId(knowledgeId); }, [knowledgeId, setKnowledgeId]);
    useEffect(() => { setActiveTestId(selectedTestId); }, [selectedTestId, setActiveTestId]);

    // Scroll=pan, Shift+scroll=horizontal, Ctrl+scroll=zoom
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as HTMLElement)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const { x, y, zoom } = rfInstance.getViewport();
            if (e.ctrlKey) {
                const factor = e.deltaY > 0 ? 0.92 : 1.08;
                const newZoom = Math.min(Math.max(zoom * factor, 0.15), 2);
                const rect = el.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                rfInstance.setViewport({ x: cx - (cx - x) * (newZoom / zoom), y: cy - (cy - y) * (newZoom / zoom), zoom: newZoom });
            } else if (e.shiftKey) {
                rfInstance.setViewport({ x: x - e.deltaY * PAN_SPEED, y, zoom });
            } else {
                rfInstance.setViewport({ x, y: y - e.deltaY * PAN_SPEED, zoom });
            }
        };
        document.addEventListener("wheel", onWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    }, [rfInstance]);

    // Toolbar "Add Question" button → place node at canvas center
    useEffect(() => {
        const handler = () => {
            if (!selectedTestId) return;
            const { x, y, zoom } = rfInstance.getViewport();
            const canvasX = (-x + window.innerWidth / 2) / zoom - 140;
            const canvasY = (-y + window.innerHeight / 2) / zoom - 80 + (Math.random() * 60 - 30);
            const tempId = `temp-node-${Date.now()}`;
            const tempNode: Node<QuestionFlowNodeData> = {
                id: tempId, type: "questionFlowNode",
                position: { x: canvasX, y: canvasY },
                data: { question: makeTempQuestion() },
            };
            setFlowNodes((prev) => [...prev, tempNode]);
            setEditingNodeId(tempId);
        };
        window.addEventListener("kflow:add-question", handler);
        return () => window.removeEventListener("kflow:add-question", handler);
    }, [selectedTestId, rfInstance, setFlowNodes, setEditingNodeId]);

    useEffect(() => {
        const handler = () => onQuestionsChanged();
        window.addEventListener("kflow:questions-changed", handler);
        return () => window.removeEventListener("kflow:questions-changed", handler);
    }, [onQuestionsChanged]);

    const handlePaneContextMenu = useCallback(
        (event: MouseEvent | React.MouseEvent) => {
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
                constants.contextMenu.contextMenuTypes.kTestFlow,
                {
                    onAddQuestion: () => {
                        if (!selectedTestId) return;
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
        },
        [rfInstance, flowNodes, selectedTestId, setFlowNodes, setEditingNodeId, showContextMenu, handleDeleteQuestion],
    );

    if (!selectedTestId) {
        return (
            <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm h-full">
                Select a test to view its question graph
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full h-full kflow-canvas">
            {/* Make the selection bounding box non-interactive so node clicks pass through */}
            <style>{`.kflow-canvas .react-flow__nodesselection-rect { pointer-events: none !important; }`}</style>
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
    selectedTestId: number | null;
    questions: KTestQuestion[];
    knowledgeId: number;
    showDeleted: boolean;
    onQuestionsChanged: () => void;
}

export function KQuestionFlowCanvas({ selectedTestId, questions, knowledgeId, showDeleted, onQuestionsChanged }: KQuestionFlowCanvasProps) {
    return (
        <ReactFlowProvider>
            <KQuestionFlowCanvasContent
                selectedTestId={selectedTestId}
                questions={questions}
                knowledgeId={knowledgeId}
                showDeleted={showDeleted}
                onQuestionsChanged={onQuestionsChanged}
            />
        </ReactFlowProvider>
    );
}
