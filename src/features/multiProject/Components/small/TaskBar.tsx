/**
 * TaskBar - Draggable Task Bar for Timeline View
 * Inline drag logic (no external hook). Calls onDateChange on drag end.
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from "react";
import { formatTaskLabel, useMenuContextHelper, MENU_CONTEXT_TYPES } from "@/shared";
import { CornerDownRight, Diamond } from "lucide-react";
import type { Task } from "@/features/taskDetail";
import { getTaskStatusColors, isStatusNonDraggable, TIMELINE_ROW_HEIGHT, TIMELINE_TASK_BAR_HEIGHT, TIMELINE_MIN_BAR_WIDTH, TIMELINE_SUBTASK_BAR_HEIGHT } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { resolveTimelineSpan, applyTimelineDrag, describeTimelineSpan, daysBetween } from "@/features/multiProject/utils/multiTimelineSpan.utils";

/** Open-ended bar (no end date) fades out on the right */
const OPEN_END_MASK = "linear-gradient(to right, #000 calc(100% - 120px), transparent)";

export interface TaskBarProps {
    task: Task;
    timelineStart: Date;
    timelineEnd: Date | null;
    dayWidth: number;
    onDateChange: (taskId: number, startDate: Date | null, endDate: Date | null) => void;
    onTaskClick: (task: Task) => void;
    isSubtask?: boolean;
    parentTask?: Task | null;
    project?: { startDate?: Date | null; endDate?: Date | null } | null;
    allTasks?: Task[];
    onValidationError?: (message: string) => void;
}

export function TaskBar({ task, timelineStart, timelineEnd, dayWidth, onDateChange, onTaskClick, isSubtask = false, parentTask, project, allTasks = [], onValidationError }: TaskBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const { showContextMenu } = useMenuContextHelper();
    const openStatusMenu = (e: React.MouseEvent) => showContextMenu(e, MENU_CONTEXT_TYPES.taskTimeline, { taskId: task.id });
    const statusColors = getTaskStatusColors(task.status);
    const isDragDisabled = task.deletedAt || isStatusNonDraggable(task.status);

    // ── Position from dates ──────────────────────────────
    const span = resolveTimelineSpan(task, timelineEnd, isStatusNonDraggable(task.status || ""));
    const hasValidDates = !!span;
    const { left, width } = span
        ? { left: daysBetween(timelineStart, span.start) * dayWidth, width: Math.max(TIMELINE_MIN_BAR_WIDTH, (daysBetween(span.start, span.end) + 1) * dayWidth - (span.isOpenEnded ? 0 : 4)) }
        : { left: 0, width: TIMELINE_MIN_BAR_WIDTH };

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
        if (isDragDisabled || e.button !== 0) return; // right-click → status menu, not drag/open
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
                if (cMax !== null && nR > cMax && !span?.isOpenEnded) nL = cMax - originalWidth; // open-ended bar always passes cMax — only its start is bounded
                if (span?.isOpenEnded && cMax !== null && nL > cMax) nL = cMax;
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

            if ((dL !== 0 || dW !== 0) && span && _dT) {
                const { startDate: nS, endDate: nE } = applyTimelineDrag(task, span, _dT, dL, dW);

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
    }, [isDragging, dragStartX, originalLeft, originalWidth, left, width, task, dayWidth, timelineEnd, constraints, isSubtask, allTasks]);

    // ── Render ───────────────────────────────────────────

    const barHeight = isSubtask ? TIMELINE_SUBTASK_BAR_HEIGHT : TIMELINE_TASK_BAR_HEIGHT;
    // #1514: soft tint of the status colour (works in dark + light), solid status edge on the left
    const barColor = isSubtask ? `${statusColors.bg}1f` : `${statusColors.bg}33`;

    if (!hasValidDates) {
        return (
            <div className={cn("absolute flex items-center px-2 text-muted-foreground italic cursor-pointer hover:text-foreground", isSubtask ? "h-[20px] text-[10px]" : "h-[28px] text-xs")} style={{ top: 4, left: isSubtask ? 20 : 4 }} onClick={() => onTaskClick(task)} onContextMenu={openStatusMenu}>
                {isSubtask && <CornerDownRight className="h-2.5 w-2.5 mr-1 flex-shrink-0" />}
                {task.isMilestone && <Diamond className="h-2.5 w-2.5 mr-1 text-sa-amber fill-sa-amber flex-shrink-0" aria-label="Milestone" />}
                <span className="truncate">{formatTaskLabel(task)}</span>
                <span className="ml-1 text-muted-foreground/60">(no dates)</span>
            </div>
        );
    }

    return (
        <div ref={barRef} title={span ? describeTimelineSpan(span) : undefined} className={cn("absolute flex items-center rounded-md transition-shadow group", isDragDisabled ? "cursor-default" : "cursor-pointer", isDragging && "ring-1 ring-sa-amber/60 z-10", (task.deletedAt || isDragDisabled) && "opacity-60")} style={{ left: currentLeft, width: currentWidth, height: barHeight, top: (TIMELINE_ROW_HEIGHT - barHeight) / 2, backgroundColor: barColor, borderLeft: `3px solid ${statusColors.bg}`, ...(span?.isOpenEnded && { borderRight: "none", borderTopRightRadius: 0, borderBottomRightRadius: 0, maskImage: OPEN_END_MASK, WebkitMaskImage: OPEN_END_MASK }), ...(span?.isStartEstimated && { borderLeftStyle: "dashed" as const }) }} onContextMenu={openStatusMenu}>
            {!isDragDisabled && <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/15" onMouseDown={(e) => handleMouseDown(e, "resize-left")} />}
            {task.priority === "high" && <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-sa-amber z-10 pointer-events-none" />}
            <div className={cn("flex-1 flex items-center px-2 overflow-visible", !isDragDisabled && "cursor-grab active:cursor-grabbing")} onMouseDown={(e) => handleMouseDown(e, "move")}>
                {isSubtask && <CornerDownRight className="h-2.5 w-2.5 mr-1 flex-shrink-0 text-muted-foreground" />}
                {task.isMilestone && <Diamond className="h-2.5 w-2.5 mr-1 fill-current flex-shrink-0 text-sa-amber" aria-label="Milestone" />}
                <span className={cn("sticky left-2 font-medium whitespace-nowrap text-foreground", isSubtask ? "text-[10px]" : "text-xs")}>{formatTaskLabel(task)}</span>
            </div>
            {!isDragDisabled && <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/15" onMouseDown={(e) => handleMouseDown(e, "resize-right")} />}
        </div>
    );
}
