/**
 * TaskGroupedTable — Linear-style task list body grouped by status (#1514).
 * Rows are the same react-table rows rendered through DraggableRow (drag → subtask, click → open tab,
 * right-click → context menu), just split into collapsible status groups.
 */

import React from "react";
import type { Row, useReactTable } from "@tanstack/react-table";
import type { Task } from "@/features/taskDetail";
import { DraggableRow } from "../../../Components/DraggableRow";
import { TaskGroupHeader } from "./TaskGroupHeader";
import type { StatusGroup } from "../../utils/taskGroup.utils";

interface TaskGroupedTableProps {
    table: ReturnType<typeof useReactTable<Task>>;
    groups: StatusGroup<Row<Task>>[];
    collapsed: Record<string, boolean>;
    onToggleGroup: (status: string) => void;
    labelOf: (status: string) => string;
    filteredTasks: Task[];
    handleContextMenu: (e: React.MouseEvent, row?: any) => void;
    handleDropTaskOntoTask: any;
    handleMakeIndependent: any;
    openTaskTab: (task: Task) => void;
    showDropError: (message: string) => void;
}

export function TaskGroupedTable({
    table,
    groups,
    collapsed,
    onToggleGroup,
    labelOf,
    filteredTasks,
    handleContextMenu,
    handleDropTaskOntoTask,
    handleMakeIndependent,
    openTaskTab,
    showDropError,
}: TaskGroupedTableProps) {
    const leafColumns = table.getAllLeafColumns();

    return (
        <div
            className="mt-3 flex-1 overflow-auto"
            onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                const isClickedOnRow = target.closest("tr[data-row]");
                if (!isClickedOnRow) {
                    handleContextMenu(e);
                }
            }}
        >
            <table className="w-full text-[13px]" style={{ tableLayout: "fixed" }}>
                <colgroup>
                    {leafColumns.map((column) => (
                        <col key={column.id} style={{ width: column.id === "title" ? undefined : column.getSize() }} />
                    ))}
                </colgroup>

                {groups.length === 0 ? (
                    <tbody>
                        <tr>
                            <td colSpan={leafColumns.length} className="h-24 text-center text-muted-foreground">
                                No tasks
                            </td>
                        </tr>
                    </tbody>
                ) : (
                    groups.map(({ status, items }) => (
                        <tbody key={status || "none"}>
                            <TaskGroupHeader
                                status={status}
                                label={labelOf(status)}
                                count={items.length}
                                collapsed={!!collapsed[status]}
                                colSpan={leafColumns.length}
                                onToggle={() => onToggleGroup(status)}
                            />
                            {!collapsed[status] &&
                                items.map((row) => (
                                    <DraggableRow
                                        key={row.id}
                                        row={row}
                                        allTasks={filteredTasks}
                                        onDrop={handleDropTaskOntoTask}
                                        onMakeIndependent={handleMakeIndependent}
                                        onRowClick={openTaskTab}
                                        onContextMenu={handleContextMenu}
                                        showError={showDropError}
                                    />
                                ))}
                        </tbody>
                    ))
                )}
            </table>
        </div>
    );
}
