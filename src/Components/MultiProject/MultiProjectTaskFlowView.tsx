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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Wand2, Scan, Maximize, Crosshair, View, ScanEye } from "lucide-react";
import { MultiTaskFlowProvider } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHeadless } from "@/HeadlessComponents/multiProject/useMultiProjectTaskFlow.headless";
import { useMultiProjectTaskFlowSelector } from "@/Selectors/multipleProject/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "@/hooks/multiProject/useMultiProjectTaskFlow.helper";
import { useMultiProjectTaskFlowNodeHelper } from "@/hooks/multiProject/useMultiProjectTaskFlowNode.helper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";
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
`;

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const PAN_SPEED = 0.8;

function TaskFlowCanvas() {
    useMultiProjectTaskFlowHeadless();

    const { flowNodes, flowEdges } = useMultiProjectTaskFlowSelector();
    const { handleNodesChange, handleEdgesChange, handleNodeDragStart, handleNodeDragStop, handleConnect, handleReconnectStart, handleReconnectEnd, handleReconnect, handleAutoLayout } = useMultiProjectTaskFlowHelper();
    const { handleAddTaskAtPosition } = useMultiProjectTaskFlowNodeHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const rfInstance = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);

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
                const newZoom = Math.min(Math.max(zoom * factor, MIN_ZOOM), MAX_ZOOM);
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
    }, [rfInstance]);

    const handleBackToCenter = useCallback(() => {
        const inProgressNode = flowNodes.find(
            (n) => (n.data as { task?: { status: string } }).task?.status === "in_progress",
        );
        if (!inProgressNode) {
            // Fallback: fit view if no in_progress node
            rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
            return;
        }
        // Center on that node (offset by half node size to hit center)
        rfInstance.setCenter(
            inProgressNode.position.x + 115,
            inProgressNode.position.y + 38,
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

    return (
        <div ref={containerRef} className="h-full w-full relative">
            <style>{FLOW_CSS}</style>

            <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onNodeDragStart={handleNodeDragStart}
                onNodeDragStop={handleNodeDragStop}
                onConnect={handleConnect}
                onReconnectStart={handleReconnectStart}
                onReconnectEnd={handleReconnectEnd}
                onReconnect={handleReconnect}
                onPaneContextMenu={handlePaneContextMenu}
                onMoveEnd={handleMoveEnd}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView={!savedViewport}
                fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
                defaultViewport={savedViewport ?? { x: 0, y: 0, zoom: 1 }}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                deleteKeyCode={null}
                multiSelectionKeyCode="Control"
                connectionMode={ConnectionMode.Loose}
                connectionRadius={30}
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
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground"
                        title="Gently align nodes to straighten edges"
                    >
                        <Wand2 className="h-3.5 w-3.5" />
                        Smart Wand
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
