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
const ARROW_SYMBOL: Record<ArrowDirection, string> = { forward: "A→B", backward: "B→A", both: "A↔B" };

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
    const { editingEdgeId, setEditingEdgeId, flowNodes } = useMultiTaskFlowStore();
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

    const renderLabel = () => {
        if (!isEditing && !selected && !hasNote) return null;

        return (
            <div className="flex items-center gap-1">
                {/* Note button / textarea */}
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
                        className="max-w-[220px] min-w-[80px] px-2 py-1 bg-card border border-primary rounded-lg outline-none text-foreground placeholder:text-muted-foreground resize-none overflow-hidden text-[10px] font-medium"
                    />
                ) : (
                    <button
                        ref={labelRef}
                        type="button"
                        onClick={handleLabelClick}
                        className={cn(
                            "px-2.5 py-1 rounded-lg border text-[10px] font-medium text-left whitespace-pre-wrap break-words max-w-[220px] transition-all backdrop-blur-sm",
                            hasNote
                                ? "bg-card border-border text-foreground shadow-sm"
                                : selected
                                    ? "bg-card border-border text-muted-foreground shadow-sm"
                                    : "bg-card/60 border-dashed border-muted-foreground/50 text-muted-foreground/70",
                        )}
                        title={hasNote ? undefined : "Add note to connection"}
                    >
                        {hasNote ? note : <MessageSquarePlus className="h-3.5 w-3.5" />}
                    </button>
                )}

                {/* Arrow toggle — only when selected */}
                {selected && (
                    <button
                        type="button"
                        onClick={handleToggleArrow}
                        onMouseDown={(e) => { if (isEditing) e.preventDefault(); }}
                        title={`Direction: ${currentArrow} (click to cycle)`}
                        className="flex items-center justify-center w-6 h-6 rounded-md bg-card border border-border text-foreground text-xs font-bold shadow-sm backdrop-blur-sm hover:bg-muted transition-colors shrink-0"
                    >
                        {ARROW_SYMBOL[currentArrow]}
                    </button>
                )}
            </div>
        );
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

            {/* Static base line — gives the edge a visible track */}
            <BaseEdge
                id={`${id}-track`}
                path={edgePath}
                interactionWidth={20}
                style={{
                    stroke: strokeColor,
                    strokeWidth,
                    strokeDasharray: FLOW_DASH,
                    opacity: 0.25,
                }}
            />

            {/* Animated flow layer — forward */}
            {(currentArrow === "forward" || currentArrow === "both") && (
                <BaseEdge
                    id={`${id}-fwd`}
                    path={edgePath}
                    interactionWidth={0}
                    style={{
                        stroke: strokeColor,
                        strokeWidth,
                        strokeDasharray: FLOW_DASH,
                        animation: animFwd,
                    }}
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

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: "all",
                        zIndex: isEditing ? 1000 : undefined,
                        opacity: isDimmed ? 0.4 : 1,
                    }}
                    className="nodrag nopan"
                >
                    {renderLabel()}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
