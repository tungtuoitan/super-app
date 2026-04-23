import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps, Node } from "@xyflow/react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { QuestionScoreBar } from "../../small/QuestionScoreBar";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import { useKTestFlowHelper } from "@/features/K/hooks/useKTestFlow.helper";
import type { QuestionFlowNodeData } from "@/features/K/types/kTestFlow.type";

const HANDLES = [Position.Top, Position.Right, Position.Bottom, Position.Left];
const HANDLE_ID: Record<Position, string> = {
    [Position.Top]: "top", [Position.Right]: "right",
    [Position.Bottom]: "bottom", [Position.Left]: "left",
};

export function QuestionFlowNode({ id, data, selected }: NodeProps<Node<QuestionFlowNodeData>>) {
    const { editingNodeId, connectingSourceId } = useKTestFlowStore();
    const { handleRenameStart, handleRenameConfirm, handleRenameCancel, handleDeleteQuestion, handleRestoreQuestion } = useKTestFlowHelper();

    const { question } = data as QuestionFlowNodeData;
    const isConnectingTarget = !!connectingSourceId && connectingSourceId !== id;
    const isTempNode = id.startsWith("temp-node-");
    const isEditing = editingNodeId === id;
    const isDeleted = !!question.deletedAt;

    const [draftQ, setDraftQ] = useState(question.question);
    const [draftA, setDraftA] = useState(question.answer ?? "");
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
    const qRef = useRef<HTMLTextAreaElement>(null);
    const aRef = useRef<HTMLTextAreaElement>(null);
    const ctxMenuRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        for (const el of [qRef.current, aRef.current]) {
            if (!el) continue;
            el.style.height = "0px";
            el.style.height = `${el.scrollHeight}px`;
        }
    });

    useEffect(() => {
        if (!isEditing) {
            setDraftQ(question.question);
            setDraftA(question.answer ?? "");
        }
    }, [question.question, question.answer, isEditing]);

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

    useEffect(() => {
        if (!ctxMenu) return;
        const handler = (e: MouseEvent) => {
            if (!ctxMenuRef.current?.contains(e.target as globalThis.Node)) setCtxMenu(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [ctxMenu]);

    const handleSave = () => handleRenameConfirm(id, draftQ, draftA);
    const handleCancel = () => {
        if (isTempNode) { handleRenameCancel(id); return; }
        setDraftQ(question.question);
        setDraftA(question.answer ?? "");
        handleRenameCancel(null);
    };
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
        if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSave(); }
    };

    const isDraft = !isDeleted && (!question.answer?.trim() || question.answer.trim().includes("DRAFT"));

    return (
        <div
            className={`group relative flex flex-col rounded-lg border ${isEditing ? "nodrag" : ""} ${
                isDeleted
                    ? "border-zinc-800/40 bg-zinc-900/20 opacity-50"
                    : selected
                    ? "border-zinc-600/70 bg-zinc-900/80 shadow-[0_0_0_2px_rgba(59,130,246,0.2)]"
                    : "border-zinc-700/60 bg-zinc-900/80"
            }`}
            style={{ width: 280 }}
            onDoubleClick={(e) => {
                if (!isEditing && !isDeleted) {
                    e.stopPropagation();
                    setDraftQ(question.question);
                    setDraftA(question.answer ?? "");
                    handleRenameStart(id);
                }
            }}
            onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCtxMenu({ x: e.clientX, y: e.clientY });
            }}
        >
            {HANDLES.map((pos) => (
                <Handle key={pos} type="source" position={pos} id={HANDLE_ID[pos]}
                    className={`!w-2 !h-2 !bg-zinc-500 !border-zinc-400 !transition-opacity ${
                        selected || isConnectingTarget ? "!opacity-100" : "!opacity-0 group-hover:!opacity-100"
                    }`}
                />
            ))}

            {/* Save/Cancel — absolute so they don't shift layout */}
            {isEditing && (
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

            <div className="px-3 pt-3 pb-1">
                <textarea
                    ref={qRef}
                    value={isEditing ? draftQ : question.question}
                    onChange={isEditing ? (e) => setDraftQ(e.target.value) : undefined}
                    onKeyDown={isEditing ? handleKeyDown : undefined}
                    readOnly={!isEditing}
                    placeholder={isEditing ? "Question…" : ""}
                    rows={1}
                    className={`nodrag w-full text-xs font-semibold text-zinc-100 leading-relaxed bg-transparent outline-none resize-none overflow-hidden ${
                        isEditing ? "nopan cursor-text placeholder:text-zinc-600" : "cursor-default pointer-events-none"
                    }`}
                />
            </div>

            <div className="border-t border-zinc-800/60" />

            <div className="px-3 pt-1.5 pb-2">
                <textarea
                    ref={aRef}
                    value={isEditing ? draftA : (question.answer ?? "")}
                    onChange={isEditing ? (e) => setDraftA(e.target.value) : undefined}
                    onKeyDown={isEditing ? handleKeyDown : undefined}
                    readOnly={!isEditing}
                    placeholder={isEditing ? "Answer… (Ctrl+Enter to save)" : ""}
                    rows={1}
                    className={`nodrag w-full text-[11px] text-zinc-400 leading-relaxed bg-transparent outline-none resize-none overflow-hidden ${
                        isEditing ? "nopan cursor-text placeholder:text-zinc-600" : "cursor-default pointer-events-none"
                    }`}
                />
            </div>

            <div className="flex items-center px-3 pb-2 pt-0.5">
                <QuestionScoreBar scores={question.scoreHistory} srsNextReviewAt={question.srsNextReviewAt} retention={question.retention} />
                {isDraft && <span className="text-[9px] text-amber-500/70 font-mono ml-auto">draft</span>}
            </div>

            {/* Context menu — portalled to body to escape React Flow's CSS transform */}
            {ctxMenu && createPortal(
                <div
                    ref={ctxMenuRef}
                    className="fixed z-[9999] min-w-[160px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl py-1 text-sm nodrag nopan"
                    style={{ top: ctxMenu.y, left: ctxMenu.x }}
                >
                    {isDeleted ? (
                        <button
                            onMouseDown={() => { setCtxMenu(null); handleRestoreQuestion(question.id); }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-green-400"
                        >
                            <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                    ) : (
                        <>
                            <button
                                onMouseDown={() => { setCtxMenu(null); setDraftQ(question.question); setDraftA(question.answer ?? ""); handleRenameStart(id); }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-left hover:bg-zinc-800 transition-colors text-zinc-200"
                            >
                                <Pencil className="w-3.5 h-3.5 text-zinc-400" /> Edit
                            </button>
                            <div className="my-1 border-t border-zinc-800" />
                            <button
                                onMouseDown={() => { setCtxMenu(null); handleDeleteQuestion(question.id); }}
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
