/**
 * TaskFlowNode — custom React Flow node.
 * - Project label above node (subtle, outside node bounds)
 * - Muted status-colored background
 * - 4 handles (top, bottom, left, right) — hidden until hover or selected
 * - Double-click to rename inline
 * - FigJam-style minibar below node when selected (status pills + project picker)
 * - Delete key → set status to cancelled
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowNodeHelper } from "@/features/multiProject/hooks/useMultiProjectTaskFlowNode.helper";
import { useMultiProjectTaskFlowSelector } from "@/features/multiProject/Selectors/useMultiProjectTaskFlow.selector";
import { useGeneralStore } from "@/store/General.store";
import { useTaskTabHelper } from "@/features/task/hooks/useTaskTab.helper";
import { getStatusBorderColor, getStatusNodeBackground } from "@/features/multiProject/utils/multiProjectTaskFlow.utils";
import { parseChecklistJson, checklistProgress, toggleChecklistItem, getItemCheckState, flatItemIndex, getFlatItems } from "@/utils/checklist.utils";
import { constants } from "@/utils/constants";
import { ExternalLink, ChevronDown, ChevronRight, Circle, CheckSquare2, Square } from "lucide-react";
import { useTaskGridStore } from "@/features/task/store/useTaskGrid.store";
import { taskService } from "@/features/task/service/task.service";
import { useAuthStore } from "@/store/Auth.store";
import { toLocalISOString } from "@/utils/date.utils";
import type { TaskFlowNodeData } from "@/features/multiProject/types/multiProjectTaskFlow.type";

const HANDLE_BASE = "!rounded-full !border-[1.5px] !border-primary !bg-primary/80 z-10 !w-2 !h-2 hover:!w-3 hover:!h-3 !transition-all !duration-150";

export function TaskFlowNode({ id, data, selected }: NodeProps<Node<TaskFlowNodeData>>) {
    const { editingNodeId, draggingNodeId, flowNodes, flowEdges, connectingSourceId, setFlowNodes } = useMultiTaskFlowStore();
    const { handleRenameStart, handleRenameConfirm, handleRenameCancel, handleChangeProject, handleChangeStatus, isNodeLocked } = useMultiProjectTaskFlowNodeHelper();
    const { allProjects } = useMultiProjectTaskFlowSelector();
    const { registriesByType } = useGeneralStore();
    const { openTaskTab } = useTaskTabHelper();
    const zoom = useStore((s) => s.transform[2]);
    const { setTasks } = useTaskGridStore();
    const { $user } = useAuthStore();
    const statusOptions = registriesByType["task_status"] ?? [];

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
    const multiSelected = flowNodes.filter((n) => n.selected).length > 1
    const inputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const borderColor = getStatusBorderColor(data.task.status);
    const bgColor = getStatusNodeBackground(data.task.status);
    const anyEdgeSelected = flowEdges.some((e) => e.selected)
    const isConnectingDrag = !!connectingSourceId;
    const showHandles = !anyEdgeSelected && !nodeLocked && !isConnectingDrag && (isHovered || (!!selected && !multiSelected));
    const handleOpacity: React.CSSProperties = { opacity: showHandles ? 1 : 0, transition: "opacity 0.15s" };

    // Process progress (checked / total)
    const parsedProcess = parseChecklistJson(data.task.processJson ?? null)
    const progress = (() => {
        if (!parsedProcess) return null;
        const { done, total } = checklistProgress(parsedProcess);
        if (total === 0) return null;
        return { done, total, percent: Math.round((done / total) * 100) };
    })()

    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const popupScrollRef = useRef<HTMLDivElement>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (name: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const handleProgressEnter = () => {
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
        setShowProgressPopup(true);
    };
    const handleProgressLeave = () => {
        popupTimeoutRef.current = setTimeout(() => setShowProgressPopup(false), 200);
    };

    const canToggleProcess = (isInProgress || isBgProgress) && !nodeLocked;

    const handleToggleProcess = async (gi: number, ii: number) => {
            if (!parsedProcess || !canToggleProcess) return;
            const item = parsedProcess.groups[gi]?.items[ii];
            if (!item) return;
            // Sequential locking guard
            if (!item.isOptional) {
                const fi = flatItemIndex(parsedProcess, gi, ii);
                const s = getItemCheckState(item);
                if (!s.isChecked && !s.isSkipped) {
                    const flat = getFlatItems(parsedProcess);
                    let nextReq = flat.length;
                    for (let i = 0; i < flat.length; i++) {
                        if (flat[i].isOptional) continue;
                        const fs = getItemCheckState(flat[i]);
                        if (!fs.isChecked && !fs.isSkipped) { nextReq = i; break; }
                    }
                    if (fi > nextReq) return;
                }
            }
            const newJson = toggleChecklistItem(parsedProcess, gi, ii, "check");
            const newJsonStr = JSON.stringify(newJson);

            const task = data.task;
            const oldProcessJson = task.processJson;

            // Check if all items are now done → auto-complete
            const { done, total } = checklistProgress(newJson);
            const allDone = total > 0 && done === total;

            // Optimistic update
            setFlowNodes((prev) =>
                prev.map((n) =>
                    n.id === id
                        ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, processJson: newJsonStr, ...(allDone ? { status: "completed" } : {}) } } }
                        : n,
                ),
            );
            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, processJson: newJsonStr, ...(allDone ? { status: "completed" as const } : {}) } : t)));

            try {
                const result = await taskService._upsertTaskBatch($user.userToken, [{
                    id: task.id, projectId: task.projectId, parentTaskId: task.parentTaskId,
                    type: task.type, title: task.title, note: task.note,
                    status: allDone ? "completed" : task.status,
                    priority: task.priority, startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate), orderIndex: task.orderIndex,
                    folderWorkspaceItemId: task.folderWorkspaceItemId,
                    checklistJson: task.checklistJson, processJson: newJsonStr, customTabsJson: task.customTabsJson,
                }]);
                if (!result.success) throw new Error();
            } catch {
                // Rollback
                setFlowNodes((prev) =>
                    prev.map((n) =>
                        n.id === id
                            ? { ...n, data: { ...(n.data as TaskFlowNodeData), task: { ...(n.data as TaskFlowNodeData).task, processJson: oldProcessJson, ...(allDone ? { status: task.status } : {}) } } }
                            : n,
                    ),
                );
                setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, processJson: oldProcessJson, ...(allDone ? { status: task.status } : {}) } : t)));
            }
        };

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
        // Initial delay lets React Flow finish mounting the new node
        setTimeout(tryFocus, 50);
    }, [isEditing, data.task.title]);

    // Delete key → set status to cancelled (only when selected, not editing, not temp, not locked)
    useEffect(() => {
        if (!selected || isEditing || isTempNode || nodeLocked) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                handleChangeStatus(id, "cancelled");
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [selected, isEditing, isTempNode, nodeLocked, id]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (nodeLocked) return;
        e.stopPropagation();
        handleRenameStart(id);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleRenameConfirm(id, editValue);
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

                    {/* Process progress bar + popup */}
                    {progress && (
                        <div className="relative w-full">
                            <div className="w-full flex items-center gap-1.5 mt-0.5">
                                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${progress.percent}%`, backgroundColor: borderColor }}
                                    />
                                </div>
                                <span
                                    className="text-[8px] text-muted-foreground tabular-nums shrink-0 cursor-pointer hover:text-foreground transition-colors"
                                    onMouseEnter={handleProgressEnter}
                                    onMouseLeave={handleProgressLeave}
                                >
                                    {progress.done}/{progress.total}
                                </span>
                            </div>

                            {/* Checklist popup */}
                            {showProgressPopup && parsedProcess && (
                                <div
                                    className="absolute left-1/2 z-50 nodrag nopan taskflow-scroll-popup"
                                    style={{ top: "100%", marginTop: 4, transform: `translateX(-50%) scale(${1 / zoom})`, transformOrigin: "top center" }}
                                    onMouseEnter={handleProgressEnter}
                                    onMouseLeave={handleProgressLeave}
                                    onWheel={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (popupScrollRef.current) {
                                            popupScrollRef.current.scrollTop += e.deltaY;
                                        }
                                    }}
                                >
                                    <div ref={popupScrollRef} className="bg-card/95 backdrop-blur-sm border border-border text-left rounded-lg shadow-xl py-1.5 px-2 space-y-0.5 min-w-[220px] max-w-[300px] max-h-[280px] overflow-y-auto">
                                        {(() => {
                                            const flat = getFlatItems(parsedProcess);
                                            let nextReq = flat.length;
                                            for (let i = 0; i < flat.length; i++) {
                                                if (flat[i].isOptional) continue;
                                                const fs = getItemCheckState(flat[i]);
                                                if (!fs.isChecked && !fs.isSkipped) { nextReq = i; break; }
                                            }

                                            return parsedProcess.groups.map((group, gi) => {
                                                const level = group.level ?? 1;
                                                const collapsed = collapsedGroups.has(group.name);
                                                const groupDone = group.items.every(item => {
                                                    const s = getItemCheckState(item);
                                                    return s.isChecked || s.isSkipped;
                                                });

                                                const headerIndent = level === 1 ? "" : level === 2 ? "pl-4" : "pl-8";
                                                const itemIndent = level === 1 ? "pl-3" : level === 2 ? "pl-7" : "pl-11";

                                                return (
                                                    <div key={gi} className="space-y-0.5">
                                                        {/* Group header (skip for continuation groups) */}
                                                        {group.name && !group.isContinuation && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleGroup(group.name)}
                                                                className={cn(
                                                                    "flex items-center gap-1 w-full text-left py-0.5",
                                                                    "text-[10px] text-muted-foreground hover:text-foreground transition-colors",
                                                                    headerIndent,
                                                                    level === 1 ? "font-semibold" : "font-normal",
                                                                )}
                                                            >
                                                                {collapsed
                                                                    ? <ChevronRight className="h-2.5 w-2.5 shrink-0" />
                                                                    : <ChevronDown className="h-2.5 w-2.5 shrink-0" />}
                                                                <span className={cn(groupDone && "line-through opacity-50")}>
                                                                    {group.name}
                                                                </span>
                                                            </button>
                                                        )}

                                                        {/* Items (hidden when collapsed) */}
                                                        {!collapsed && group.items.map((item, ii) => {
                                                            const s = getItemCheckState(item);
                                                            const fi = flatItemIndex(parsedProcess, gi, ii);
                                                            const isLocked = !item.isOptional && !s.isChecked && !s.isSkipped && fi > nextReq;

                                                            return (
                                                                <div
                                                                    key={ii}
                                                                    className={cn(
                                                                        "flex items-start gap-1.5 py-0.5 px-0.5 rounded",
                                                                        itemIndent,
                                                                        !canToggleProcess ? "opacity-50 cursor-default"
                                                                            : isLocked ? "opacity-35"
                                                                            : "hover:bg-muted/40 cursor-pointer",
                                                                    )}
                                                                    onClick={() => canToggleProcess && !isLocked && handleToggleProcess(gi, ii)}
                                                                >
                                                                    <span className="mt-0.5 shrink-0">
                                                                        {s.isChecked
                                                                            ? <CheckSquare2 className="h-3 w-3 text-amber-500" />
                                                                            : <Square className="h-3 w-3 text-muted-foreground" />}
                                                                    </span>
                                                                    <span
                                                                        className={cn(
                                                                            "flex-1 text-[10px] leading-4 select-none",
                                                                            (s.isChecked || s.isSkipped) && "line-through text-muted-foreground opacity-70",
                                                                        )}
                                                                    >
                                                                        {item.name}
                                                                        {item.isOptional && <span className="ml-1 text-[8px] opacity-40">-o</span>}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* FigJam-style minibar — absolute below node, counter-scaled to ignore zoom */}
            {selected && !isTempNode && !isDragging && !multiSelected && !showProgressPopup && (
                <div
                    className="absolute left-1/2 origin-top flex items-center gap-1 px-1 py-0.5 bg-card/90 border border-border rounded-lg shadow-sm nodrag nopan whitespace-nowrap"
                    style={{ top: "100%", marginTop: 6, transform: `translateX(-50%) scale(${1 / zoom})` }}
                >
                    {/* Status pills from registry */}
                    {statusOptions.map((opt) => {
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
