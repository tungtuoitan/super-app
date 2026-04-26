/**
 * TaskBar - Draggable Task Bar for Timeline View
 * Inline drag logic (no external hook). Calls onDateChange on drag end.
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { CornerDownRight } from "lucide-react";
import { Task } from "../store/useTask.store";
import { cn } from "@/lib/utils";
import { getTaskStatusColors } from "../utils/TaskDetail.utils";
import { getTaskBarColors, isStatusNonDraggable, TIMELINE_ROW_HEIGHT, TIMELINE_TASK_BAR_HEIGHT, TIMELINE_MIN_BAR_WIDTH, TIMELINE_SUBTASK_BAR_HEIGHT } from "../utils/TaskGrid.utils";

export interface TaskBarProps {
    task: Task;
    timelineStart: Date;
    dayWidth: number;
    onDateChange: (taskId: number, startDate: Date | null, endDate: Date | null) => void;
    onTaskClick: (task: Task) => void;
    isSubtask?: boolean;
    parentTask?: Task | null;
    project?: { startDate?: Date | null; endDate?: Date | null } | null;
    allTasks?: Task[];
    onValidationError?: (message: string) => void;
}

export function TaskBar({ task, timelineStart, dayWidth, onDateChange, onTaskClick, isSubtask = false, parentTask, project, allTasks = [], onValidationError }: TaskBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const statusColors = getTaskStatusColors(task.status);
    const isDragDisabled = task.deletedAt || isStatusNonDraggable(task.status);

    // ── Position from dates ──────────────────────────────
    const { left, width, hasValidDates } = (() => {
        if (!task.startDate && !task.endDate) return { left: 0, width: TIMELINE_MIN_BAR_WIDTH, hasValidDates: false };
        const start = task.startDate || task.endDate || new Date();
        const end = task.endDate || task.startDate || new Date();
        const startDiff = Math.floor((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return { left: startDiff * dayWidth, width: Math.max(TIMELINE_MIN_BAR_WIDTH, duration * dayWidth - 4), hasValidDates: true };
    })();

    // ── Drag state ───────────────────────────────────────
    const [isDragging, setIsDragging] = useState(false);
    const [hasDragged, setHasDragged] = useState(false);
    const [dragType, setDragType] = useState<"move" | "resize-left" | "resize-right" | null>(null);
    const [dragStartX, setDragStartX] = useState(0);
    const [originalLeft, setOriginalLeft] = useState(0);
    const [originalWidth, setOriginalWidth] = useState(0);
    const [currentLeft, setCurrentLeft] = useState(0);
    const [currentWidth, setCurrentWidth] = useState(0);

    // Refs to avoid stale closures in handleMouseUp
    const currentLeftRef = useRef(currentLeft);
    const currentWidthRef = useRef(currentWidth);
    const dragTypeRef = useRef(dragType);
    const hasDraggedRef = useRef(hasDragged);
    currentLeftRef.current = currentLeft;
    currentWidthRef.current = currentWidth;
    dragTypeRef.current = dragType;
    hasDraggedRef.current = hasDragged;

    useEffect(() => { setCurrentLeft(left); setCurrentWidth(width); }, [left, width]);

    // ── Constraint bounds ────────────────────────────────
    const constraints = (() => {
        let outerMin: Date | null = null;
        let outerMax: Date | null = null;
        if (isSubtask && parentTask) { outerMin = parentTask.startDate || null; outerMax = parentTask.endDate || null; }
        else if (project) { outerMin = project.startDate || null; outerMax = project.endDate || null; }
        const minLeft = outerMin ? Math.floor((outerMin.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth : null;
        const maxRight = outerMax ? (Math.floor((outerMax.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)) + 1) * dayWidth : null;
        return { minLeft, maxRight };
    })();

    // ── Mouse down ───────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent, type: "move" | "resize-left" | "resize-right") => {
        if (isDragDisabled) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true); setHasDragged(false); setDragType(type);
        setDragStartX(e.clientX); setOriginalLeft(currentLeft); setOriginalWidth(currentWidth);
    };

    // ── Mouse move & up ──────────────────────────────────
    useEffect(() => {
        if (!isDragging) return;
        const cMin = constraints.minLeft; const cMax = constraints.maxRight;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            if (Math.abs(deltaX) > 3) setHasDragged(true);
            const daysDelta = Math.round(deltaX / dayWidth);

            if (dragType === "move") {
                let nL = originalLeft + daysDelta * dayWidth;
                const nR = nL + originalWidth;
                if (cMin !== null && nL < cMin) nL = cMin;
                if (cMax !== null && nR > cMax) nL = cMax - originalWidth;
                setCurrentLeft(nL);
            } else if (dragType === "resize-left") {
                let nL = originalLeft + daysDelta * dayWidth;
                let nW = originalWidth - daysDelta * dayWidth;
                if (cMin !== null && nL < cMin) { nW -= (cMin - nL); nL = cMin; }
                if (nW >= TIMELINE_MIN_BAR_WIDTH) { setCurrentLeft(nL); setCurrentWidth(nW); }
            } else if (dragType === "resize-right") {
                let nW = originalWidth + daysDelta * dayWidth;
                if (cMax !== null && originalLeft + nW > cMax) nW = cMax - originalLeft;
                if (nW >= TIMELINE_MIN_BAR_WIDTH) setCurrentWidth(nW);
            }
        };

        const handleMouseUp = () => {
            const _cL = currentLeftRef.current; const _cW = currentWidthRef.current;
            const _dT = dragTypeRef.current; const _hD = hasDraggedRef.current;
            setIsDragging(false); setDragType(null);

            const dL = Math.round((_cL - left) / dayWidth);
            const dW = Math.round((_cW - width) / dayWidth);

            if (dL !== 0 || dW !== 0) {
                let nS: Date | null = task.startDate ? new Date(task.startDate) : null;
                let nE: Date | null = task.endDate ? new Date(task.endDate) : null;
                const effS = task.startDate || task.endDate;
                const effE = task.endDate || task.startDate;

                if (_dT === "move") {
                    if (nS) nS.setDate(nS.getDate() + dL);
                    if (nE) nE.setDate(nE.getDate() + dL);
                } else if (_dT === "resize-left") {
                    if (nS) nS.setDate(nS.getDate() + dL);
                    else if (effS) { nS = new Date(effS); nS.setDate(nS.getDate() + dL); }
                    if (!nE && effE) nE = new Date(effE);
                    if (nS && nE && nS > nE) nS = new Date(nE);
                } else if (_dT === "resize-right") {
                    if (nE) nE.setDate(nE.getDate() + dW);
                    else if (effE) { nE = new Date(effE); nE.setDate(nE.getDate() + dW); }
                    if (!nS && effS) nS = new Date(effS);
                    if (nS && nE && nE < nS) nE = new Date(nS);
                }

                // Subtask validation
                if (!isSubtask) {
                    const subs = allTasks.filter((t) => t.parentTaskId === task.id);
                    const outside = subs.filter((s) => {
                        if (nS && s.startDate && s.startDate < nS) return true;
                        if (nE && s.endDate && s.endDate > nE) return true;
                        return false;
                    });
                    if (outside.length > 0 && onValidationError) {
                        onValidationError(`Warning: ${outside.length} subtask(s) fall outside the new date range. Please update them manually.`);
                    }
                }

                onDateChange(task.id, nS, nE);
            } else {
                setCurrentLeft(left); setCurrentWidth(width);
                if (!_hD) onTaskClick(task);
            }
            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    }, [isDragging, dragStartX, originalLeft, originalWidth, left, width, task, dayWidth, constraints, isSubtask, allTasks]);

    // ── Render ───────────────────────────────────────────
    const taskBarColors = getTaskBarColors(task.status);
    const barHeight = isSubtask ? TIMELINE_SUBTASK_BAR_HEIGHT : TIMELINE_TASK_BAR_HEIGHT;
    const barColor = isSubtask ? `${taskBarColors.bg}cc` : taskBarColors.bg;

    if (!hasValidDates) {
        return (
            <div className={cn("absolute flex items-center px-2 text-muted-foreground italic cursor-pointer hover:text-foreground", isSubtask ? "h-[20px] text-[10px]" : "h-[28px] text-xs")} style={{ top: 4, left: isSubtask ? 20 : 4 }} onClick={() => onTaskClick(task)}>
                {isSubtask && <CornerDownRight className="h-2.5 w-2.5 mr-1 flex-shrink-0" />}
                <span className="truncate">{task.title || "Untitled"}</span>
                <span className="ml-1 text-muted-foreground/60">(no dates)</span>
            </div>
        );
    }

    return (
        <div ref={barRef} className={cn("absolute flex items-center rounded-md transition-shadow group", isDragDisabled ? "cursor-default" : "cursor-pointer", isDragging && "shadow-lg z-10", (task.deletedAt || isDragDisabled) && "opacity-60")} style={{ left: currentLeft, width: currentWidth, height: barHeight, top: (TIMELINE_ROW_HEIGHT - barHeight) / 2, backgroundColor: barColor, borderLeft: `3px solid ${statusColors.bg}` }}>
            {!isDragDisabled && <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20" onMouseDown={(e) => handleMouseDown(e, "resize-left")} />}
            {task.priority === "high" && <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-red-500 z-10 pointer-events-none" />}
            <div className={cn("flex-1 flex items-center px-2 overflow-visible", !isDragDisabled && "cursor-grab active:cursor-grabbing")} onMouseDown={(e) => handleMouseDown(e, "move")}>
                {isSubtask && <CornerDownRight className="h-2.5 w-2.5 mr-1 flex-shrink-0" style={{ color: `${taskBarColors.text}b3` }} />}
                <span className={cn("font-medium whitespace-nowrap", isSubtask ? "text-[10px]" : "text-xs")} style={{ color: taskBarColors.text, textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>{task.title || "Untitled"}</span>
            </div>
            {!isDragDisabled && <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20" onMouseDown={(e) => handleMouseDown(e, "resize-right")} />}
        </div>
    );
}
