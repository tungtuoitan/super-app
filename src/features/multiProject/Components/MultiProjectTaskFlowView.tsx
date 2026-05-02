/**
 * MultiProjectTaskFlowView — Task dependency visualiser using React Flow.
 * Scroll=pan, Shift+scroll=horizontal, Ctrl+scroll=zoom.
 */

import React, { useRef, useEffect, useMemo, useState } from "react";
import {
    ReactFlow,
    ReactFlowProvider,
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
import { MultiTaskFlowProvider, useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHeadless } from "../hooks/mpTaskFlow/useMultiProjectTaskFlow.headless";
import { useMultiProjectTaskFlowSelector } from "../Selectors/useMultiProjectTaskFlow.selector";
import { useMultiProjectTaskFlowHelper } from "../hooks/mpTaskFlow/useMultiProjectTaskFlow.helper";
import { useOrchestratorContextMenuHelper } from "@/shared";
import { constants } from "@/shared";
import { cn } from "@/lib/utils";
import { storageService, STORAGE_KEYS } from "@/shared";
import { NODE_WIDTH, NODE_HEIGHT } from "../utils/multiProjectTaskFlow.utils";
import { TASK_FLOW_CSS, MIN_ZOOM, MAX_ZOOM, PAN_SPEED } from "../utils/multiProjectTaskFlow.constants";
import { TaskFlowNode } from "./small/TaskFlowNode";
import { FlowEdgeWithNote } from "./small/FlowEdgeWithNote";

const nodeTypes = { taskFlowNode: TaskFlowNode };
const edgeTypes = { flowEdgeWithNote: FlowEdgeWithNote };

function TaskFlowCanvas() {
    useMultiProjectTaskFlowHeadless();

    const { flowNodes, flowEdges } = useMultiProjectTaskFlowSelector();
    const { isTaskFlowLoading, lockOldNodes, setLockOldNodes } = useMultiTaskFlowStore();
    const { handleNodesChange, handleEdgesChange, handleNodeDragStart, handleNodeDrag, handleNodeDragStop, handleConnect, handleConnectStart, handleConnectEnd, handleReconnectStart, handleReconnectEnd, handleReconnect, handleAutoLayout, loadTaskFlowTasks } = useMultiProjectTaskFlowHelper();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const rfInstance = useReactFlow();
    const containerRef = useRef<HTMLDivElement>(null);
    const isDragSelecting = useRef(false);
    const inProgressIndexRef = useRef(0);
    // Dynamic min zoom: after fitView, lock min to the resulting zoom (can't zoom out past "see all")
    const dynMinZoomRef = useRef(MIN_ZOOM);

    // Drag-select only nodes — deselect edges caught in the selection box
    const storeApi = useStoreApi();
    const handleSelectionChange = ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: any[]; edges: any[] }) => {
        if (isDragSelecting.current && selectedEdges.length > 0) {
            handleEdgesChange(selectedEdges.map((e: any) => ({ id: e.id, type: "select" as const, selected: false })));
        }
        const store = storeApi.getState() as any;
        if (selectedNodes.length > 1 && !store.nodesSelectionActive) storeApi.setState({ nodesSelectionActive: true });
        else if (selectedNodes.length <= 1 && store.nodesSelectionActive) storeApi.setState({ nodesSelectionActive: false });
    };

    const handleSelectionStart = () => { isDragSelecting.current = true; };
    const handleSelectionEnd = () => { isDragSelecting.current = false; };

    const handleNodeClick = (e: React.MouseEvent, node: any) => {
        if (e.shiftKey && node.selected) {
            handleNodesChange([{ id: node.id, type: "select" as const, selected: false }]);
        }
    };

    // ── Right-click context menu (orchestrator) ─────────────────────────────
    const handlePaneContextMenu = (event: MouseEvent | React.MouseEvent) => {
        event.preventDefault();
        const flowPos = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
        showContextMenu(
            event as React.MouseEvent,
            constants.contextMenu.contextMenuTypes.taskFlow,
            { flowPosition: { x: flowPos.x, y: flowPos.y } },
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
                rfInstance.setViewport({
                    x: cx - (cx - x) * (newZoom / zoom),
                    y: cy - (cy - y) * (newZoom / zoom),
                    zoom: newZoom,
                });
            } else if (e.shiftKey) {
                rfInstance.setViewport({ x: x - e.deltaY * PAN_SPEED, y, zoom });
            } else {
                rfInstance.setViewport({ x, y: y - e.deltaY * PAN_SPEED, zoom });
            }
        };

        // document-level capture fires before @xyflow/react's own wheel listeners (including those on nodes)
        document.addEventListener("wheel", onWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    }, [rfInstance]);

    const isEmpty = flowNodes.length === 0 && !isTaskFlowLoading;

    // ── View controls ───────────────────────────────────────────────────────

    // F1 toggles: focusClose (zoom in on in-progress) ↔ birdEye (zoom out max, center on in-progress)
    type ViewMode = "focusClose" | "birdEye";
    const [viewMode, setViewMode] = useState<ViewMode>("focusClose");
    const [showMiniMap, setShowMiniMap] = useState(false);

    /** Get in-progress/background_progress nodes */
    const getActiveNodes = () => {
        return flowNodes.filter((n) => {
            const status = (n.data as { task?: { status: string } }).task?.status;
            return status === "in_progress" || status === "background_progress";
        });
    };

    /** Mode 1: Focus close-up on in-progress nodes */
    const handleFocusClose = () => {
        const activeNodes = getActiveNodes();
        if (activeNodes.length === 0) {
            rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
            setTimeout(() => {
                const { zoom } = rfInstance.getViewport();
                dynMinZoomRef.current = Math.max(MIN_ZOOM, zoom);
            }, 320);
            setViewMode("focusClose");
            return;
        }

        // Bounding box of all active nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of activeNodes) {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
            maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
        }
        const boxW = maxX - minX;
        const boxH = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const el = containerRef.current;
        const cW = el?.clientWidth ?? 800;
        const cH = el?.clientHeight ?? 600;

        const targetSide = (7 / 12) * cW;
        const targetW = targetSide;
        const targetH = Math.min(targetSide, cH * (7 / 12));

        const zoomX = boxW > 0 ? targetW / boxW : 2;
        const zoomY = boxH > 0 ? targetH / boxH : 2;
        const zoom = Math.min(zoomX, zoomY, MAX_ZOOM);

        rfInstance.setViewport(
            { x: cW / 2 - centerX * zoom, y: cH / 2 - centerY * zoom, zoom },
            { duration: 300 },
        );
        setViewMode("focusClose");
    };

    /** Mode 2: Bird's eye — fit ALL nodes but center on in-progress area */
    const handleBirdEye = () => {
        const activeNodes = getActiveNodes();

        if (flowNodes.length === 0) {
            setViewMode("birdEye");
            return;
        }

        // Bounding box of ALL nodes → determine zoom to fit everything
        let allMinX = Infinity, allMinY = Infinity, allMaxX = -Infinity, allMaxY = -Infinity;
        for (const n of flowNodes) {
            allMinX = Math.min(allMinX, n.position.x);
            allMinY = Math.min(allMinY, n.position.y);
            allMaxX = Math.max(allMaxX, n.position.x + NODE_WIDTH);
            allMaxY = Math.max(allMaxY, n.position.y + NODE_HEIGHT);
        }

        const el = containerRef.current;
        const cW = el?.clientWidth ?? 800;
        const cH = el?.clientHeight ?? 600;

        const allW = allMaxX - allMinX;
        const allH = allMaxY - allMinY;
        const padding = 0.15;
        const fitZoomX = allW > 0 ? cW * (1 - padding * 2) / allW : 1;
        const fitZoomY = allH > 0 ? cH * (1 - padding * 2) / allH : 1;
        const fitZoom = Math.min(fitZoomX, fitZoomY, MAX_ZOOM);

        // Center on in-progress area if possible, otherwise center on all
        let cx: number, cy: number;
        if (activeNodes.length > 0) {
            let aMinX = Infinity, aMinY = Infinity, aMaxX = -Infinity, aMaxY = -Infinity;
            for (const n of activeNodes) {
                aMinX = Math.min(aMinX, n.position.x);
                aMinY = Math.min(aMinY, n.position.y);
                aMaxX = Math.max(aMaxX, n.position.x + NODE_WIDTH);
                aMaxY = Math.max(aMaxY, n.position.y + NODE_HEIGHT);
            }
            cx = (aMinX + aMaxX) / 2;
            cy = (aMinY + aMaxY) / 2;
        } else {
            cx = (allMinX + allMaxX) / 2;
            cy = (allMinY + allMaxY) / 2;
        }

        rfInstance.setViewport(
            { x: cW / 2 - cx * fitZoom, y: cH / 2 - cy * fitZoom, zoom: fitZoom },
            { duration: 300 },
        );
        setTimeout(() => {
            dynMinZoomRef.current = Math.max(MIN_ZOOM, fitZoom);
        }, 320);
        setViewMode("birdEye");
    };

    const handleBackToCenter = () => {
        const activeNodes = getActiveNodes();
        if (activeNodes.length === 0) {
            rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
            setTimeout(() => {
                const { zoom } = rfInstance.getViewport();
                dynMinZoomRef.current = Math.max(MIN_ZOOM, zoom);
            }, 320);
            return;
        }
        const idx = inProgressIndexRef.current % activeNodes.length;
        inProgressIndexRef.current = idx + 1;
        const node = activeNodes[idx];
        rfInstance.setCenter(
            node.position.x + 115,
            node.position.y + 38,
            { zoom: 1, duration: 300 },
        );
    };

    // F1 toggles between 2 modes
    const handleF1Toggle = () => {
        if (viewMode === "focusClose") handleBirdEye();
        else handleFocusClose();
    };

    // F1 = Toggle views, F2 = Back to Center, M = Toggle MiniMap
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            // Skip when typing in input/textarea
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;

            if (e.key === "F1") { e.preventDefault(); handleF1Toggle(); }
            if (e.key === "F2") { e.preventDefault(); handleBackToCenter(); }
            if (e.key === "F3") { e.preventDefault(); setShowMiniMap((v) => !v); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    // Persist viewport across tab switches
    const savedViewport = storageService.get<Viewport>(STORAGE_KEYS.TASK_FLOW_VIEWPORT)

    const handleMoveEnd = (_: unknown, viewport: Viewport) => {
        storageService.set(STORAGE_KEYS.TASK_FLOW_VIEWPORT, viewport);
    };

    const handleRefresh = () => {
        loadTaskFlowTasks();
    };

    // Auto re-lock after 30s when user turns lock off
    const relockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleToggleLock = () => {
        if (lockOldNodes) {
            // Turning OFF → start 30s re-lock timer
            setLockOldNodes(false);
            relockTimerRef.current = setTimeout(() => { setLockOldNodes(true); }, 30_000);
        } else {
            // Turning ON manually → clear timer
            if (relockTimerRef.current) { clearTimeout(relockTimerRef.current); relockTimerRef.current = null; }
            setLockOldNodes(true);
        }
    };
    useEffect(() => () => { if (relockTimerRef.current) clearTimeout(relockTimerRef.current); }, []);

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
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1.2}
                    color="currentColor"
                    className="text-muted-foreground/15"
                />

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
                            viewMode === "focusClose"
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border text-foreground hover:bg-muted",
                        )}
                        title="Toggle view: Focus In-Progress ↔ Bird's Eye (F1)"
                    >
                        {viewMode === "focusClose" ? <Focus className="h-3.5 w-3.5" /> : <Scan className="h-3.5 w-3.5" />}
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
                    <div className="w-px h-5 bg-border" />
                    <button
                        onClick={handleToggleLock}
                        className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md shadow-sm transition-colors",
                            lockOldNodes
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border border-red-500 text-foreground hover:bg-muted",
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
                            showMiniMap
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border text-foreground hover:bg-muted",
                        )}
                        title="Toggle MiniMap (M)"
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

export function MultiProjectTaskFlowView() {
    return (
        <MultiTaskFlowProvider>
            <ReactFlowProvider>
                <TaskFlowCanvas />
            </ReactFlowProvider>
        </MultiTaskFlowProvider>
    );
}
