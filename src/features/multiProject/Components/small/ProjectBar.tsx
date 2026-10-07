/**
 * ProjectBar - Draggable Project Bar for Timeline View
 * Inline drag logic (no external hook). Calls onDateChange on drag end.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { Project } from "@/features/project";
import { getProjectStatusColors } from "@/features/project";
import { TIMELINE_MIN_BAR_WIDTH, isStatusNonDraggable } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { PRO_ROW_HEIGHT } from "@/features/multiProject/utils/multiProjectDetail.constants";
import { resolveTimelineSpan, applyTimelineDrag, describeTimelineSpan, daysBetween } from "@/features/multiProject/utils/multiTimelineSpan.utils";

const PRO_BAR_HEIGHT = 36;
/** Open-ended bar (no end date) fades out on the right */
const OPEN_END_MASK = "linear-gradient(to right, #000 calc(100% - 160px), transparent)";

export interface ProjectBarProps {
    project: Project;
    timelineStart: Date;
    timelineEnd: Date | null;
    dayWidth: number;
    onDateChange: (projectId: number, startDate: Date | null, endDate: Date | null) => void;
    onProjectClick: (project: Project) => void;
}

export function ProjectBar({ project, timelineStart, timelineEnd, dayWidth, onDateChange, onProjectClick }: ProjectBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const statusColors = getProjectStatusColors(project.status || "");

    // ── Position from dates ──────────────────────────────
    const span = resolveTimelineSpan(project, timelineEnd, isStatusNonDraggable(project.status || ""));
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

    const currentLeftRef = useRef(currentLeft);
    const currentWidthRef = useRef(currentWidth);
    const dragTypeRef = useRef(dragType);
    const hasDraggedRef = useRef(hasDragged);
    currentLeftRef.current = currentLeft;
    currentWidthRef.current = currentWidth;
    dragTypeRef.current = dragType;
    hasDraggedRef.current = hasDragged;

    useEffect(() => { setCurrentLeft(left); setCurrentWidth(width); }, [left, width]);

    const handleMouseDown = (e: React.MouseEvent, type: "move" | "resize-left" | "resize-right") => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(true); setHasDragged(false); setDragType(type);
        setDragStartX(e.clientX); setOriginalLeft(currentLeft); setOriginalWidth(currentWidth);
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - dragStartX;
            if (Math.abs(deltaX) > 3) setHasDragged(true);
            const daysDelta = Math.round(deltaX / dayWidth);

            if (dragType === "move") {
                setCurrentLeft(originalLeft + daysDelta * dayWidth);
            } else if (dragType === "resize-left") {
                const nL = originalLeft + daysDelta * dayWidth;
                const nW = originalWidth - daysDelta * dayWidth;
                if (nW >= TIMELINE_MIN_BAR_WIDTH) { setCurrentLeft(nL); setCurrentWidth(nW); }
            } else if (dragType === "resize-right") {
                const nW = originalWidth + daysDelta * dayWidth;
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
                const { startDate, endDate } = applyTimelineDrag(project, span, _dT, dL, dW);
                onDateChange(project.id, startDate, endDate);
            } else {
                setCurrentLeft(left); setCurrentWidth(width);
                if (!_hD) onProjectClick(project);
            }
            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    }, [isDragging, dragStartX, originalLeft, originalWidth, left, width, project, dayWidth, timelineEnd]);

    // ── Render ───────────────────────────────────────────
    if (!hasValidDates) {
        return (
            <div className="absolute flex items-center px-2 text-muted-foreground italic cursor-pointer hover:text-foreground h-[36px] text-sm" style={{ top: (PRO_ROW_HEIGHT - PRO_BAR_HEIGHT) / 2, left: 4 }} onClick={() => onProjectClick(project)}>
                <span className="truncate font-semibold uppercase tracking-wide">{project.name || "Untitled"}</span>
                <span className="ml-1 text-muted-foreground/60">(no dates)</span>
            </div>
        );
    }

    return (
        <div ref={barRef} title={span ? describeTimelineSpan(span) : undefined} className={cn("absolute flex items-center rounded-lg transition-shadow group cursor-pointer", isDragging && "ring-1 ring-sa-amber/60 z-10")} style={{ left: currentLeft, width: currentWidth, height: PRO_BAR_HEIGHT, top: (PRO_ROW_HEIGHT - PRO_BAR_HEIGHT) / 2, backgroundColor: `${statusColors.bg}30`, border: `1px solid ${statusColors.bg}80`, borderLeft: `4px solid ${statusColors.bg}`, ...(span?.isOpenEnded && { borderRight: "none", borderTopRightRadius: 0, borderBottomRightRadius: 0, maskImage: OPEN_END_MASK, WebkitMaskImage: OPEN_END_MASK }), ...(span?.isStartEstimated && { borderLeftStyle: "dashed" as const }) }}>
            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/15" onMouseDown={(e) => handleMouseDown(e, "resize-left")} />
            <div className="flex-1 flex items-center px-3 overflow-visible cursor-grab active:cursor-grabbing" onMouseDown={(e) => handleMouseDown(e, "move")}>
                <span className="sticky left-3 font-medium text-xs whitespace-nowrap text-foreground">{project.name || "Untitled"}</span>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-foreground/15" onMouseDown={(e) => handleMouseDown(e, "resize-right")} />
        </div>
    );
}
