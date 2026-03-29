/**
 * TaskFlowNode — custom React Flow node.
 * - Project label above node (subtle, outside node bounds)
 * - Muted status-colored background
 * - 4 handles (top, bottom, left, right) — hidden until hover or selected
 * - Double-click to rename inline
 * - FigJam-style minibar below node when selected (status pills + project picker)
 * - Delete key → set status to cancelled
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useMultiTaskFlowStore } from "@/store/task/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowNodeHelper } from "@/hooks/multiProject/useMultiProjectTaskFlowNode.helper";
import { useMultiProjectTaskFlowSelector } from "@/Selectors/multipleProject/useMultiProjectTaskFlow.selector";
import { useGeneralStore } from "@/store/general/General.store";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { getStatusBorderColor, getStatusNodeBackground } from "@/utils/project/multiProjectTaskFlow.utils";
import { parseChecklistJson, checklistProgress } from "@/utils/checklist.utils";
import { constants } from "@/utils/constants";
import { ExternalLink, ChevronDown, Circle } from "lucide-react";
import type { TaskFlowNodeData } from "@/types/multiProject/multiProjectTaskFlow.type";

const HANDLE_BASE = "!w-3 !h-3 !rounded-full !border-2 !border-primary !bg-primary/80 z-10";

export function TaskFlowNode({ id, data, selected }: NodeProps<Node<TaskFlowNodeData>>) {
    const { editingNodeId, draggingNodeId } = useMultiTaskFlowStore();
    const { handleRenameStart, handleRenameConfirm, handleRenameCancel, handleChangeProject, handleChangeStatus } = useMultiProjectTaskFlowNodeHelper();
    const { allProjects } = useMultiProjectTaskFlowSelector();
    const { registriesByType } = useGeneralStore();
    const { openTaskTab } = useTaskTabHelper();
    const statusOptions = registriesByType["task_status"] ?? [];

    const isEditing = editingNodeId === id;
    const isTempNode = id.startsWith("temp-node-");
    const isHighPriority = data.task.priority === "high" || data.task.priority === "urgent";
    const [editValue, setEditValue] = useState(data.task.title);
    const [isHovered, setIsHovered] = useState(false);
    const [projectPickerOpen, setProjectPickerOpen] = useState(false);
    const isDragging = draggingNodeId === id;
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const borderColor = getStatusBorderColor(data.task.status);
    const bgColor = getStatusNodeBackground(data.task.status);
    const showHandles = isHovered || !!selected;
    const handleOpacity: React.CSSProperties = { opacity: showHandles ? 1 : 0, transition: "opacity 0.15s" };

    // Process progress (checked / total)
    const progress = useMemo(() => {
        const parsed = parseChecklistJson(data.task.processJson ?? null);
        if (!parsed) return null;
        const { done, total } = checklistProgress(parsed);
        if (total === 0) return null;
        return { done, total, percent: Math.round((done / total) * 100) };
    }, [data.task.processJson]);

    // Focus input when entering edit mode (retry until mounted)
    useEffect(() => {
        if (!isEditing) return;
        setEditValue(data.task.title);
        let attempts = 0;
        const tryFocus = () => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            } else if (attempts < 5) {
                attempts++;
                requestAnimationFrame(tryFocus);
            }
        };
        requestAnimationFrame(tryFocus);
    }, [isEditing, data.task.title]);

    // Delete key → set status to cancelled (only when selected, not editing, not temp)
    useEffect(() => {
        if (!selected || isEditing || isTempNode) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                handleChangeStatus(id, "cancelled");
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [selected, isEditing, isTempNode, id, handleChangeStatus]);

    const handleDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleRenameStart(id);
    }, [id, handleRenameStart]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleRenameConfirm(id, editValue);
        if (e.key === "Escape") {
            if (isTempNode) {
                handleRenameConfirm(id, "");
            } else {
                handleRenameCancel();
            }
        }
    }, [id, isTempNode, editValue, handleRenameConfirm, handleRenameCancel]);

    const handleBlur = useCallback(() => {
        if (isTempNode) {
            handleRenameConfirm(id, "");
        } else {
            handleRenameConfirm(id, editValue);
        }
    }, [id, isTempNode, editValue, handleRenameConfirm]);

    const onProjectChange = useCallback((projectId: number) => {
        handleChangeProject(id, projectId);
        setProjectPickerOpen(false);
    }, [id, handleChangeProject]);

    const onStatusClick = useCallback((status: string) => {
        handleChangeStatus(id, status);
    }, [id, handleChangeStatus]);

    // Close project picker on click outside
    useEffect(() => {
        if (!projectPickerOpen) return;
        const onClick = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as globalThis.Node)) {
                setProjectPickerOpen(false);
            }
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [projectPickerOpen]);

    const currentProject = allProjects.find((p) => p.id === data.task.projectId);

    return (
        <div ref={nodeRef} className="relative w-[200px]">
            {/* Project label — absolute above node, no layout impact */}
            <span className="absolute -top-4 left-0 right-0 text-center text-[9px] text-muted-foreground/50 truncate select-none pointer-events-none">
                {data.projectName}
            </span>

            {/* Node body */}
            <div
                className={cn(
                    "relative rounded-xl border shadow-sm w-[200px] transition-shadow duration-150 select-none",
                    selected ? "shadow-lg ring-1 ring-primary/50" : "hover:shadow-md",
                    isEditing && "ring-2 ring-primary",
                )}
                style={{
                    borderColor: borderColor + "66",
                    borderLeftWidth: "3px",
                    borderLeftColor: borderColor,
                    backgroundColor: bgColor,
                }}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Handle type="source" position={Position.Top}    id="top"    className={HANDLE_BASE} style={{ ...handleOpacity, top: -6 }} />
                <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_BASE} style={{ ...handleOpacity, bottom: -6 }} />
                <Handle type="source" position={Position.Left}   id="left"   className={HANDLE_BASE} style={{ ...handleOpacity, left: -6 }} />
                <Handle type="source" position={Position.Right}  id="right"  className={HANDLE_BASE} style={{ ...handleOpacity, right: -6 }} />

                <div className="px-3 py-3 flex flex-col items-center gap-1.5">
                    {isHighPriority && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50" title={data.task.priority} />
                    )}

                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-center text-sm font-semibold bg-transparent outline-none text-foreground border-b border-primary/60 pb-0.5 nodrag"
                        />
                    ) : (
                        <p
                            className={cn(
                                "text-center text-sm font-semibold text-foreground leading-snug line-clamp-3 w-full",
                                data.task.status === "cancelled" && "line-through text-muted-foreground",
                            )}
                            title={data.task.title}
                        >
                            {data.task.title || <span className="italic text-muted-foreground font-normal">Untitled</span>}
                        </p>
                    )}

                    {/* Process progress bar */}
                    {progress && (
                        <div className="w-full flex items-center gap-1.5 mt-0.5">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percent}%`, backgroundColor: borderColor }}
                                />
                            </div>
                            <span className="text-[8px] text-muted-foreground tabular-nums shrink-0">
                                {progress.done}/{progress.total}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* FigJam-style minibar — absolute below node, no layout impact */}
            {selected && !isTempNode && !isDragging && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 flex items-center gap-1 px-1 py-0.5 bg-card/90 border border-border rounded-lg shadow-sm nodrag nopan whitespace-nowrap">
                    {/* Status pills from registry */}
                    {statusOptions.filter((s) => s.isActive).map((opt) => {
                        const isActive = data.task.status === opt.code;
                        const color = (constants.optionColor.taskStatus.colors[opt.code] ?? constants.optionColor.taskStatus.default).bg;
                        return (
                            <button
                                key={opt.code}
                                type="button"
                                onClick={() => onStatusClick(opt.code)}
                                title={opt.description ?? opt.code}
                                className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] transition-colors",
                                    isActive
                                        ? "bg-primary/15 text-foreground font-semibold"
                                        : "text-muted-foreground hover:bg-muted",
                                )}
                            >
                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                {isActive && (opt.description ?? opt.code)}
                            </button>
                        );
                    })}

                    {/* Divider */}
                    <div className="w-px h-3 bg-border mx-0.5" />

                    {/* View detail */}
                    <button
                        type="button"
                        onClick={() => openTaskTab(data.task)}
                        title="Open task detail"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Detail
                    </button>

                    {/* Divider */}
                    <div className="w-px h-3 bg-border mx-0.5" />

                    {/* Project picker dropdown */}
                    <div ref={pickerRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setProjectPickerOpen((v) => !v)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors max-w-[100px]"
                            title="Change project"
                        >
                            <span className="truncate">{currentProject?.name ?? "Project"}</span>
                            <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                        </button>

                        {projectPickerOpen && (
                            <div className="absolute bottom-full left-0 mb-1 w-44 max-h-52 overflow-y-auto bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                                {allProjects.map((p) => {
                                    const isActive = p.status === "active";
                                    const isCurrent = p.id === data.task.projectId;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => onProjectChange(p.id)}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[10px] transition-colors",
                                                isCurrent
                                                    ? "bg-primary/10 text-foreground font-semibold"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                            )}
                                        >
                                            <Circle
                                                className={cn(
                                                    "w-2 h-2 shrink-0",
                                                    isActive ? "fill-emerald-500 text-emerald-500" : "fill-muted-foreground/30 text-muted-foreground/30",
                                                )}
                                            />
                                            <span className="truncate">{p.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
