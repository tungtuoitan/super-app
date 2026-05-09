/**
 * TaskFlowNode — custom React Flow node.
 * - Project label above node (subtle, outside node bounds)
 * - Muted status-colored background
 * - 4 handles (top, bottom, left, right) — hidden until hover or selected
 * - Double-click to rename inline
 * - FigJam-style minibar below node when selected (status pills + project picker)
 * - Delete key → handled at canvas level (soft-delete task)
 */

import React, { useState, useEffect, useRef } from "react";
import { projectConstants } from "@/features/project/project.constants";
import { Handle, Position, useStore } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowNodeHelper } from "@/features/multiProject/hooks/mpTaskFlow/useMultiProjectTaskFlowNode.helper";
import { useMultiProjectTaskFlowSelector } from "@/features/multiProject/Selectors/useMultiProjectTaskFlow.selector";
import { useTaskTabHelper } from "@/features/taskDetail";
import { getStatusBorderColor, getStatusNodeBackground } from "@/features/multiProject/utils/multiProjectTaskFlow.utils";
import { ExternalLink, ChevronDown, Circle } from "lucide-react";
import type { TaskFlowNodeData } from "@/features/multiProject/types/multiProjectTaskFlow.type";
import { useGetStandardRegistry } from "@/shared";
import type { StandardRegistry } from "@/shared";
import { TaskFlowProcessPopup } from "./TaskFlowProcessPopup";

const HANDLE_BASE = "!rounded-full !border-[1.5px] !border-primary !bg-primary/80 z-10 !w-2 !h-2 hover:!w-3 hover:!h-3 !transition-all !duration-150";

export function TaskFlowNode({ id, data, selected }: NodeProps<Node<TaskFlowNodeData>>) {
    const { editingNodeId, draggingNodeId, flowNodes, flowEdges, connectingSourceId } = useMultiTaskFlowStore();
    const { handleRenameStart, handleRenameConfirm, handleRenameCancel, handleChangeProject, handleChangeStatus, isNodeLocked } = useMultiProjectTaskFlowNodeHelper();
    const { allProjects } = useMultiProjectTaskFlowSelector();
    const { openTaskTab } = useTaskTabHelper();
    const zoom = useStore((s) => s.transform[2]);
    const statusOptions = useGetStandardRegistry("task_status");

    const isEditing = editingNodeId === id;
    const isTempNode = id.startsWith("temp-node-");
    const nodeLocked = isNodeLocked(id);
    const isHighPriority = data.task.priority === "high" || data.task.priority === "urgent";
    const isDone = data.task.status === "completed" || data.task.status === "cancelled" || data.task.status === "failed";
    const isInProgress = data.task.status === "in_progress";
    const isBgProgress = data.task.status === "background_progress";
    const nodeOpacity = isDone ? 0.4 : 1;
    const [editValue, setEditValue] = useState(data.task.title);
    const [isHovered, setIsHovered] = useState(false);
    const [projectPickerOpen, setProjectPickerOpen] = useState(false);
    const isDragging = draggingNodeId === id;
    const multiSelected = flowNodes.filter((n) => n.selected).length > 1;
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const borderColor = getStatusBorderColor(data.task.status);
    const bgColor = getStatusNodeBackground(data.task.status);
    const anyEdgeSelected = flowEdges.some((e) => e.selected);
    const isConnectingDrag = !!connectingSourceId;
    const showHandles = !anyEdgeSelected && !nodeLocked && !isConnectingDrag && (isHovered || (!!selected && !multiSelected));
    const handleOpacity: React.CSSProperties = { opacity: showHandles ? 1 : 0, transition: "opacity 0.15s" };

    // Focus input when entering edit mode (retry until mounted)
    useEffect(() => {
        if (!isEditing) return;
        setEditValue(data.task.title);
        let attempts = 0;
        const tryFocus = () => {
            if (inputRef.current) {
                inputRef.current.focus();
                inputRef.current.select();
            } else if (attempts < 20) {
                attempts++;
                setTimeout(tryFocus, 30);
            }
        };
        setTimeout(tryFocus, 50);
    }, [isEditing, data.task.title]);

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

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (nodeLocked) return;
        e.stopPropagation();
        handleRenameStart(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || (e.key.toLowerCase() === "s" && e.ctrlKey)) handleRenameConfirm(id, editValue);
        if (e.key === "Escape") {
            if (isTempNode) {
                handleRenameConfirm(id, "");
            } else {
                handleRenameCancel();
            }
        }
    };

    const handleBlur = () => {
        if (isTempNode) {
            handleRenameConfirm(id, "");
        } else {
            handleRenameConfirm(id, editValue);
        }
    };

    const onProjectChange = (projectId: number) => {
        handleChangeProject(id, projectId);
        setProjectPickerOpen(false);
    };

    const onStatusClick = (status: string) => {
        handleChangeStatus(id, status);
    };

    const currentProject = allProjects.find((p) => p.id === data.task.projectId);
    const nodeWidth = 200;

    return (
        <div ref={nodeRef} className="relative" style={{ opacity: nodeOpacity, width: nodeWidth }}>
            {/* Project label — absolute above node, no layout impact */}
            <span className="absolute -top-4 left-0 right-0 text-center text-[9px] text-muted-foreground/50 truncate select-none pointer-events-none">
                {data.projectName}
            </span>

            {/* Node body */}
            <div
                className={cn(
                    "relative rounded-xl border shadow-sm transition-shadow duration-150 select-none",
                    selected ? "shadow-lg ring-1 ring-blue-500/50" : "hover:shadow-md",
                    isEditing && "ring-2 ring-blue-500",
                    isInProgress && !selected && "taskflow-inprogress",
                    isBgProgress && !selected && "taskflow-bgprogress",
                )}
                style={{
                    width: nodeWidth,
                    borderColor: borderColor + "66",
                    borderLeftWidth: "3px",
                    borderLeftColor: borderColor,
                    backgroundColor: bgColor,
                }}
                onDoubleClick={handleDoubleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {!isTempNode && (
                    <>
                        <Handle type="source" position={Position.Top}    id="top"    className={HANDLE_BASE} style={{ ...handleOpacity, top: -6 }} />
                        <Handle type="source" position={Position.Bottom} id="bottom" className={HANDLE_BASE} style={{ ...handleOpacity, bottom: -6 }} />
                        <Handle type="source" position={Position.Left}   id="left"   className={HANDLE_BASE} style={{ ...handleOpacity, left: -6 }} />
                        <Handle type="source" position={Position.Right}  id="right"  className={HANDLE_BASE} style={{ ...handleOpacity, right: -6 }} />
                    </>
                )}

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

                    <TaskFlowProcessPopup nodeId={id} />
                </div>
            </div>

            {/* FigJam-style minibar — absolute below node, counter-scaled to ignore zoom */}
            {selected && !isTempNode && !isDragging && !multiSelected && (
                <div
                    className="absolute left-1/2 origin-top flex items-center gap-1 px-1 py-0.5 bg-card/90 border border-border rounded-lg shadow-sm nodrag nopan whitespace-nowrap"
                    style={{ top: "100%", marginTop: 6, transform: `translateX(-50%) scale(${1 / zoom})` }}
                >
                    {/* Status pills from registry */}
                    {statusOptions.map((opt: StandardRegistry) => {
                        const isActive = data.task.status === opt.code;
                        const color = (projectConstants.optionColor.taskStatus.colors[opt.code] ?? projectConstants.optionColor.taskStatus.default).bg;
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
