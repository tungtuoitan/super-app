import { createPortal } from "react-dom";
import { ChevronRight, Grid2X2, PenLine, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import { useKQFlowHelper } from "@/features/K/hooks/qFlow/useKQFlow.helper";
import { useKQFlowCanvasHelper } from "@/features/K/hooks/qFlow/useKQFlowCanvas.helper";
import { useKStore } from "@/features/K/store/useK.store";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";

interface KQFlowNodeContextMenuProps {
    ctxMenu: { x: number; y: number };
    ctxMenuRef: React.RefObject<HTMLDivElement>;
    question: KQFlowNodeData["question"];
    isDeleted: boolean;
    isDraft: boolean;
    showMoveMenu: boolean;
    moveSearch: string;
    moveSearchRef: React.RefObject<HTMLInputElement>;
    setCtxMenu: (value: null) => void;
    setShowMoveMenu: (value: boolean | ((v: boolean) => boolean)) => void;
    setMoveSearch: (value: string) => void;
    onEdit: () => void;
}

export function KQFlowNodeContextMenu({
    ctxMenu, ctxMenuRef, question, isDeleted, isDraft, showMoveMenu, moveSearch, moveSearchRef,
    setCtxMenu, setShowMoveMenu, setMoveSearch, onEdit,
}: KQFlowNodeContextMenuProps) {
    const { nodeId, flowNodes } = useKQFlowStore();
    const { handleDeleteQuestion, handleRestoreQuestion, handleToggleDraft, handleMoveQuestion } = useKQFlowHelper();
    const { handleOrganize } = useKQFlowCanvasHelper();
    const { currentK } = useKStore();

    // Collect all selected non-deleted question IDs; always includes questionId
    const getMovableIds = (questionId: number): number[] => {
        const ids = flowNodes
            .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
            .map((n) => parseInt(n.id, 10));
        if (!ids.includes(questionId)) ids.push(questionId);
        return ids;
    };
    const selectedStringIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
        .map((n) => n.id);

    return createPortal(
        <div
            ref={ctxMenuRef}
            className="fixed z-[9999] min-w-[160px] bg-popover text-popover-foreground border border-sa-border-strong rounded-lg sa-shadow-pop p-1 text-[13px] nodrag nopan"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
        >
            {isDeleted ? (
                <button
                    onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleRestoreQuestion(question.id); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-sa-good"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                </button>
            ) : (
                <>
                    <button
                        onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); onEdit(); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-foreground"
                    >
                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit
                    </button>
                    <button
                        onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleToggleDraft(question.id); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-sa-amber-ink"
                    >
                        <PenLine className="w-3.5 h-3.5" /> {isDraft ? "Unmark draft" : "Mark as draft"}
                    </button>
                    {/* Move to node/orphan */}
                    <div className="relative">
                        <button
                            onMouseDown={(e) => { e.stopPropagation(); setShowMoveMenu((v) => !v); }}
                            className="flex items-center justify-between w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-foreground"
                        >
                            <span className="flex items-center gap-1.5">
                                Move to…
                                {getMovableIds(question.id).length > 1 && (
                                    <span className="text-[10px] font-mono text-muted-foreground border border-sa-border-strong rounded-md px-1">{getMovableIds(question.id).length}</span>
                                )}
                            </span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </button>
                        {showMoveMenu && (
                            <div className="absolute left-full top-0 ml-1 w-[200px] bg-popover border border-sa-border-strong rounded-lg sa-shadow-pop p-1 flex flex-col">
                                {/* Search input */}
                                <div className="px-2 pt-1 pb-1 shrink-0">
                                    <input
                                        ref={moveSearchRef}
                                        value={moveSearch}
                                        onChange={(e) => setMoveSearch(e.target.value)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") { setShowMoveMenu(false); } }}
                                        placeholder="Search…"
                                        className="w-full px-2 h-7 text-xs bg-background border border-sa-border-strong rounded-md text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-sa-amber/60"
                                    />
                                </div>
                                <div className="overflow-y-auto max-h-[200px]">
                                    {/* Orphan — always first, hidden only when already orphan */}
                                    {nodeId !== 0 && "orphan".includes(moveSearch.toLowerCase()) && (
                                        <button
                                            onMouseDown={(e) => { e.stopPropagation(); setCtxMenu(null); setShowMoveMenu(false); handleMoveQuestion(getMovableIds(question.id), null); }}
                                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-muted-foreground italic text-xs"
                                        >
                                            Orphan (no node)
                                        </button>
                                    )}
                                    {currentK?.flatData
                                        .filter((n) => !n.deletedAt && n.id !== nodeId && n.name.toLowerCase().includes(moveSearch.toLowerCase()))
                                        .map((n) => (
                                            <button
                                                key={n.id}
                                                onMouseDown={(e) => { e.stopPropagation(); setCtxMenu(null); setShowMoveMenu(false); handleMoveQuestion(getMovableIds(question.id), n.id); }}
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-foreground text-xs truncate"
                                                title={n.name}
                                            >
                                                {n.name}
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="my-1 border-t border-sa-border" />
                    {selectedStringIds.length >= 2 && (
                        <button
                            onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleOrganize(selectedStringIds); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-hover-strong transition-colors duration-100 text-foreground"
                        >
                            <Grid2X2 className="w-3.5 h-3.5 text-muted-foreground" />
                            Organize ({selectedStringIds.length})
                        </button>
                    )}
                    <button
                        onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleDeleteQuestion(question.id); }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left rounded-md hover:bg-sa-danger/10 transition-colors duration-100 text-sa-danger"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                </>
            )}
        </div>,
        document.body
    );
}
