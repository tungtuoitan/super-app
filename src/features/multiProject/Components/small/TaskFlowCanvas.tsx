/**
 * TaskFlowCanvas — React Flow canvas with controls.
 * Must be rendered inside ReactFlowProvider and MultiTaskFlowProvider.
 */

import React, { useRef, useEffect } from "react";
import {
    ReactFlow,
    MiniMap,
    Background,
    BackgroundVariant,
    Panel,
    ConnectionMode,
    useReactFlow,
    useStoreApi,
    type Viewport,
    SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Wand2, Scan, Crosshair, RefreshCw, Focus, Lock, Unlock, Map } from "lucide-react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHeadless } from "../../hooks/mpTaskFlow/useMultiProjectTaskFlow.headless";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "../../hooks/mpTaskFlow/useMultiProjectTaskFlow.helper";
import { useMultiProjectTaskFlowDragHelper } from "../../hooks/mpTaskFlow/useMultiProjectTaskFlowDrag.helper";
import { useMultiProjectTaskFlowEdgeHelper } from "../../hooks/mpTaskFlow/useMultiProjectTaskFlowEdge.helper";
import { useMultiProjectTaskFlowNodeHelper } from "../../hooks/mpTaskFlow/useMultiProjectTaskFlowNode.helper";
import { useTaskFlowViewControlsHelper } from "../../hooks/mpTaskFlow/useTaskFlowViewControls.helper";
import { useMenuContextHelper } from "@/shared";
import { storageService, STORAGE_KEYS } from "@/shared";
import { TASK_FLOW_CSS, MIN_ZOOM, MAX_ZOOM, PAN_SPEED } from "../../utils/multiProjectTaskFlow.constants";
import { TaskFlowNode } from "./TaskFlowNode";
import { FlowEdgeWithNote } from "./FlowEdgeWithNote";
import { cn } from "@/lib/utils";

const nodeTypes = { taskFlowNode: TaskFlowNode };
const edgeTypes = { flowEdgeWithNote: FlowEdgeWithNote };

