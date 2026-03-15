/**
 * KShortcutTab — Tab trong VSPanel để tạo shortcut node (OneDrive-style)
 *
 * Layout giống KMovingTab:
 *   Left  (220px) : Knowledge selector + selected indicator + OK/Reset
 *   Right (flex-1): KShortcutTree — browse & click node để chọn target
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, CornerDownRight, ArrowDown, Library, BookOpen, ChevronRight } from "lucide-react";
import { GenericAutoComplete, type IAutoCompleteOptions } from "@/shared/components";
import { useKShortcutDialogStore } from "../../../store/KShortcutDialog.store";
import { useKShortcutDialogHelper } from "../../../hooks/useKShortcutDialog.helper";
import { useKStore } from "../../../store/K.store";
import { KShortcutTree } from "./KShortcutTree";
import type { KItemV2 } from "../../../types/K-v2.types";

export function KShortcutTab() {
    const {
        targetKnowledgeId, setTargetKnowledgeId,
        isLoadingTree,
        targetTree,
        selectedNodes, setSelectedNodes,
        parentNode,
        isSubmitting,
    } = useKShortcutDialogStore();

    const { allK, currentK } = useKStore();
    const { loadTargetTree, submitShortcut } = useKShortcutDialogHelper();

    // ── Đo height right panel → truyền vào KShortcutTree ────────────────────
    const rightPanelRef = useRef<HTMLDivElement>(null);
    const [treeHeight, setTreeHeight] = useState(400);

    useEffect(() => {
        const el = rightPanelRef.current;
        if (!el) return;
        const update = () => { const h = el.clientHeight; if (h > 0) setTreeHeight(h); };
        const ro = new ResizeObserver(update);
        ro.observe(el);
        setTimeout(update, 80);
        return () => ro.disconnect();
    }, []);

    // ── Load tree khi chọn knowledge mới + reset selection ───────────────────
    useEffect(() => {
        setSelectedNodes([]); // reset khi đổi knowledge
        if (targetKnowledgeId) loadTargetTree(targetKnowledgeId);
    }, [targetKnowledgeId]);

    // ── Knowledge dropdown — bao gồm cả knowledge hiện tại (mặc định) ────────
    const knowledgeOptions: IAutoCompleteOptions[] = useMemo(
        () => allK
            .filter((k) => !k.deletedAt)
            .map((k) => ({
                id:     k.id.toString(),
                label:  k.name,
                desc:   k.id === currentK?.id ? "Current knowledge" : (k.description || ""),
                active: true,
            })),
        [allK, currentK?.id],
    );

    const selectedKOption = knowledgeOptions.find((o) => o.id === targetKnowledgeId?.toString()) ?? null;

    // Badge: đang trỏ vào chính knowledge này
    const isSameKnowledge = targetKnowledgeId === currentK?.id;

    // ── Full breadcrumb của parentNode (folder nhận shortcut) ────────────────
    // pathIds = "/5/12/25/" → IDs [5, 12, 25] → map sang tên → prefix với KB name
    const parentBreadcrumb: string[] = useMemo(() => {
        if (!currentK) return [];

        const parentId = parentNode && (parentNode as any).id > 0 ? (parentNode as any).id : null;

        // Root level (không có parent hoặc là workspace root)
        if (!parentId) return [currentK.name];

        const flatMap = new Map<number, KItemV2>(
            currentK.flatData.map((n: KItemV2) => [n.id, n])
        );

        // Lấy pathIds của parentNode (bao gồm chính nó)
        const pNode = flatMap.get(parentId);
        const pathStr = pNode?.pathIds ?? "";

        const ids = pathStr
            .split("/")
            .filter(Boolean)
            .map(Number)
            .filter((id) => !isNaN(id));

        const crumbs: string[] = [currentK.name];
        for (const id of ids) {
            const n = flatMap.get(id);
            if (n) crumbs.push(n.name);
        }

        return crumbs;
    }, [parentNode, currentK]);

    const isNestedParent = parentBreadcrumb.length > 1;

    return (
        <div className="h-full flex overflow-hidden">

            {/* ── Left panel ───────────────────────────────────────────────── */}
            <div className="w-[380px] shrink-0 flex flex-col border-r border-editor-border">

                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">

                    {/* ── FROM block ───────────────────────────────────────── */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-editor-fg/40">From</span>
                            {
                                isSameKnowledge && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400/50">(Same Knowledge)</span>
                                )
                            }
                        </div>

                        {/* Knowledge source picker */}
                        <GenericAutoComplete
                            allOptions={knowledgeOptions}
                            value={selectedKOption}
                            onChange={(_e, val) =>
                                setTargetKnowledgeId(val ? parseInt(val.id.toString()) : null)
                            }
                            inputProps={{ name: "shortcutTargetK", label: "", required: false }}
                            disabled={knowledgeOptions.length === 0}
                            size="small"
                        />

                        {/* Same-knowledge badge */}
                        {/* {isSameKnowledge && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                <span className="text-[11px] text-amber-400/90">
                                    Shortcut in the same knowledge
                                </span>
                            </div>
                        )} */}

                        {/* Selected nodes list */}
                        {/* {selectedNodes.length > 0 ? (
                            <div className="flex flex-col gap-1">
                                {selectedNodes.map((n) => (
                                    <div
                                        key={n.id}
                                        className="flex items-center gap-2 px-2.5 py-1.5 bg-editor-hover/60 rounded text-xs text-editor-fg"
                                    >
                                        <Library className="w-3 h-3 shrink-0 text-indigo-400" />
                                        <span className="flex-1 truncate">{n.name}</span>
                                        <button
                                            onClick={() => setSelectedNodes((prev) => prev.filter((x) => x.id !== n.id))}
                                            className="shrink-0 text-editor-fg/30 hover:text-editor-fg/70 transition-colors"
                                            title="Remove"
                                        >✕</button>
                                    </div>
                                ))}
                            </div> */}
                        {/* ) : (
                            <p className="text-xs text-editor-fg/30 italic">
                                {targetTree ? "No nodes selected — click nodes on the right" : "Select a source knowledge first"}
                            </p>
                        )} */}
                    </div>

                    {/* ── Arrow separator ──────────────────────────────────── */}
                    <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 border-t border-dashed border-editor-border" />
                        <ArrowDown className="w-3.5 h-3.5 text-editor-fg/25 shrink-0" />
                        <div className="flex-1 border-t border-dashed border-editor-border" />
                    </div>

                    {/* ── TO block ─────────────────────────────────────────── */}
                    <div className="flex flex-col gap-2">
                        <span className="text-left text-[10px] font-bold uppercase tracking-widest text-editor-fg/40">To</span>

                        {/* Breadcrumb block — highlight khi có nested parent */}
                        <div className={`
                            flex flex-col gap-2 px-2.5 py-2.5 rounded border text-xs transition-colors
                            ${isNestedParent
                                ? "bg-indigo-500/8 border-indigo-500/30"
                                : "bg-editor-hover/40 border-editor-border"
                            }
                        `}>
                            {/* Knowledge name */}
                            <div className="flex items-center gap-2 text-editor-fg">
                                <BookOpen className="w-3.5 h-3.5 shrink-0 text-editor-fg/50" />
                                <span className="font-medium truncate">{currentK?.name ?? ""}</span>
                            </div>

                            {/* Full breadcrumb path */}
                            <div className="flex items-center gap-1 flex-wrap pl-0.5">
                                <CornerDownRight className="w-3 h-3 shrink-0 text-editor-fg/30" />
                                {parentBreadcrumb.map((crumb, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && (
                                            <ChevronRight className="w-2.5 h-2.5 shrink-0 text-editor-fg/25" />
                                        )}
                                        <span className={
                                            i === parentBreadcrumb.length - 1
                                                ? "font-semibold text-indigo-400 truncate max-w-[120px]"
                                                : "text-editor-fg/45 truncate max-w-[80px]"
                                        }>
                                            {crumb}
                                        </span>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Action buttons */}
                <div className="px-4 py-3 border-t border-editor-border flex gap-2">
                    {/* Reset — chỉ xóa selection, không đóng tab */}
                    <button
                        onClick={() => setSelectedNodes([])}
                        disabled={isSubmitting || selectedNodes.length === 0}
                        className="flex-1 px-3 py-1.5 text-xs rounded border border-border text-editor-fg hover:bg-editor-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Reset
                    </button>
                    <button
                        onClick={submitShortcut}
                        disabled={selectedNodes.length === 0 || isSubmitting}
                        className="flex-1 px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                    >
                        {isSubmitting
                            ? <><Loader2 className="w-3 h-3 animate-spin" />Creating…</>
                            : selectedNodes.length > 1
                                ? `Create ${selectedNodes.length} shortcuts`
                                : "Create shortcut"}
                    </button>
                </div>
            </div>

            {/* ── Right panel — KShortcutTree ──────────────────────────────── */}
            <div ref={rightPanelRef} className="flex-1 flex flex-col overflow-hidden relative">
                {isLoadingTree ? (
                    <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>

                ) : targetKnowledgeId && targetTree ? (
                    <KShortcutTree height={treeHeight} />

                ) : targetKnowledgeId ? (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        This knowledge is empty
                    </div>

                ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                        <CornerDownRight className="w-10 h-10 opacity-15 text-indigo-400" />
                        <div className="text-center">
                            <p className="text-sm font-medium">Select a source knowledge</p>
                            <p className="text-xs mt-1 opacity-60">Then click a node to link</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
