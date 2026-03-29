/**
 * FlowEdgeWithNote — custom React Flow edge for user-created connections.
 * Shows a note badge in the middle. Click to edit inline. Arrow toggle when selected.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from "@xyflow/react";
import type { EdgeProps, Edge } from "@xyflow/react";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMultiTaskFlowStore } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowHelper } from "@/hooks/multiProject/useMultiProjectTaskFlow.helper";
import type { FlowEdgeData, ArrowDirection } from "@/types/multiProject/multiProjectTaskFlow.type";

const ARROW_CYCLE: ArrowDirection[] = ["forward", "backward", "both"];
const ARROW_SYMBOL: Record<ArrowDirection, string> = { forward: "→", backward: "←", both: "↔" };

export function FlowEdgeWithNote({
    id,
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
}: EdgeProps<Edge<FlowEdgeData>>) {
    const { editingEdgeId, setEditingEdgeId } = useMultiTaskFlowStore();
    const { handleEdgeNoteConfirm, handleEdgeDelete } = useMultiProjectTaskFlowHelper();

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

    const strokeColor = selected ? "hsl(var(--primary))" : "#6b7280";
    const strokeWidth = selected ? 2 : 1.5;

    const markerId = `arrow-${id.replace(/[^a-z0-9]/gi, "_")}`;
    const previewShowStart = currentArrow === "backward" || currentArrow === "both";
    const previewShowEnd   = currentArrow === "forward"  || currentArrow === "both";

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

                {/* Arrow toggle — solid button, only when selected */}
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
                <marker id={`${markerId}-end`} markerWidth="12" markerHeight="12" refX="9" refY="4" orient="auto">
                    <path d="M0,0 L0,8 L9,4 z" fill={strokeColor} />
                </marker>
                <marker id={`${markerId}-start`} markerWidth="12" markerHeight="12" refX="0" refY="4" orient="auto-start-reverse">
                    <path d="M0,0 L0,8 L9,4 z" fill={strokeColor} />
                </marker>
            </defs>

            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={previewShowEnd   ? `url(#${markerId}-end)`   : undefined}
                markerStart={previewShowStart ? `url(#${markerId}-start)` : undefined}
                interactionWidth={20}
                style={{
                    stroke: strokeColor,
                    strokeWidth,
                    strokeDasharray: "6 3",
                }}
            />

            <EdgeLabelRenderer>
                <div
                    style={{
                        position: "absolute",
                        transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        pointerEvents: "all",
                        zIndex: isEditing ? 1000 : undefined,
                    }}
                    className="nodrag nopan"
                >
                    {renderLabel()}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}
