import { ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, BackgroundVariant, ConnectionMode, SelectionMode, useReactFlow, useStoreApi, useNodesInitialized } from "@xyflow/react";
import type { Viewport } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import { useKTestFlowHelper } from "@/features/K/hooks/test/useKTestFlow.helper";
import { useKTestFlowHeadless } from "@/features/K/hooks/test/useKTestFlow.headless";
import { useMenuContextHelper } from "@/shared";
import { QuestionFlowNode } from "./small/QuestionFlowNode";
import { KQuestionFlowEdge } from "./small/KQuestionFlowEdge";
import { useGlobalShortcut } from "@/shared";
import { useKStore } from "@/features/K/store/K.store";
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
    knowledgeId: number;
    questions: KTestQuestion[];
    showDeleted: boolean;
    loading: boolean;
}

function KQuestionFlowCanvasContent({ knowledgeId, questions, showDeleted, loading }: CanvasContentProps) {
    useKTestFlowHeadless(knowledgeId, questions, showDeleted);
    const { setKnowledgeId, setFlowNodes, setEditingNodeId, positionsLoaded, flowNodes: storeNodes } = useKTestFlowStore();
    const rfInstance = useReactFlow();
    const storeApi = useStoreApi();
    const [hasFitView, setHasFitView] = useState(false);
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    const { kFlowClipboard, setKFlowClipboard, kFlowViewportMap, setKFlowViewportMap } = useKStore();

    // Returns true once ReactFlow's ResizeObserver has measured every rendered
    // node (width + height non-zero). More reliable than rAF timing because it
    // fires at the exact moment nodes are positioned — not one frame earlier.
    const nodesInitialized = useNodesInitialized();

    // ── Overlay: instant hide on node switch ──────────────────────────────────
    //
    // WHY useLayoutEffect instead of useEffect:
    //   useEffect fires AFTER the browser has already painted the new frame.
    //   That means for one frame the canvas renders with the stale isCanvasReady=true
    //   from the previous node, causing a visible flash of old content.
    //   useLayoutEffect fires synchronously after React's DOM commit but BEFORE
    //   the browser paints — so setIsCanvasReady(false) is applied and React
    //   re-renders within the same paint, making the overlay always opaque on
    //   the very first frame the new knowledgeId is visible.
    useLayoutEffect(() => {
        setIsCanvasReady(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeId]);

    // ── Viewport restoration on node switch ──────────────────────────────────
    //
    // Runs AFTER paint (useEffect), by which time the overlay is already opaque
    // (see useLayoutEffect above). The actual setViewport call is deferred one
    // more rAF so the opaque overlay has fully committed to the DOM before the
    // camera teleports — the user never sees a viewport jump.
    // If no saved viewport exists this is the first visit: fitView will run later
    // once nodes are measured (see reveal effect below).
    useEffect(() => {
        const saved = kFlowViewportMap[knowledgeId];
        if (saved) {
            setHasFitView(true);
            requestAnimationFrame(() => rfInstance.setViewport(saved));
        } else {
            setHasFitView(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [knowledgeId]);

    // ── Canvas reveal ─────────────────────────────────────────────────────────
    //
    // Lifts the overlay only when all three conditions are met:
    //   1. loading=false        — questions have been fetched from the server
    //   2. positionsLoaded=true — saved node positions have been fetched
    //   3. nodes measured       — ReactFlow's ResizeObserver has sized every node
    //                             (nodesInitialized=true), OR there are genuinely
    //                             no nodes to show
    //
    // Special cases:
    //   • storeNodes=0 + questions=0  → truly empty canvas, reveal immediately
    //   • storeNodes=0 + questions>0  → rebuild not yet run, wait
    //   • no saved viewport (hasFitView=false) → run fitView first, then reveal
    //     after one rAF so the fitted viewport paints before the overlay lifts
    useEffect(() => {
        if (loading) return;
        if (!positionsLoaded) return;

        if (storeNodes.length === 0) {
            // Reveal immediately only when the canvas is genuinely empty.
            // If questions exist, the rebuild effect hasn't populated storeNodes yet — wait.
            if (questions.length === 0) setIsCanvasReady(true);
            return;
        }

        // Wait until ReactFlow has measured all nodes; without this the overlay
        // would lift before nodes are positioned, causing a layout jump.
        if (!nodesInitialized) return;

        if (!hasFitView) {
            // First visit — no saved viewport. Run fitView synchronously (duration:0)
            // then defer the reveal by one rAF so the fitted viewport commits to the
            // DOM before the overlay becomes transparent.
            setHasFitView(true);
            rfInstance.fitView({ padding: 0.2, duration: 0 });
            requestAnimationFrame(() => setIsCanvasReady(true));
        } else {
            // Saved viewport was already restored in the rAF above — reveal now.
            setIsCanvasReady(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, positionsLoaded, storeNodes.length, questions.length, nodesInitialized, hasFitView, rfInstance]);

    const containerRef = useRef<HTMLDivElement>(null);
    const {
        flowNodes, flowEdges,
        handleNodesChange, handleEdgesChange,
        handleNodeDragStop, lockSelection,
        handleConnect,
        handleConnectStart, handleConnectEnd,
        handleReconnect, handleReconnectStart, handleReconnectEnd,
        handleDeleteQuestion,
        handleEdgeDelete,
        handlePasteQuestions,
    } = useKTestFlowHelper();
    const { showContextMenu } = useMenuContextHelper();

    // Delete selected edges (higher priority than node delete so edge-only
    // selections don't accidentally trigger node deletion)
    const selectedEdgeIds = flowEdges.filter((e) => e.selected).map((e) => e.id);
    useGlobalShortcut("delete", { id: "kflow-delete-edge", priority: 65, enabled: selectedEdgeIds.length > 0 }, () => {
        selectedEdgeIds.forEach((id) => handleEdgeDelete(id));
    });
    // Delete selected nodes — only fires when no edges are selected
    const selectedNodeIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as QuestionFlowNodeData).question.deletedAt)
        .map((n) => parseInt(n.id, 10));
    useGlobalShortcut("delete", { id: "kflow-delete-nodes", priority: 60, enabled: selectedNodeIds.length > 0 && selectedEdgeIds.length === 0 }, () => {
        selectedNodeIds.forEach((id) => handleDeleteQuestion(id));
    });

    // ── Mouse position tracking (for cursor-positioned paste) ─────────────────
    // Document-level so the ref stays current even when the mouse enters the
    // window without first moving over the React container.
    const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    useEffect(() => {
        const handler = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
        document.addEventListener("mousemove", handler);
        return () => document.removeEventListener("mousemove", handler);
    }, []);

    // Ctrl+X — cut selected questions into the clipboard
    // lockSelection prevents ReactFlow from clearing the selection when the
    // keyboard event shifts DOM focus away from the canvas.
    const targetNodeId = knowledgeId === 0 ? null : knowledgeId;
    useGlobalShortcut("ctrl+x", { id: "kflow-cut", priority: 60, enabled: selectedNodeIds.length > 0 }, () => {
        setKFlowClipboard({ questionIds: selectedNodeIds, sourceNodeId: targetNodeId });
        lockSelection(selectedNodeIds.map(String));
    });

    // Ctrl+V — paste clipboard questions at the current cursor position
    useGlobalShortcut("ctrl+v", { id: "kflow-paste", priority: 60, enabled: !!kFlowClipboard }, () => {
        if (!kFlowClipboard) return;
        const cursorFlowPos = rfInstance.screenToFlowPosition(mousePosRef.current);
        handlePasteQuestions(kFlowClipboard, targetNodeId, cursorFlowPos);
        setKFlowClipboard(null);
    });

    // Escape — cancel pending clipboard
    useGlobalShortcut("escape", { id: "kflow-cancel-cut", priority: 55, enabled: !!kFlowClipboard }, () => {
        setKFlowClipboard(null);
    });

    // ── Viewport persistence ──────────────────────────────────────────────────
    // onMoveEnd gives us the final viewport after panning/zooming ends;
    // saveViewport debounces incremental updates from the custom wheel handler.
    const saveViewportTimer = useRef<ReturnType<typeof setTimeout>>();
    const saveViewport = (vp: { x: number; y: number; zoom: number }) => {
        clearTimeout(saveViewportTimer.current);
        saveViewportTimer.current = setTimeout(() => {
            setKFlowViewportMap((prev) => ({ ...prev, [knowledgeId]: vp }));
        }, 250);
    };
    const handleMoveEnd = (_: unknown, viewport: Viewport) => {
        setKFlowViewportMap((prev) => ({ ...prev, [knowledgeId]: viewport }));
    };

    const isDragSelecting = useRef(false);

    // ReactFlow's nodesSelectionActive overlay intercepts pointer events by
    // default. We disable that with pointer-events:none via CSS so onNodeClick
    // fires normally; Shift+click deselect is handled manually here.
    const handleNodeClick = (e: React.MouseEvent, node: Node) => {
        if (e.shiftKey && node.selected) {
            handleNodesChange([{ id: node.id, type: "select" as const, selected: false }]);
        }
    }

    // During drag-selection we suppress edge selection so that rubber-banding
    // over edges doesn't unintentionally select them. The blue bounding-box
    // overlay (nodesSelectionActive) is toggled manually to stay in sync.
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
    }

    useEffect(() => { setKnowledgeId(knowledgeId); }, [knowledgeId]);

    // ── Custom wheel handler ──────────────────────────────────────────────────
    // ReactFlow's built-in scroll/zoom is disabled (zoomOnScroll=false,
    // panOnScroll=false) so we can implement our own scheme:
    //   scroll          → pan vertically
    //   Shift+scroll    → pan horizontally
    //   Ctrl+scroll     → zoom toward cursor (cursor-anchored)
    // Attached at capture phase on document so it intercepts before ReactFlow.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as HTMLElement)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const { x, y, zoom } = rfInstance.getViewport();
            let newVp: { x: number; y: number; zoom: number };
            if (e.ctrlKey) {
                // Zoom anchored to the cursor: scale the viewport around (cx, cy)
                const factor = e.deltaY > 0 ? 0.716 : 1.360; // ~4× faster than default
                const newZoom = Math.min(Math.max(zoom * factor, 0.15), 2);
                const rect = el.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                newVp = { x: cx - (cx - x) * (newZoom / zoom), y: cy - (cy - y) * (newZoom / zoom), zoom: newZoom };
            } else if (e.shiftKey) {
                newVp = { x: x - e.deltaY * PAN_SPEED, y, zoom };
            } else {
                newVp = { x, y: y - e.deltaY * PAN_SPEED, zoom };
            }
            rfInstance.setViewport(newVp);
            saveViewport(newVp);
        };
        document.addEventListener("wheel", onWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    }, [rfInstance]);

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
    }

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
