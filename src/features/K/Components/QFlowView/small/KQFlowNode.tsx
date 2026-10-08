import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { ChevronRight, Grid2X2, PenLine, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { KScoreBar } from "../../small/KScoreBar";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import { useKQFlowHelper } from "@/features/K/hooks/qFlow/useKQFlow.helper";
import { useKQFlowCanvasHelper } from "@/features/K/hooks/qFlow/useKQFlowCanvas.helper";
import { useKStore } from "@/features/K/store/useK.store";
import { useGlobalShortcut, useDeviceStore, HighlightText } from "@/shared";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";

const HANDLES = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const HANDLE_ID: Record<Position, string> = {
    [Position.Top]: "top", [Position.Right]: "right",
    [Position.Bottom]: "bottom", [Position.Left]: "left",
};

// Ghost div and textarea share these classes — must be identical to prevent jitter on mode switch
const Q_TEXT = "w-full text-xs font-medium text-foreground leading-relaxed";
const A_TEXT = "w-full text-[11px] text-muted-foreground leading-relaxed";

export function KQFlowNode({ id, data, selected }: NodeProps<Node<KQFlowNodeData>>) {
    const { editingNodeId, connectingSourceId, flowNodes, flowEdges, nodeId, searchMatchIds, searchActiveIndex, searchQuery } = useKQFlowStore();

    // Collect all selected non-deleted question IDs; always includes questionId
    const getMovableIds = (questionId: number): number[] => {
        const ids = flowNodes
            .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
            .map((n) => parseInt(n.id, 10));
        if (!ids.includes(questionId)) ids.push(questionId);
        return ids;
    };
    const { isMobile } = useDeviceStore();
    const { handleRenameStart, handleRenameConfirm, handleRenameCancel, handleDeleteQuestion, handleRestoreQuestion, handleToggleDraft, handleMoveQuestion } = useKQFlowHelper();
    const { handleOrganize } = useKQFlowCanvasHelper();
    const { currentK, kFlowClipboard } = useKStore();
    
    const { question } = data as KQFlowNodeData;
    const isCut = !!kFlowClipboard?.questionIds.includes(question.id);
    const isConnectingTarget = !!connectingSourceId && connectingSourceId !== id;
    const isTempNode = id.startsWith("temp-node-");
    const isEditing = editingNodeId === id;
    const isDeleted = !!question.deletedAt;
    const anyEdgeSelected = flowEdges.some((e) => e.selected);
    const multiSelected = flowNodes.filter((n) => n.selected).length > 1;
    const selectedStringIds = flowNodes
        .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
        .map((n) => n.id);
    
    const [draftQ, setDraftQ] = useState(question.question);
    const [draftA, setDraftA] = useState(question.answer ?? "");
    const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
    const [isFlashing, setIsFlashing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    
    const cardRef = useRef<HTMLDivElement>(null);
    const qRef = useRef<HTMLTextAreaElement>(null);
    const aRef = useRef<HTMLTextAreaElement>(null);
    const ctxMenuRef = useRef<HTMLDivElement>(null);
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [moveSearch, setMoveSearch] = useState("");
    const moveSearchRef = useRef<HTMLInputElement>(null);
    
    // Stable refs for callbacks
    const draftQRef = useRef(draftQ);
    const draftARef = useRef(draftA);
    const idRef = useRef(id);
    draftQRef.current = draftQ;
    draftARef.current = draftA;
    idRef.current = id;
    
    const showHandles = !isMobile && !isTempNode && !anyEdgeSelected && !isEditing && isHovered && !multiSelected;

    // Sync drafts when question changes (but not while editing)
    useEffect(() => {
        if (!isEditing) {
            setDraftQ(question.question);
            setDraftA(question.answer ?? "");
            setShowUnsavedPrompt(false);
        }
    }, [question.question, question.answer, isEditing]);

    // Auto-focus question field on edit start
    useEffect(() => {
        if (!isEditing) return;
        let tries = 0;
        const attempt = () => {
            const el = qRef.current;
            if (el) { el.focus(); el.select(); }
            else if (++tries < 20) setTimeout(attempt, 30);
        };
        setTimeout(attempt, 50);
    }, [isEditing]);

    // Click-outside while editing: show unsaved prompt if dirty, else cancel
    useEffect(() => {
        if (!isEditing) return;
        const handler = (e: MouseEvent) => {
            if (cardRef.current?.contains(e.target as globalThis.Node)) return;
            if (showUnsavedPrompt) {
                // Already showing prompt — flash it
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 500);
                return;
            }
            const isDirty = draftQRef.current !== question.question || draftARef.current !== (question.answer ?? "");
            if (isDirty) {
                setShowUnsavedPrompt(true);
                setIsFlashing(true);
                setTimeout(() => setIsFlashing(false), 500);
            } else {
                handleRenameCancel(isTempNode ? id : null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isEditing, showUnsavedPrompt, id, isTempNode, question.question, question.answer]);

    // Context menu outside-click
    useEffect(() => {
        if (!ctxMenu) return;
        const handler = (e: MouseEvent) => {
            if (!ctxMenuRef.current?.contains(e.target as globalThis.Node)) {
                setCtxMenu(null);
                setShowMoveMenu(false);
                setMoveSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ctxMenu]);

    // Auto-focus search input when move submenu opens
    useEffect(() => {
        if (!showMoveMenu) { setMoveSearch(""); return; }
        setTimeout(() => moveSearchRef.current?.focus(), 30);
    }, [showMoveMenu]);

    const handleSave = () => handleRenameConfirm(idRef.current, draftQRef.current, draftARef.current);
    const handleCancel = () => {
        setShowUnsavedPrompt(false);
        if (isTempNode) { handleRenameCancel(id); return; }
        setDraftQ(question.question);
        setDraftA(question.answer ?? "");
        handleRenameCancel(null);
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
        if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSave(); }
    };

    // Ctrl+S — save while editing (priority 100 matches KNodeCard)
    useGlobalShortcut("ctrl+s", { id: "kflow-node-save", priority: 100, enabled: isEditing }, () => {
        handleRenameConfirm(idRef.current, draftQRef.current, draftARef.current);
    });

    const isDraft = !isDeleted && question.statusCode === "draft";
    const isSearchMatch = searchMatchIds.includes(id);
    const isActiveMatch = isSearchMatch && searchMatchIds[searchActiveIndex] === id;

    return (
        <div
            ref={cardRef}
            className={`group text-left relative flex flex-col rounded-xl border transition-colors duration-100 ${isEditing ? "nodrag" : ""} ${
                isDeleted
                    ? "border-sa-border bg-sa-surface/40 opacity-50"
                    : isCut
                    ? "border-dashed border-sa-amber bg-sa-surface ring-1 ring-sa-amber/40 opacity-60"
                    : isDraft && selected
                    ? "border-dashed border-sa-amber bg-sa-surface ring-1 ring-sa-amber/40"
                    : isDraft
                    ? "border-dashed border-sa-border-strong bg-sa-surface/70"
                    : selected
                    ? "border-sa-amber bg-sa-surface ring-1 ring-sa-amber/40"
                    : "border-sa-border-strong bg-sa-surface hover:border-muted-foreground/40"
            } ${isFlashing ? "ring-2 ring-sa-amber/40 scale-[1.02] transition-all duration-150" : ""
            } ${isActiveMatch ? "ring-2 ring-sa-amber" : isSearchMatch ? "ring-2 ring-sa-amber/40" : ""}`}
            style={{ width: 280 }}
            onDoubleClick={isMobile ? undefined : (e) => {
                if (!isDeleted && editingNodeId === null) {
                    e.stopPropagation();
                    setDraftQ(question.question);
                    setDraftA(question.answer ?? "");
                    handleRenameStart(id);
                }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={isMobile ? undefined : (e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu({ x: e.clientX, y: e.clientY });
            }}
        >
            {/* Unsaved changes prompt overlay */}
            {isEditing && showUnsavedPrompt && (
                <div
                    className="absolute inset-0 rounded-xl bg-popover/95 flex flex-col items-center justify-center gap-3 z-30 nodrag nopan"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <p className="text-[13px] text-foreground font-medium">Save changes?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="text-xs h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors duration-100"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-xs h-7 px-3 border border-sa-border-strong text-muted-foreground hover:bg-sa-hover hover:text-foreground rounded-md transition-colors duration-100"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {HANDLES.map((pos) => (
                <Handle key={pos} type="source" position={pos} id={HANDLE_ID[pos]}
                    className="!rounded-full !border-[1.5px] !border-sa-amber !bg-sa-amber/80 z-10 !w-2 !h-2 hover:!w-3 hover:!h-3 !transition-all !duration-150 before:content-[''] before:absolute before:inset-[-8px] before:rounded-full"
                    style={{ opacity: showHandles ? 1 : 0, pointerEvents: showHandles ? "auto" : "none", transition: "opacity 0.15s" }}
                />
            ))}

            {/* Save/Cancel toolbar — hidden when unsaved prompt is showing */}
            {isEditing && !showUnsavedPrompt && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 z-10 nodrag nopan">
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
                        className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded-md bg-popover border border-sa-border-strong"
                    >
                        Esc
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); if (draftQ.trim()) handleSave(); }}
                        className="text-[10px] text-sa-on-amber hover:bg-sa-amber/90 disabled:opacity-30 px-1.5 py-0.5 rounded-md bg-sa-amber border border-sa-amber"
                    >
                        Save
                    </button>
                </div>
            )}

            {/*
             * Ghost div always lives in DOM → drives container height.
             * Textarea (edit) or display div (view) is absolute on top.
             * No DOM swap = no height recalc = no React Flow jitter.
             */}
            <div className={`pl-3 pt-3 pb-1 ${isEditing ? "pr-20" : "pr-3"} relative`}>
                <div aria-hidden className={`${Q_TEXT} whitespace-pre-wrap break-words invisible`}>
                    {(isEditing ? draftQ : question.question) || "\u00A0"}
                </div>
                {isEditing ? (
                    <textarea
                        ref={qRef}
                        value={draftQ}
                        onChange={(e) => setDraftQ(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Question…"
                        className={`nodrag nopan absolute inset-0 pl-3 pt-3 pb-1 pr-20 ${Q_TEXT} bg-transparent outline-none resize-none overflow-hidden cursor-text placeholder:text-muted-foreground/50`}
                    />
                ) : (
                    <div className={`absolute inset-0 px-3 pt-3 pb-1 ${Q_TEXT} whitespace-pre-wrap break-words select-none`}>
                        {question.question
                            ? <HighlightText text={question.question} highlight={searchQuery} />
                            : <span className="text-muted-foreground/50">—</span>}
                    </div>
                )}
            </div>

            <div className="border-t border-sa-border" />

            {/* Answer field — same ghost pattern */}
            <div className="px-3 pt-1.5 pb-2 relative">
                <div aria-hidden className={`${A_TEXT} whitespace-pre-wrap break-words invisible`}>
                    {(isEditing ? draftA : (question.answer ?? "")) || "\u00A0"}
                </div>
                {isEditing ? (
                    <textarea
                        ref={aRef}
                        value={draftA}
                        onChange={(e) => setDraftA(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Answer… (Ctrl+Enter to save)"
                        className={`nodrag nopan absolute inset-0 px-3 pt-1.5 pb-2 ${A_TEXT} bg-transparent outline-none resize-none overflow-hidden cursor-text placeholder:text-muted-foreground/50`}
                    />
                ) : (
                    <div className={`absolute inset-0 px-3 pt-1.5 pb-2 ${A_TEXT} whitespace-pre-wrap break-words select-none`}>
                        {question.answer
                            ? <HighlightText text={question.answer} highlight={searchQuery} />
                            : <span className="text-muted-foreground/50 italic">no answer</span>}
                    </div>
                )}
            </div>

            <div className="flex items-center px-3 pb-2 pt-0.5">
                <KScoreBar scores={question.scoreHistory} srsNextReviewAt={question.srsNextReviewAt} retention={question.retention} />
                {!isDeleted && !isEditing && !isMobile && (
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleDraft(question.id); }}
                        title={isDraft ? "Unmark draft" : "Mark as draft"}
                        className={`nodrag nopan ml-auto shrink-0 rounded -m-1.5 p-2 transition-colors ${
                            isDraft
                                ? "text-sa-amber hover:text-sa-amber/80"
                                : "text-muted-foreground/50 hover:text-foreground opacity-0 group-hover:opacity-100"
                        }`}
                    >
                        <PenLine className="w-3 h-3" />
                    </button>
                )}
            </div>

            {ctxMenu && createPortal(
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
                                onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); setDraftQ(question.question); setDraftA(question.answer ?? ""); handleRenameStart(id); }}
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
            )}
        </div>
    );
}
