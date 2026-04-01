/**
 * FlowEdgeWithNote — custom React Flow edge for user-created connections.
 * Shows a note badge in the middle. Click to edit inline. Arrow toggle when selected.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from "@xyflow/react";
import type { EdgeProps, Edge } from "@xyflow/react";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMultiTaskFlowStore } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHelper } from "@/hooks/multiProject/useMultiProjectTaskFlow.helper";
import type { FlowEdgeData, ArrowDirection, TaskFlowNodeData } from "@/types/multiProject/multiProjectTaskFlow.type";

const ARROW_CYCLE: ArrowDirection[] = ["forward", "backward", "both"];
const ARROW_SYMBOL: Record<ArrowDirection, string> = { forward: "→", backward: "←", both: "↔" };
const ARROW_LABEL: Record<ArrowDirection, string> = { forward: "A → B", backward: "B → A", both: "A ↔ B" };

// Flow animation constants
const FLOW_DASH = "10 6";
const FLOW_PERIOD = 16; // dash(10) + gap(6)

export function FlowEdgeWithNote({
    id,
    source,
    target,
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
}: EdgeProps<Edge<FlowEdgeData>>) {
    const { editingEdgeId, setEditingEdgeId, flowNodes, flowEdges } = useMultiTaskFlowStore();
    const { handleEdgeNoteConfirm, handleEdgeDelete } = useMultiProjectTaskFlowHelper();

    const isDimmed = useMemo(() => {
        const DIMMED = new Set(["completed", "cancelled"]);
        const sNode = flowNodes.find((n) => n.id === source);
        const tNode = flowNodes.find((n) => n.id === target);
        const sStatus = (sNode?.data as TaskFlowNodeData)?.task?.status;
        const tStatus = (tNode?.data as TaskFlowNodeData)?.task?.status;
        return (sStatus && DIMMED.has(sStatus)) || (tStatus && DIMMED.has(tStatus));
    }, [flowNodes, source, target]);

    const edgeData = data as FlowEdgeData;
    const isEditing = editingEdgeId === id;
    const hasNote = !!edgeData?.note;
    const note = edgeData?.note ?? "";
    const currentArrow = edgeData?.arrowDirection ?? "forward";

    const [editValue, setEditValue] = useState(note);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const labelRef = useRef<HTMLButtonElement>(null);
    const [editSize, setEditSize] = useState<{ width: number; height: number } | null>(null);

    // When another edge is selected, disable interaction on unselected edges
    // so their wide hit-area doesn't block the selected edge's reconnect handles
    const anyEdgeSelected = flowEdges.some(e => e.selected);
    const hitWidth = selected ? 20 : (anyEdgeSelected ? 0 : 20);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
    });

    useEffect(() => {
        if (isEditing) {
            setEditValue(note);
            requestAnimationFrame(() => {
                const el = textareaRef.current;
                if (!el) return;
                el.focus();
                el.select();
                el.style.height = "auto";
                el.style.height = `${Math.max(el.scrollHeight, editSize?.height ?? 0)}px`;
            });
        }
    }, [isEditing, note, editSize]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditValue(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
    }, []);

    // Delete key removes selected edge
    useEffect(() => {
        if (!selected || isEditing) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") handleEdgeDelete(id);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [selected, isEditing, id, handleEdgeDelete]);

    const strokeColor = selected ? "hsl(var(--primary))" : isDimmed ? "#6b728030" : "#6b728099";
    const strokeWidth = selected ? 2 : 1.5;

    // Flow animation: dashes move along the path to indicate direction
    const speed = selected ? 0.5 : isDimmed ? 1.8 : 0.9; // seconds per period
    const animFwd = `flow-fwd ${speed}s linear infinite`;
    const animBwd = `flow-bwd ${speed}s linear infinite`;

    const handleLabelClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const el = labelRef.current;
        if (el) setEditSize({ width: el.offsetWidth, height: el.offsetHeight });
        setEditingEdgeId(id);
    }, [id, setEditingEdgeId]);

    const handleConfirm = useCallback(() => {
        handleEdgeNoteConfirm(id, editValue, currentArrow);
    }, [id, editValue, currentArrow, handleEdgeNoteConfirm]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleConfirm(); }
        if (e.key === "Escape") setEditingEdgeId(null);
    }, [handleConfirm, setEditingEdgeId]);

    const handleToggleArrow = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const idx = ARROW_CYCLE.indexOf(currentArrow);
        const next = ARROW_CYCLE[(idx + 1) % ARROW_CYCLE.length];
        handleEdgeNoteConfirm(id, note, next);
    }, [id, note, currentArrow, handleEdgeNoteConfirm]);

    // ── Render label content ────────────────────────────────────────────────

    const edgeLabelBase: React.CSSProperties = {
        position: "absolute",
        pointerEvents: "all",
        zIndex: isEditing ? 1000 : undefined,
        opacity: isDimmed ? 0.4 : 1,
    };

    return (
        <>
            <defs>
                <style>{`
                    @keyframes flow-fwd { from { stroke-dashoffset: ${FLOW_PERIOD}; } to { stroke-dashoffset: 0; } }
                    @keyframes flow-bwd { from { stroke-dashoffset: 0; } to { stroke-dashoffset: ${FLOW_PERIOD}; } }
                    .react-flow__edge.selected .react-flow__edgeupdater {
                        fill: hsl(var(--primary));
                        stroke: hsl(var(--background));
                        stroke-width: 2.5;
                        r: 8;
                        cursor: crosshair;
                    }
                    .react-flow__edge.selected .react-flow__edgeupdater:hover {
                        fill: hsl(var(--primary) / 0.8);
                        r: 10;
                    }
                `}</style>
            </defs>

            {/* Static base line */}
            <BaseEdge
                id={`${id}-track`}
                path={edgePath}
                interactionWidth={hitWidth}
                style={{ stroke: strokeColor, strokeWidth, strokeDasharray: FLOW_DASH, opacity: 0.25 }}
            />

            {/* Animated flow layer — forward */}
            {(currentArrow === "forward" || currentArrow === "both") && (
                <BaseEdge
                    id={`${id}-fwd`}
                    path={edgePath}
                    interactionWidth={0}
                    style={{ stroke: strokeColor, strokeWidth, strokeDasharray: FLOW_DASH, animation: animFwd }}
                />
            )}

            {/* Animated flow layer — backward */}
            {(currentArrow === "backward" || currentArrow === "both") && (
                <BaseEdge
                    id={`${id}-bwd`}
                    path={edgePath}
                    interactionWidth={0}
                    style={{
                        stroke: strokeColor,
                        strokeWidth: currentArrow === "both" ? strokeWidth * 0.7 : strokeWidth,
                        strokeDasharray: FLOW_DASH,
                        animation: animBwd,
                        opacity: currentArrow === "both" ? 0.6 : 1,
                    }}
                />
            )}

            {/* ── Direction toggle — above the edge midpoint ─────────────────── */}
            {selected && !isEditing && (
                <EdgeLabelRenderer>
                    <div
                        style={{ ...edgeLabelBase, transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 6}px)` }}
                        className="nodrag nopan"
                    >
                        <button
                            type="button"
                            onClick={handleToggleArrow}
                            title={`Direction: ${currentArrow} — click to cycle`}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/80 active:scale-95 transition-all border border-primary/30 whitespace-nowrap"
                        >
                            <span className="text-sm leading-none">{ARROW_SYMBOL[currentArrow]}</span>
                            <span className="opacity-80">{ARROW_LABEL[currentArrow]}</span>
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* ── Note button / editor — below the edge midpoint ─────────────── */}
            {(selected || hasNote) && (
                <EdgeLabelRenderer>
                    <div
                        style={{ ...edgeLabelBase, transform: `translate(-50%, 0%) translate(${labelX}px, ${labelY + 6}px)` }}
                        className="nodrag nopan"
                    >
                        {isEditing ? (
                            <textarea
                                ref={textareaRef}
                                value={editValue}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                onBlur={handleConfirm}
                                placeholder="Add note..."
                                rows={1}
                                style={editSize ? { width: editSize.width, minHeight: editSize.height } : undefined}
                                className="max-w-[220px] min-w-[100px] px-2.5 py-1.5 bg-card border-2 border-primary rounded-xl outline-none text-foreground placeholder:text-muted-foreground resize-none overflow-hidden text-xs font-medium shadow-xl"
                            />
                        ) : (
                            <button
                                ref={labelRef}
                                type="button"
                                onClick={handleLabelClick}
                                className={cn(
                                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium text-left whitespace-pre-wrap break-words max-w-[200px] transition-all shadow-md backdrop-blur-sm",
                                    hasNote
                                        ? "bg-card border-border text-foreground hover:bg-muted"
                                        : "bg-card/90 border-dashed border-muted-foreground/60 text-muted-foreground hover:border-primary/60 hover:text-foreground",
                                )}
                                title={hasNote ? "Edit note" : "Add note to connection"}
                            >
                                {hasNote ? note : <><MessageSquarePlus className="h-3.5 w-3.5 shrink-0" /><span>Add note</span></>}
                            </button>
                        )}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