export function TaskFlowCanvas() {
    useMultiProjectTaskFlowHeadless();

    const { flowNodes, flowEdges } = useMultiProjectTaskFlowSelector();
    const { isTaskFlowLoading, lockOldNodes, setLockOldNodes } = useMultiTaskFlowStore();
    const { handleEdgesChange, handleAutoLayout, loadTaskFlowTasks } = useMultiProjectTaskFlowHelper();
    const { handleNodesChange, handleNodeDragStart, handleNodeDrag, handleNodeDragStop } = useMultiProjectTaskFlowDragHelper();
    const { handleConnect, handleConnectStart, handleConnectEnd, handleReconnectStart, handleReconnectEnd, handleReconnect } = useMultiProjectTaskFlowEdgeHelper();
    const { handleAddTaskAtPosition } = useMultiProjectTaskFlowNodeHelper();
    const { showContextMenu } = useMenuContextHelper();
    const rfInstance = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragSelecting = useRef(false);
    const storeApi = useStoreApi();

    const { viewMode, showMiniMap, setShowMiniMap, dynMinZoomRef, handleF1Toggle, handleBackToCenter } = useTaskFlowViewControlsHelper(containerRef);

    // Drag-select only nodes — deselect edges caught in the selection box
    const handleSelectionChange = ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: { id: string }[]; edges: { id: string }[] }) => {
        if (isDragSelecting.current && selectedEdges.length > 0) {
            handleEdgesChange(selectedEdges.map((e) => ({ id: e.id, type: "select" as const, selected: false })));
        }
        const store = storeApi.getState() as { nodesSelectionActive: boolean };
        if (selectedNodes.length > 1 && !store.nodesSelectionActive) storeApi.setState({ nodesSelectionActive: true });
        else if (selectedNodes.length <= 1 && store.nodesSelectionActive) storeApi.setState({ nodesSelectionActive: false });
    };

    const handleSelectionStart = () => { isDragSelecting.current = true; };
    const handleSelectionEnd = () => { isDragSelecting.current = false; };

    const handleNodeClick = (e: React.MouseEvent, node: { id: string; selected?: boolean }) => {
        if (e.shiftKey && node.selected) {
            handleNodesChange([{ id: node.id, type: "select" as const, selected: false }]);
        }
    };

    const handlePaneContextMenu = (event: MouseEvent | React.MouseEvent) => {
        event.preventDefault();
        const flowPos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        showContextMenu(
            event as React.MouseEvent,
            "task-flow",
            {
                flowPosition: { x: flowPos.x, y: flowPos.y },
                onAddTask: () => handleAddTaskAtPosition(flowPos.x, flowPos.y),
            },
        );
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as HTMLElement)) return;
            const target = e.target as HTMLElement;
            if (target.closest?.(".taskflow-scroll-popup")) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const { x, y, zoom } = rfInstance.getViewport();
            if (e.ctrlKey) {
                const factor = e.deltaY > 0 ? 0.92 : 1.08;
                const newZoom = Math.min(Math.max(zoom * factor, dynMinZoomRef.current), MAX_ZOOM);
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

    const isEmpty = flowNodes.length === 0 && !isTaskFlowLoading;

    const relockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleToggleLock = () => {
        if (lockOldNodes) {
            setLockOldNodes(false);
            relockTimerRef.current = setTimeout(() => { setLockOldNodes(true); }, 30_000);
        } else {
            if (relockTimerRef.current) { clearTimeout(relockTimerRef.current); relockTimerRef.current = null; }
            setLockOldNodes(true);
        }
    };
    useEffect(() => () => { if (relockTimerRef.current) clearTimeout(relockTimerRef.current); }, []);

    const savedViewport = storageService.get<Viewport>(STORAGE_KEYS.TASK_FLOW_VIEWPORT);
    const handleMoveEnd = (_: unknown, viewport: Viewport) => { storageService.set(STORAGE_KEYS.TASK_FLOW_VIEWPORT, viewport); };

    return (
        <div ref={containerRef} className="h-full w-full relative">
            <style>{TASK_FLOW_CSS}</style>

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
                onNodeClick={handleNodeClick}
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
                selectionKeyCode={null}
                multiSelectionKeyCode="Shift"
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
                <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="currentColor" className="text-muted-foreground/15" />

                {showMiniMap && (
                    <MiniMap
                        position="bottom-right"
                        pannable
                        zoomable
                        maskColor="transparent"
                        className="!bg-card !border !border-border !rounded-lg !shadow-lg minimap-yellow-frame"
                        style={{ width: 180, height: 120 }}
                        nodeColor={(node) => {
                            const status = (node.data as { task?: { status: string } })?.task?.status;
                            if (status === "in_progress") return "hsl(var(--primary))";
                            if (status === "background_progress") return "#38bdf8";
                            if (status === "completed" || status === "cancelled" || status === "failed") return "hsl(var(--muted-foreground) / 0.3)";
                            return "hsl(var(--muted-foreground) / 0.6)";
                        }}
                    />
                )}

                <Panel position="top-right" className="flex items-center gap-1.5">
                    <button
                        onClick={handleF1Toggle}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md shadow-sm transition-colors",
                            viewMode === "focusClose" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted",
                        )}
                        title="Toggle view: Focus In-Progress ↔ Bird's Eye (F1)"
                    >
                        {viewMode === "focusClose" ? <Focus className="h-3.5 w-3.5" /> : <Scan className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={handleBackToCenter} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground" title="Center on in-progress task (F2)">
                        <Crosshair className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button onClick={handleAutoLayout} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border rounded-md shadow-sm transition-colors bg-card border-border text-foreground hover:bg-muted" title="Gather orphan nodes into a tidy group">
                        <Wand2 className="h-3.5 w-3.5" />
                        Tidy Up
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button onClick={() => loadTaskFlowTasks()} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-card border border-border rounded-md shadow-sm hover:bg-muted transition-colors text-foreground" title="Refresh tasks from server">
                        <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button
                        onClick={handleToggleLock}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md shadow-sm transition-colors",
                            lockOldNodes ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border border-red-500 text-foreground hover:bg-muted",
                        )}
                        title={lockOldNodes ? "Unlock completed/cancelled tasks" : "Lock completed/cancelled tasks"}
                    >
                        {lockOldNodes ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5 text-red-500" />}
                    </button>
                    <div className="w-px h-5 bg-border" />
                    <button
                        onClick={() => setShowMiniMap((v) => !v)}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md shadow-sm transition-colors",
                            showMiniMap ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted",
                        )}
                        title="Toggle MiniMap (F3)"
                    >
                        <Map className="h-3.5 w-3.5" />
                    </button>
                </Panel>
            </ReactFlow>

            {isEmpty && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-sm text-muted-foreground">No tasks to display</p>
                </div>
            )}
        </div>
    );
}
