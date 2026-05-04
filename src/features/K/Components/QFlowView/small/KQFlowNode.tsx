import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { ChevronRight, PenLine, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { KScoreBar } from "../../small/KScoreBar";
import { useKQFlowStore } from "@/features/K/store/useKQFlow.store";
import { useKQFlowHelper } from "@/features/K/hooks/qFlow/useKQFlow.helper";
import { useKStore } from "@/features/K/store/useK.store";
import { useGlobalShortcut } from "@/shared";
import type { KQFlowNodeData } from "@/features/K/types/kQFlow.type";

const HANDLES = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const HANDLE_ID: Record<Position, string> = {
    [Position.Top]: "top", [Position.Right]: "right",
    [Position.Bottom]: "bottom", [Position.Left]: "left",
};

// Ghost div and textarea share these classes — must be identical to prevent jitter on mode switch
const Q_TEXT = "w-full text-xs font-semibold text-zinc-100 leading-relaxed";
const A_TEXT = "w-full text-[11px] text-zinc-400 leading-relaxed";

export function KQFlowNode({ id, data, selected }: NodeProps<Node<KQFlowNodeData>>) {
    const { editingNodeId, connectingSourceId, flowNodes, flowEdges, knowledgeId: currentNodeId } = useKQFlowStore();

    // Collect all selected non-deleted question IDs; always includes nodeId
    const getMovableIds = (nodeId: number): number[] => {
        const ids = flowNodes
            .filter((n) => n.selected && !n.id.startsWith("temp-node-") && !(n.data as KQFlowNodeData).question.deletedAt)
            .map((n) => parseInt(n.id, 10));
        if (!ids.includes(nodeId)) ids.push(nodeId);
        return ids;
    };
    const { handleRenameStart, handleRenameConfirm, handleRenameCancel, handleDeleteQuestion, handleRestoreQuestion, handleToggleDraft, handleMoveQuestion } = useKQFlowHelper();
    const { currentK, kFlowClipboard } = useKStore();
    
    const { question } = data as KQFlowNodeData;
    const isCut = !!kFlowClipboard?.questionIds.includes(question.id);
    const isConnectingTarget = !!connectingSourceId && connectingSourceId !== id;
    const isTempNode = id.startsWith("temp-node-");
    const isEditing = editingNodeId === id;
    const isDeleted = !!question.deletedAt;
    const anyEdgeSelected = flowEdges.some((e) => e.selected);
    const multiSelected = flowNodes.filter((n) => n.selected).length > 1;
    
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
    
    const showHandles = !isTempNode && !anyEdgeSelected && !isEditing && isHovered && !multiSelected;

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

    const isDraft = !isDeleted && !!question.isDraft;

    return (
        <div
            ref={cardRef}
            className={`group text-left relative flex flex-col rounded-lg border ${isEditing ? "nodrag" : ""} ${
                isDeleted
                    ? "border-zinc-800/40 bg-zinc-900/20 opacity-50"
                    : isCut
                    ? "border-blue-500 bg-zinc-900/80 ring-1 ring-blue-500/60 shadow-lg shadow-blue-500/10 opacity-60"
                    : isDraft && selected
                    ? "border-blue-500/50 bg-amber-950/20 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                    : isDraft
                    ? "border-amber-700/50 bg-amber-950/20"
                    : selected
                    ? "border-blue-500/50 bg-zinc-900/80 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/10"
                    : "border-zinc-700/60 bg-zinc-900/80"
            } ${isFlashing ? "ring-2 ring-amber-400/20 scale-[1.02] brightness-125 transition-all duration-150" : ""}`}
            style={{ width: 280 }}
            onDoubleClick={(e) => {
                if (!isDeleted && editingNodeId === null) {
                    e.stopPropagation();
                    setDraftQ(question.question);
                    setDraftA(question.answer ?? "");
                    handleRenameStart(id);
                }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu({ x: e.clientX, y: e.clientY });
            }}
        >
            {/* Unsaved changes prompt overlay */}
            {isEditing && showUnsavedPrompt && (
                <div
                    className="absolute inset-0 rounded-lg bg-zinc-950/96 flex flex-col items-center justify-center gap-3 z-30 nodrag nopan"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <p className="text-xs text-zinc-400 font-medium">Save changes?</p>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                        >
                            Discard
                        </button>
                    </div>
                </div>
            )}

            {HANDLES.map((pos) => (
                <Handle key={pos} type="source" position={pos} id={HANDLE_ID[pos]}
                    className="!rounded-full !border-[1.5px] !border-primary !bg-primary/80 z-10 !w-2 !h-2 hover:!w-3 hover:!h-3 !transition-all !duration-150"
                    style={{ opacity: showHandles ? 1 : 0, pointerEvents: showHandles ? "auto" : "none", transition: "opacity 0.15s" }}
                />
            ))}

            {/* Save/Cancel toolbar — hidden when unsaved prompt is showing */}
            {isEditing && !showUnsavedPrompt && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 z-10 nodrag nopan">
                    <button
                        onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800/90 border border-zinc-700"
                    >
                        Esc
                    </button>
                    <button
                        onMouseDown={(e) => { e.preventDefault(); if (draftQ.trim()) handleSave(); }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-30 px-1.5 py-0.5 rounded bg-zinc-800/90 border border-indigo-800/60"
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
            <div className="px-3 pt-3 pb-1 relative">
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
                        className={`nodrag nopan absolute inset-0 px-3 pt-3 pb-1 ${Q_TEXT} bg-transparent outline-none resize-none overflow-hidden cursor-text placeholder:text-zinc-600`}
                    />
                ) : (
                    <div className={`absolute inset-0 px-3 pt-3 pb-1 ${Q_TEXT} whitespace-pre-wrap break-words select-none`}>
                        {question.question || <span className="text-zinc-600">—</span>}
                    </div>
                )}
            </div>

            <div className="border-t border-zinc-800/60" />

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
                        className={`nodrag nopan absolute inset-0 px-3 pt-1.5 pb-2 ${A_TEXT} bg-transparent outline-none resize-none overflow-hidden cursor-text placeholder:text-zinc-600`}
                    />
                ) : (
                    <div className={`absolute inset-0 px-3 pt-1.5 pb-2 ${A_TEXT} whitespace-pre-wrap break-words select-none`}>
                        {question.answer || <span className="text-zinc-700 italic">no answer</span>}
                    </div>
                )}
            </div>

            <div className="flex items-center px-3 pb-2 pt-0.5">
                <KScoreBar scores={question.scoreHistory} srsNextReviewAt={question.srsNextReviewAt} retention={question.retention} />
                {!isDeleted && !isEditing && (
                    <button
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleToggleDraft(question.id); }}
                        title={isDraft ? "Unmark draft" : "Mark as draft"}
                        className={`nodrag nopan ml-auto shrink-0 rounded p-0.5 transition-colors ${
                            isDraft
                                ? "text-amber-500 hover:text-amber-300"
                                : "text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100"
                        }`}
                    >
                        <PenLine className="w-3 h-3" />
                    </button>
                )}
            </div>

            {ctxMenu && createPortal(
                <div
                    ref={ctxMenuRef}
                    className="fixed z-[9999] min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 text-sm nodrag nopan"
                    style={{ top: ctxMenu.y, left: ctxMenu.x }}
                >
                    {isDeleted ? (
                        <button
                            onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleRestoreQuestion(question.id); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-green-400"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                    ) : (
                        <>
                            <button
                                onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); setDraftQ(question.question); setDraftA(question.answer ?? ""); handleRenameStart(id); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200"
                            >
                                <Pencil className="w-3.5 h-3.5 text-zinc-400" /> Edit
                            </button>
                            <button
                                onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleToggleDraft(question.id); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-amber-400"
                            >
                                <PenLine className="w-3.5 h-3.5" /> {isDraft ? "Unmark draft" : "Mark as draft"}
                            </button>
                            {/* Move to node/orphan */}
                            <div className="relative">
                                <button
                                    onMouseDown={(e) => { e.stopPropagation(); setShowMoveMenu((v) => !v); }}
                                    className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200"
                                >
                                    <span className="flex items-center gap-1.5">
                                        Move to…
                                        {getMovableIds(question.id).length > 1 && (
                                            <span className="text-[10px] text-zinc-500 bg-zinc-800 rounded px-1">{getMovableIds(question.id).length}</span>
                                        )}
                                    </span>
                                    <ChevronRight className="w-3 h-3 text-zinc-500" />
                                </button>
                                {showMoveMenu && (
                                    <div className="absolute left-full top-0 ml-0.5 w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 flex flex-col">
                                        {/* Search input */}
                                        <div className="px-2 pt-1 pb-1 shrink-0">
                                            <input
                                                ref={moveSearchRef}
                                                value={moveSearch}
                                                onChange={(e) => setMoveSearch(e.target.value)}
                                                onMouseDown={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") { setShowMoveMenu(false); } }}
                                                placeholder="Search…"
                                                className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
                                            />
                                        </div>
                                        <div className="overflow-y-auto max-h-[200px]">
                                            {/* Orphan — always first, hidden only when already orphan */}
                                            {currentNodeId !== 0 && "orphan".includes(moveSearch.toLowerCase()) && (
                                                <button
                                                    onMouseDown={(e) => { e.stopPropagation(); setCtxMenu(null); setShowMoveMenu(false); handleMoveQuestion(getMovableIds(question.id), null); }}
                                                    className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-400 italic text-xs"
                                                >
                                                    Orphan (no node)
                                                </button>
                                            )}
                                            {currentK?.flatData
                                                .filter((n) => !n.deletedAt && n.id !== currentNodeId && n.name.toLowerCase().includes(moveSearch.toLowerCase()))
                                                .map((n) => (
                                                    <button
                                                        key={n.id}
                                                        onMouseDown={(e) => { e.stopPropagation(); setCtxMenu(null); setShowMoveMenu(false); handleMoveQuestion(getMovableIds(question.id), n.id); }}
                                                        className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200 text-xs truncate"
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
                            <div className="my-1 border-t border-zinc-800" />
                            <button
                                onMouseDown={() => { setCtxMenu(null); setShowMoveMenu(false); handleDeleteQuestion(question.id); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-red-400"
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
