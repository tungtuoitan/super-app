/**
 * MultiProjectKanbanView - Kanban Board for Multiple Projects
 * Displays tasks from multiple projects grouped by status
 */

import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { useDrag, useDrop, DragSourceMonitor, DropTargetMonitor } from "react-dnd";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/Components/ui/alert";
import { ScrollArea } from "@/Components/ui/scroll-area";
import { Task, useTaskStore } from "@/store/task/useTask.store";
import { Project } from "@/store/project/useProject.store";
import { useMultiProjectTaskGridHelper } from "@/hooks/project/useMultiProjectTaskGrid.helper";
import { useTaskTabHelper } from "@/hooks/task/useTaskTab.helper";
import { useAuthStore } from "@/store/index";
import { useGeneralStore } from "@/store/general/General.store";
import { taskService } from "@/services/task.service";
import { cn } from "@/lib/utils";
import { constants } from "@/utils/constants";
import { toLocalISOString } from "@/utils/date.utils";

interface MultiProjectKanbanViewProps {
    projectIds: number[];
    projects: Project[];
}

const KANBAN_TASK = "KANBAN_TASK";

interface DragItem {
    type: string;
    taskId: number;
    status: string;
}

const getTaskStatusColors = (status: string) => {
    const colors = constants.optionColor.taskStatus.colors[status];
    const base = colors || constants.optionColor.taskStatus.default;
    return { ...base, border: base.bg };
};

const getTaskPriorityColors = (priority: string) => {
    const colors = constants.optionColor.taskPriority.colors[priority];
    const base = colors || constants.optionColor.taskPriority.default;
    return { dot: base.bg };
};

interface DraggableTaskCardProps {
    task: Task;
    onClick: () => void;
}

