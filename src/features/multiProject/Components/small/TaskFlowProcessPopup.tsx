/**
 * TaskFlowProcessPopup — process checklist hover popup for TaskFlowNode.
 * Renders a progress bar and a hoverable popup with collapsible checklist groups.
 */

import React, { useState, useRef } from "react";
import { useStore } from "@xyflow/react";
import { useMultiTaskFlowStore } from "@/features/multiProject/store/useMultiTaskFlow.store";
import { useMultiProjectTaskFlowProcessHelper } from "@/features/multiProject/hooks/mpTaskFlow/useMultiProjectTaskFlowProcess.helper";
import { useMultiProjectTaskFlowHelper } from "@/features/multiProject/hooks/mpTaskFlow/useMultiProjectTaskFlow.helper";
import { parseChecklistJson, checklistProgress, getItemCheckState, flatItemIndex, getFlatItems } from "@/features/taskDetail";
import type { TaskFlowNodeData } from "@/features/multiProject/types/multiProjectTaskFlow.type";
import { projectConstants } from "@/features/project/project.constants";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, CheckSquare2, Square } from "lucide-react";

export function TaskFlowProcessPopup({ nodeId }: { nodeId: string }) {
    const { flowNodes } = useMultiTaskFlowStore();
    const { handleToggleProcess } = useMultiProjectTaskFlowProcessHelper();
    const { isNodeLocked } = useMultiProjectTaskFlowHelper();
    const zoom = useStore((s) => s.transform[2]);

    const [showProgressPopup, setShowProgressPopup] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const popupScrollRef = useRef<HTMLDivElement>(null);
    const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const node = flowNodes.find((n) => n.id === nodeId);
    const task = node ? (node.data as TaskFlowNodeData).task : null;
    const parsedProcess = parseChecklistJson(task?.processJson ?? null);

    if (!task || !parsedProcess) return null;

    const { done, total } = checklistProgress(parsedProcess);
    if (total === 0) return null;

    const percent = Math.round((done / total) * 100);
    const isInProgress = task.status === "in_progress";
    const isBgProgress = task.status === "background_progress";
    const nodeLocked = isNodeLocked(nodeId);
    const canToggleProcess = (isInProgress || isBgProgress) && !nodeLocked;

    const getProgressBarColor = () => {
        const colors = projectConstants.optionColor.taskStatus.colors[task.status];
        return colors?.bg || projectConstants.optionColor.taskStatus.default.bg;
    };

    const handleProgressEnter = () => {
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
        setShowProgressPopup(true);
    };

    const handleProgressLeave = () => {
        popupTimeoutRef.current = setTimeout(() => setShowProgressPopup(false), 200);
    };

    const toggleGroup = (name: string) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const flat = getFlatItems(parsedProcess);
    let nextReq = flat.length;
    for (let i = 0; i < flat.length; i++) {
        if (flat[i].isOptional) continue;
        const fs = getItemCheckState(flat[i]);
        if (!fs.isChecked && !fs.isSkipped) { nextReq = i; break; }
    }

    return (
        <div className="relative w-full">
            <div className="w-full flex items-center gap-1.5 mt-0.5">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%`, backgroundColor: getProgressBarColor() }}
                    />
                </div>
                <span
                    className="text-[8px] text-muted-foreground tabular-nums shrink-0 cursor-pointer hover:text-foreground transition-colors"
                    onMouseEnter={handleProgressEnter}
                    onMouseLeave={handleProgressLeave}
                >
                    {done}/{total}
                </span>
            </div>

            {showProgressPopup && (
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
                        {parsedProcess.groups.map((group, gi) => {
                            const level = group.level ?? 1;
                            const collapsed = collapsedGroups.has(group.name);
                            const groupDone = group.items.every((item) => {
                                const s = getItemCheckState(item);
                                return s.isChecked || s.isSkipped;
                            });

                            const headerIndent = level === 1 ? "" : level === 2 ? "pl-4" : "pl-8";
                            const itemIndent = level === 1 ? "pl-3" : level === 2 ? "pl-7" : "pl-11";

                            return (
                                <div key={gi} className="space-y-0.5">
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
                                                onClick={() => canToggleProcess && !isLocked && handleToggleProcess(nodeId, gi, ii)}
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
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
