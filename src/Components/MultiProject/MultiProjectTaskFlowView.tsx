/**
 * MultiProjectTaskFlowView
 * Task dependency/hierarchy visualiser using React Flow.
 * Features: drag nodes (persisted), inline rename, custom connections with notes.
 * NO props — reads from store/selector/headless.
 *
 * Scroll behaviour:
 *   scroll         → pan up/down
 *   shift+scroll   → pan left/right
 *   ctrl+scroll    → zoom toward cursor
 */

import React, { useRef, useEffect, useCallback, useMemo } from "react";
import {
    ReactFlow,
    ReactFlowProvider,
    MiniMap,
    Background,
    BackgroundVariant,
    Panel,
    ConnectionMode,
    useReactFlow,
    type Viewport,
    SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Wand2, Scan, Maximize, Crosshair, View, ScanEye, RefreshCw } from "lucide-react";
import { MultiTaskFlowProvider } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHeadless } from "@/HeadlessComponents/multiProject/useMultiProjectTaskFlow.headless";
import { useMultiProjectTaskFlowSelector } from "@/Selectors/multipleProject/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "@/hooks/multiProject/useMultiProjectTaskFlow.helper";
import { useMultiProjectTaskFlowNodeHelper } from "@/hooks/multiProject/useMultiProjectTaskFlowNode.helper";
import { useTaskGridHelper } from "@/hooks/task/useTaskGrid.helper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";
import { cn } from "@/lib/utils";
import { storageService, STORAGE_KEYS } from "@/services/storage.service";
import { TaskFlowNode } from "./small/TaskFlowNode";
import { FlowEdgeWithNote } from "./small/FlowEdgeWithNote";

const nodeTypes = { taskFlowNode: TaskFlowNode };
const edgeTypes = { flowEdgeWithNote: FlowEdgeWithNote };

const FLOW_CSS = `
.react-flow__connection-line { stroke: hsl(var(--primary)); stroke-width: 1.5; }

/* Reconnect anchor handles — only shown when edge is selected */
.react-flow__edgeanchor {
    fill: hsl(var(--primary));
    stroke: hsl(var(--background));
    stroke-width: 2;
    r: 5;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s, r 0.15s;
    cursor: grab;
}
.react-flow__edge.selected .react-flow__edgeanchor {
    opacity: 1;
    pointer-events: all;
}
.react-flow__edge.selected .react-flow__edgeanchor:hover { r: 7; }

/* In-progress task — rotating conic border */
@keyframes taskflow-rotate {
    0%   { --angle: 0deg; }
    100% { --angle: 360deg; }
}
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}
.taskflow-inprogress {
    position: relative;
}
.taskflow-inprogress::before {
    content: '';
    position: absolute;
    inset: -1.5px;
    border-radius: inherit;
    background: conic-gradient(
        from var(--angle),
        transparent 0%,
        rgba(250, 204, 21, 0.6) 10%,
        transparent 20%
    );
    animation: taskflow-rotate 3s linear infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    padding: 1.5px;
    pointer-events: none;
    z-index: 1;
}
`;

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 1;
const PAN_SPEED = 0.8;