function DraggableTaskCard({ task, onClick }: DraggableTaskCardProps) {
    const ref = useRef<HTMLDivElement>(null);
    const priorityColors = getTaskPriorityColors(task.priority);

    const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
        type: KANBAN_TASK,
        item: { type: KANBAN_TASK, taskId: task.id, status: task.status },
        collect: (monitor: DragSourceMonitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(ref);

    return (
        <div
            ref={ref}
            className={cn(
                "group bg-card border rounded-md p-3 cursor-grab hover:border-primary/50 transition-all",
                isDragging && "opacity-50 shadow-lg cursor-grabbing",
                task.deletedAt && "opacity-60"
            )}
            onClick={onClick}
        >
            <div className="flex-1 min-w-0">
                {/* Title */}
                <p className="text-sm font-medium text-left truncate">{task.title || "Untitled"}</p>

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-2">
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: priorityColors.dot }}
                        title={task.priority}
                    />
                    <span className="text-xs text-muted-foreground">#{task.id}</span>
                    {task.endDate && (
                        <span className="text-xs text-muted-foreground ml-auto">
                            {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                day: "numeric",
                            }).format(task.endDate)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

interface KanbanColumnProps {
    status: { code: string; label: string };
    tasks: Task[];
    onTaskClick: (task: Task) => void;
    onDropTask: (taskId: number, newStatus: string) => void;
}

function KanbanColumn({ status, tasks, onTaskClick, onDropTask }: KanbanColumnProps) {
    const ref = useRef<HTMLDivElement>(null);
    const statusColors = getTaskStatusColors(status.code);

    const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
        accept: KANBAN_TASK,
        drop: (item: DragItem) => {
            if (item.status !== status.code) {
                onDropTask(item.taskId, status.code);
            }
        },
        canDrop: (item: DragItem) => item.status !== status.code,
        collect: (monitor: DropTargetMonitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    drop(ref);

    return (
        <div
            ref={ref}
            className={cn(
                "flex flex-col min-w-[280px] max-w-[320px] h-full bg-muted/30 rounded-lg transition-colors",
                isOver && canDrop && "bg-primary/10 ring-2 ring-primary/50",
                isOver && !canDrop && "bg-muted/50"
            )}
        >
            <div className="flex items-center gap-2 p-3 border-b">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: statusColors.bg }} />
                <span className="font-medium text-sm">{status.label}</span>
                <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tasks.length}</span>
            </div>

            <ScrollArea className="flex-1 p-2">
                <div className="space-y-2 min-h-[100px]">
                    {tasks.length === 0 ? (
                        <div className={cn("text-center text-xs text-muted-foreground py-8", isOver && canDrop && "border-primary text-primary")}></div>
                    ) : (
                        tasks.map((task) => (
                            <DraggableTaskCard
                                key={task.id}
                                task={task}
                                onClick={() => onTaskClick(task)}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

export function MultiProjectKanbanView({ projectIds, projects }: MultiProjectKanbanViewProps) {
    const { tasks, taskGridIsLoading, setTaskGridIsLoading, taskGridError } = useTaskStore();

    const { loadTasksForProjects } = useMultiProjectTaskGridHelper();
    const { openTaskTab } = useTaskTabHelper();
    const { $user } = useAuthStore();
    const { registriesByType } = useGeneralStore();

    const statusOptions = useMemo(() => {
        const taskStatuses = registriesByType["task_status"] || [];
        return taskStatuses
            .map((reg) => ({
                code: reg.code,
                label: reg.description || reg.code,
            }))
            .sort((a, b) => (constants.optionOrder.taskStatuses[a.label] ?? 999) - (constants.optionOrder.taskStatuses[b.label] ?? 999));
    }, [registriesByType]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => projectIds.includes(task.projectId) && !task.deletedAt);
    }, [tasks, projectIds]);

    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        statusOptions.forEach((status) => {
            grouped[status.code] = [];
        });
        filteredTasks.forEach((task) => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            } else {
                const firstStatus = statusOptions[0]?.code;
                if (firstStatus && grouped[firstStatus]) {
                    grouped[firstStatus].push(task);
                }
            }
        });
        Object.keys(grouped).forEach((status) => {
            grouped[status].sort((a, b) => a.orderIndex - b.orderIndex);
        });
        return grouped;
    }, [filteredTasks, statusOptions]);

    const handleDropTask = useCallback(
        async (taskId: number, newStatus: string) => {
            const task = tasks.find((t) => t.id === taskId);
            if (!task || task.status === newStatus) return;

            try {
                setTaskGridIsLoading(true);

                const upsertData = {
                    id: task.id,
                    projectId: task.projectId,
                    parentTaskId: task.parentTaskId,
                    type: task.type,
                    title: task.title,
                    note: task.note,
                    status: newStatus,
                    priority: task.priority,
                    startDate: toLocalISOString(task.startDate),
                    endDate: toLocalISOString(task.endDate),
                    orderIndex: task.orderIndex,
                };

                const result = await taskService._upsertTaskBatch($user.userToken, [upsertData]);

                if (result.success) {
                    await loadTasksForProjects(projectIds);
                }
            } catch (error) {
                console.error("Failed to update task status:", error);
            } finally {
                setTaskGridIsLoading(false);
            }
        },
        [tasks, $user.userToken, loadTasksForProjects, projectIds, setTaskGridIsLoading]
    );

    useEffect(() => {
        if ($user.userId && projectIds.length > 0) {
            loadTasksForProjects(projectIds);
        }
    }, [$user.userId, projectIds]);

    return (
        <div className="w-full h-full flex flex-col relative">
            {taskGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {taskGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load tasks</AlertDescription>
                    </Alert>
                </div>
            )}

            <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 h-full">
                    {statusOptions.map((status) => (
                        <KanbanColumn
                            key={status.code}
                            status={status}
                            tasks={tasksByStatus[status.code] || []}
                            onTaskClick={openTaskTab}
                            onDropTask={handleDropTask}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center px-4 py-1 bg-background border-t">
                <div className="text-sm text-muted-foreground">
                    {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""} from {projects.length} project
                    {projects.length !== 1 ? "s" : ""}
                </div>
            </div>
        </div>
    );
}
