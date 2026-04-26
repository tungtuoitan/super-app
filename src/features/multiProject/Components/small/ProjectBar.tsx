/**
 * ProjectBar - Draggable Project Bar for Timeline View
 * Inline drag logic (no external hook). Calls onDateChange on drag end.
 */

import React, { useMemo, useRef, useState, useEffect } from "react";
import type { Project } from "@/features/project";
import { getProjectStatusColors } from "@/features/project";
import { TIMELINE_MIN_BAR_WIDTH } from "@/features/taskDetail";
import { cn } from "@/lib/utils";
import { PRO_ROW_HEIGHT } from "@/features/multiProject/utils/multiProjectDetail.constants";

const PRO_BAR_HEIGHT = 36;

export interface ProjectBarProps {
    project: Project;
    timelineStart: Date;
    dayWidth: number;
    onDateChange: (projectId: number, startDate: Date | null, endDate: Date | null) => void;
    onProjectClick: (project: Project) => void;
}

export function ProjectBar({ project, timelineStart, dayWidth, onDateChange, onProjectClick }: ProjectBarProps) {
    const barRef = useRef<HTMLDivElement>(null);
    const statusColors = getProjectStatusColors(project.status || "");

    // ── Position from dates ──────────────────────────────
    const { left, width, hasValidDates } = (() => {
        if (!project.startDate && !project.endDate) return { left: 0, width: TIMELINE_MIN_BAR_WIDTH, hasValidDates: false };
        const start = project.startDate || project.endDate || new Date();
        const end = project.endDate || project.startDate || new Date();
        const startDiff = Math.floor((start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        return { left: startDiff * dayWidth, width: Math.max(TIMELINE_MIN_BAR_WIDTH, duration * dayWidth - 4), hasValidDates: true };
    })()

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

            if (dL !== 0 || dW !== 0) {
                let nS: Date | null = project.startDate ? new Date(project.startDate) : null;
                let nE: Date | null = project.endDate ? new Date(project.endDate) : null;
                const effS = project.startDate || project.endDate;
                const effE = project.endDate || project.startDate;

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
                onDateChange(project.id, nS, nE);
            } else {
                setCurrentLeft(left); setCurrentWidth(width);
                if (!_hD) onProjectClick(project);
            }
            setHasDragged(false);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp); };
    }, [isDragging, dragStartX, originalLeft, originalWidth, left, width, project, dayWidth]);

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
        <div ref={barRef} className={cn("absolute flex items-center rounded-lg transition-shadow group cursor-pointer", isDragging && "shadow-lg z-10")} style={{ left: currentLeft, width: currentWidth, height: PRO_BAR_HEIGHT, top: (PRO_ROW_HEIGHT - PRO_BAR_HEIGHT) / 2, backgroundColor: `${statusColors.bg}30`, border: `2px solid ${statusColors.bg}`, borderLeft: `4px solid ${statusColors.bg}` }}>
            <div className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20" onMouseDown={(e) => handleMouseDown(e, "resize-left")} />
            <div className="flex-1 flex items-center px-3 overflow-visible cursor-grab active:cursor-grabbing" onMouseDown={(e) => handleMouseDown(e, "move")}>
                <span className="font-bold text-xs uppercase tracking-wider whitespace-nowrap" style={{ color: statusColors.bg }}>{project.name || "Untitled"}</span>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-white/20" onMouseDown={(e) => handleMouseDown(e, "resize-right")} />
        </div>
    );
}
