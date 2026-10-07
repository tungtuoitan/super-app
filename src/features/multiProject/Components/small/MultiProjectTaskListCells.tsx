/**
 * MultiProjectTaskListCells - Memoized Table Cells for MultiProjectTaskList
 * Contains StatusCell, PriorityCell, and ProjectCell components.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Circle } from "lucide-react";
import type { Task } from "@/features/taskDetail";
import { StatusAutoComplete, IStatusOption } from "@/shared";
import { cn } from "@/lib/utils";
import type { Project } from "@/features/project/types/project.types";
import { projectConstants } from "@/features/project/project.constants";

/**
 * Memoized Status Cell
 */
export const StatusCell = function StatusCell({
    task,
    statusOptions,
    onUpdate,
}: {
    task: Task;
    statusOptions: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}) {
    const currentValue = statusOptions.find((opt) => opt.code === task.status) || null;

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <StatusAutoComplete
                value={currentValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        onUpdate(task, "status", newValue.code);
                    }
                }}
                options={statusOptions}
                inputProps={{ name: "status" }}
                size="tiny"
                disabled={!!task.deletedAt}
                disableClearable
            />
        </div>
    );
}

/**
 * Memoized Priority Cell
 */
export const PriorityCell = function PriorityCell({
    task,
    priorityOptions,
    onUpdate,
}: {
    task: Task;
    priorityOptions: IStatusOption[];
    onUpdate: (task: Task, field: "status" | "priority", value: string) => void;
}) {
    const currentValue = priorityOptions.find((opt) => opt.code === task.priority) || null;

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <StatusAutoComplete
                value={currentValue}
                onChange={(_, newValue) => {
                    if (newValue) {
                        onUpdate(task, "priority", newValue.code);
                    }
                }}
                options={priorityOptions}
                inputProps={{ name: "priority" }}
                size="tiny"
                disabled={!!task.deletedAt}
                disableClearable
            />
        </div>
    );
}

/**
 * ProjectCell — dropdown picker to change a task's project.
 * Style mirrors the FigJam-style minibar project picker in TaskFlowNode.
 * Dropdown is rendered via portal so it isn't clipped by table cell overflow.
 */
export const ProjectCell = function ProjectCell({
    task,
    allProjects,
    onChange,
}: {
    task: Task;
    allProjects: Project[];
    onChange: (task: Task, newProjectId: number) => void;
}) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentProject = allProjects.find((p) => p.id === task.projectId);
    const currentName = currentProject?.name ?? `Project ${task.projectId}`;

    useLayoutEffect(() => {
        if (!open || !buttonRef.current) return;
        const updatePosition = () => {
            const rect = buttonRef.current!.getBoundingClientRect();
            const dropdownWidth = Math.max(rect.width, 240);
            const viewportWidth = window.innerWidth;
            const left = Math.min(rect.left, viewportWidth - dropdownWidth - 8);
            setCoords({ top: rect.bottom + 4, left, width: dropdownWidth });
        };
        updatePosition();
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
            window.removeEventListener("scroll", updatePosition, true);
            window.removeEventListener("resize", updatePosition);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            const target = e.target as globalThis.Node;
            if (
                buttonRef.current &&
                !buttonRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    return (
        <div className="px-1" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                type="button"
                disabled={!!task.deletedAt}
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    "w-full flex h-7 items-center justify-between gap-1 px-2 rounded-md text-[12px] transition-colors duration-100",
                    "text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground",
                    open && "bg-sa-hover-strong text-foreground",
                    task.deletedAt && "opacity-50 cursor-not-allowed",
                )}
                title={currentName}
            >
                <span className="truncate">{currentName}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
            </button>

            {open && coords && createPortal(
                <div
                    ref={dropdownRef}
                    style={{
                        position: "fixed",
                        top: coords.top,
                        left: coords.left,
                        width: coords.width,
                        zIndex: 9999,
                    }}
                    className="sa-shadow-pop max-h-[400px] overflow-y-auto bg-popover border border-sa-border-strong rounded-lg p-1"
                    onWheel={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {allProjects.map((p) => {
                        const isActive = projectConstants.liveStatuses.includes(p.status);
                        const isDeleted = !!p.deletedAt;
                        const isCurrent = p.id === task.projectId;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                disabled={isDeleted}
                                onClick={() => {
                                    if (!isDeleted && !isCurrent) {
                                        onChange(task, p.id);
                                    }
                                    setOpen(false);
                                }}
                                className={cn(
                                    "w-full flex h-8 items-center gap-2 px-2 rounded-md text-left text-[13px] transition-colors duration-100",
                                    isDeleted
                                        ? "opacity-40 cursor-not-allowed text-muted-foreground"
                                        : isCurrent
                                            ? "bg-sa-hover-strong text-foreground font-medium"
                                            : "text-muted-foreground hover:bg-sa-hover-strong hover:text-foreground",
                                )}
                            >
                                <Circle
                                    className={cn(
                                        "w-2 h-2 shrink-0",
                                        isActive && !isDeleted ? "fill-sa-good text-sa-good" : "fill-muted-foreground/30 text-muted-foreground/30",
                                    )}
                                />
                                <span className="truncate">{p.name}</span>
                            </button>
                        );
                    })}
                </div>,
                document.body,
            )}
        </div>
    );
}