function TaskFlowCanvas() {
    useMultiProjectTaskFlowHeadless();

    const { flowNodes, flowEdges } = useMultiProjectTaskFlowSelector();
    const { handleNodesChange, handleEdgesChange, handleNodeDragStart, handleNodeDrag, handleNodeDragStop, handleConnect, handleConnectStart, handleConnectEnd, handleReconnectStart, handleReconnectEnd, handleReconnect, handleAutoLayout } = useMultiProjectTaskFlowHelper();
    const { handleAddTaskAtPosition } = useMultiProjectTaskFlowNodeHelper();
    const { loadTasks } = useTaskGridHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const rfInstance = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragSelecting = useRef(false);
    const inProgressIndexRef = useRef(0);
    // Dynamic min zoom: after fitView, lock min to the resulting zoom (can't zoom out past "see all")
    const dynMinZoomRef = useRef(MIN_ZOOM);

    // Drag-select only nodes — deselect edges caught in the selection box
    const handleSelectionChange = useCallback(({ edges: selectedEdges }: { nodes: any[]; edges: any[] }) => {
        if (isDragSelecting.current && selectedEdges.length > 0) {
            handleEdgesChange(selectedEdges.map((e: any) => ({ id: e.id, type: "select" as const, selected: false })));
        }
    }, [handleEdgesChange]);

    const handleSelectionStart = useCallback(() => { isDragSelecting.current = true; }, []);
    const handleSelectionEnd = useCallback(() => { isDragSelecting.current = false; }, []);

    // ── Right-click context menu (orchestrator) ─────────────────────────────
    const handlePaneContextMenu = useCallback(
        (event: MouseEvent | React.MouseEvent) => {
            event.preventDefault();
            const flowPos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
            showContextMenu(
                event as React.MouseEvent,
                constants.contextMenu.contextMenuTypes.taskFlow,
                { onAddTask: () => handleAddTaskAtPosition(flowPos.x, flowPos.y) },
            );
        },
        [rfInstance, showContextMenu, handleAddTaskAtPosition],
    );

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            e.stopPropagation(); // prevent React Flow from also handling this event
            const { x, y, zoom } = rfInstance.getViewport();

            if (e.ctrlKey) {
                // Zoom toward cursor
                const factor = e.deltaY > 0 ? 0.92 : 1.08;
                const newZoom = Math.min(Math.max(zoom * factor, dynMinZoomRef.current), MAX_ZOOM);
                const rect = el.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                rfInstance.setViewport({
                    x: cx - (cx - x) * (newZoom / zoom),
                    y: cy - (cy - y) * (newZoom / zoom),
                    zoom: newZoom,
                });
            } else if (e.shiftKey) {
                // Pan left/right
                rfInstance.setViewport({ x: x - e.deltaY * PAN_SPEED, y, zoom });
            } else {
                // Pan up/down
                rfInstance.setViewport({ x, y: y - e.deltaY * PAN_SPEED, zoom });
            }
        };

        // capture:true → fires before React Flow's bubble-phase listener
        el.addEventListener("wheel", onWheel, { passive: false, capture: true });
        return () => el.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    }, [rfInstance]);

    const isEmpty = flowNodes.length === 0;

    // ── View controls ───────────────────────────────────────────────────────

    const handleNormalView = useCallback(() => {
        rfInstance.zoomTo(1, { duration: 300 });
    }, [rfInstance]);

    const handleFitView = useCallback(() => {
        rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
        // After animation settles, lock min-zoom to the resulting level
        setTimeout(() => {
            const { zoom } = rfInstance.getViewport();
            dynMinZoomRef.current = Math.max(MIN_ZOOM, zoom);
        }, 320);
    }, [rfInstance]);

    const handleBackToCenter = useCallback(() => {
        const inProgressNodes = flowNodes.filter(
            (n) => (n.data as { task?: { status: string } }).task?.status === "in_progress",
        );
        if (inProgressNodes.length === 0) {
            rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
            setTimeout(() => {
                const { zoom } = rfInstance.getViewport();
                dynMinZoomRef.current = Math.max(MIN_ZOOM, zoom);
            }, 320);
            return;
        }
        const idx = inProgressIndexRef.current % inProgressNodes.length;
        inProgressIndexRef.current = idx + 1;
        const node = inProgressNodes[idx];
        rfInstance.setCenter(
            node.position.x + 115,
            node.position.y + 38,
            { zoom: 1, duration: 300 },
        );
    }, [rfInstance, flowNodes]);

    // F1 = Normal View, F2 = Fit View, F3 = Back to Center
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F1") { e.preventDefault(); handleFitView(); }
            if (e.key === "F2") { e.preventDefault(); handleNormalView(); }
            if (e.key === "F3") { e.preventDefault(); handleBackToCenter(); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [handleNormalView, handleFitView, handleBackToCenter]);

    // Persist viewport across tab switches
    const savedViewport = useMemo(
        () => storageService.get<Viewport>(STORAGE_KEYS.TASK_FLOW_VIEWPORT),
        [],
    );

    const handleMoveEnd = useCallback((_: unknown, viewport: Viewport) => {
        storageService.set(STORAGE_KEYS.TASK_FLOW_VIEWPORT, viewport);
    }, []);

    const handleRefresh = useCallback(() => {
        loadTasks();
    }, [loadTasks]);

    return (
        <div ref={containerRef} className="h-full w-full relative">
            <style>{FLOW_CSS}</style>

            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
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
                onPaneContextMenu={handlePaneContextMenu}
                onMoveEnd={handleMoveEnd}
                onSelectionChange={handleSelectionChange}
                onSelectionStart={handleSelectionStart}
                onSelectionEnd={handleSelectionEnd}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView={!savedViewport}
                fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
                defaultViewport={savedViewport ?? { x: 0, y: 0, zoom: 1 }}
                minZoom={dynMinZoomRef.current}
                maxZoom={MAX_ZOOM}
                deleteKeyCode={null}
                multiSelectionKeyCode="Control"
                selectionOnDrag
                selectionMode={SelectionMode.Partial}
                panOnDrag={[1]}
                selectNodesOnDrag={true}
                connectionMode={ConnectionMode.Loose}
                connectionRadius={80}
                zoomOnScroll={false}
                panOnScroll={false}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1.2}
                    color="currentColor"
                    className="text-muted-foreground/15"
                />

                <Panel position="top-right" className="flex items-center gap-1.5">
                    <button
                        onClick={handleFitView}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground"
                        title="Fit all nodes in view (F2)"
                    >
                        <Scan className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={handleNormalView}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground"
                        title="Normal view — zoom 100% (F1)"
                    >
                        <ScanEye className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={handleBackToCenter}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground"
                        title="Center on in-progress task (F3)"
                    >
                        <Crosshair className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button
                        onClick={handleAutoLayout}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border rounded-md shadow-sm transition-colors bg-card border-border text-foreground hover:bg-muted"
                        title="Gather orphan nodes (nodes with no connections) into a tidy group"
                    >
                        <Wand2 className="h-3.5 w-3.5" />
                        Tidy Up
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground"
                        title="Refresh tasks from server"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                </Panel>

                {/* <Panel position="bottom-center">
                    <p className="text-[10px] text-muted-foreground/50 select-none">
                        Scroll to pan · Shift+scroll for horizontal · Ctrl+scroll to zoom · Double-click to rename
                    </p>
                </Panel> */}
            </ReactFlow>

            {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm text-muted-foreground">No tasks to display</p>
                </div>
            )}
        </div>
    );
}

export function MultiProjectTaskFlowView() {
    return (
        <MultiTaskFlowProvider>
            <ReactFlowProvider>
                <TaskFlowCanvas />
            </ReactFlowProvider>
        </MultiTaskFlowProvider>
    );
}
