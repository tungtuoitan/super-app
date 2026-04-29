import React, { useEffect } from "react";
import { flexRender } from "@tanstack/react-table";
import { Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/shared";
import { Alert, AlertDescription } from "@/shared";
import { useNoteGridStore } from "../store/useNoteGrid.store";
import { useNoteGridHelper } from "../hooks/useNoteGrid.helper";
import { useNoteGridTableHelper } from "../hooks/useNoteGrid.table.helper";
import { Note } from "../types/note.types";
import { useEditorTabHelper } from "@/shell";
import { useGridControlStore } from "@/shared";
import { constants } from "@/utils/constants";
import { BaseTab } from "@/shell";
import {useAuthStore} from "@/shell";
import {useEditorTabBarStore} from "@/shell";

/**
 * NoteGrid - A flexible layout panel for displaying notes in a data table
 */
export function NoteGrid({ source = constants.modules.note, disabledRowIds }: { source?: string; disabledRowIds?: Set<number> } = {}) {
    const { notes, noteGridIsLoading, noteGridError, setContainerWidth, containerRef, noteGridPagination, totalCount } = useNoteGridStore();
    const { openTab } = useEditorTabHelper();
    const { loadNotes, openNoteContextMenu } = useNoteGridHelper();
    const { $user } = useAuthStore();
    const { table } = useNoteGridTableHelper(source, disabledRowIds);
    const { filterViewKey, searchQuery } = useGridControlStore();
    const { openTabs, activeTabId } = useEditorTabBarStore();

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        if (!$user.userId || !$user.filters || Object.keys($user.filters).length === 0 || !filterViewKey) {
            return;
        }
        loadNotes();
    }, [$user.userId, $user.userToken, $user.filters, filterViewKey, noteGridPagination.pageIndex, noteGridPagination.pageSize, searchQuery]);

    return (
        <div ref={containerRef} className="w-full h-full bg-background flex flex-col relative">
            {noteGridIsLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            )}

            {noteGridError && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
                    <Alert variant="destructive" className="max-w-md">
                        <AlertDescription>Failed to load notes</AlertDescription>
                    </Alert>
                </div>
            )}

            <div
                className="flex-1 overflow-auto rounded-md border"
                onContextMenu={(e) => {
                    const target = e.target as HTMLElement;
                    const isClickedOnRow = target.closest("tr[data-row]");
                    if (!isClickedOnRow && source === constants.modules.note) {
                        openNoteContextMenu(e);
                    }
                }}
            >
                <table className="w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b bg-[rgb(37,37,38)]">
                                {headerGroup.headers.map((header) => (
                                    <th key={header.id} className="h-[36px] px-1 text-left align-middle font-semibold text-muted-foreground" style={{ width: header.getSize() }}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row) => {
                            const activeTab = openTabs.length > 0 && activeTabId ? openTabs.find((t: BaseTab) => t.id === activeTabId) : null;
                            const activeNote = activeTab?.type === constants.vscode.tab.tabTypes.note ? (activeTab.data as Note) : null;
                            const isSelected = activeNote?.id === row.original.id && source === constants.modules.note;

                            const handleRowClick = () => {
                                if (source === constants.modules.note) {
                                    openTab(row.original, constants.vscode.tab.tabTypes.note);
                                } else if (source === constants.modules.workspace && !disabledRowIds?.has(row.original.id)) {
                                    row.toggleSelected();
                                }
                            };

                            return (
                                <tr
                                    key={row.id}
                                    data-row
                                    className={`border-b h-[36px] cursor-pointer hover:bg-muted/50 transition-colors ${row.original.deletedAt ? "opacity-60" : ""} ${
                                        isSelected ? "bg-white/10" : ""
                                    }`}
                                    onClick={handleRowClick}
                                    onContextMenu={(e) => {
                                        e.stopPropagation();
                                        openNoteContextMenu(e, row);
                                    }}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="text-left">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between px-4 py-1 bg-background">
                <div className="flex-1 text-sm text-left text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} ({totalCount} total)
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="h-8 w-8" title="First page">
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="h-8 w-8" title="Previous page">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 px-2">
                        <span className="text-sm font-medium">{table.getState().pagination.pageIndex + 1}</span>
                        <span className="text-sm text-muted-foreground">/ {table.getPageCount()}</span>
                    </div>

                    <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="h-8 w-8" title="Next page">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8"
                        title="Last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
