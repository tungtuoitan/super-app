import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, Check, X, LibraryBig } from "lucide-react";
import type { Knowledge } from "@/types/knowledgeTree.types";
import { useKtStore } from "@/store/kt/useKt.store";
import { useKtHelper } from "@/hooks/kt/useKt.helper";
import { useKnowledgeTreeTabHelper } from "@/hooks/knowledgeTree/useKnowledgeTreeTab.helper";
import { useEditorTabsStore } from "@/store/index";
import { constants } from "@/utils/constants";

// ─── TreeNode ─────────────────────────────────────────────────────────────────

function TreeNode({ knowledge, depth }: { knowledge: Knowledge; depth: number }) {
    const { knowledges } = useKtStore();
    const { deleteKnowledge } = useKtHelper();
    const { openKnowledgeTab } = useKnowledgeTreeTabHelper();
    const { openTabs, activeTabId } = useEditorTabsStore();

    const children = knowledges.filter((k) => k.parentId === knowledge.id);
    const hasChildren = children.length > 0;
    const [expanded, setExpanded] = useState(true);

    // highlight nếu tab của knowledge này đang active
    const isActive = (() => {
        const activeTab = openTabs.find((t) => t.id === activeTabId);
        return activeTab?.type === constants.vscode.tab.tabTypes.knowledgeTree
            && (activeTab.data as Knowledge).id === knowledge.id;
    })();

    const handleSelect = () => openKnowledgeTab(knowledge);

    return (
        <div>
            <div
                className={`flex items-center gap-1 py-1 px-2 cursor-pointer text-sm rounded-sm group
                    ${isActive ? "bg-editor-active text-editor-white" : "text-editor-fg hover:bg-editor-activitybar"}`}
                style={{ paddingLeft: `${8 + depth * 12}px` }}
                onClick={handleSelect}
            >
                {hasChildren ? (
                    <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                        className="text-editor-fg opacity-60 hover:opacity-100">
                        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                ) : (
                    <span className="w-3 h-3 block" />
                )}
                <LibraryBig className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="truncate flex-1">{knowledge.title}</span>
                <button
                    onClick={(e) => { e.stopPropagation(); deleteKnowledge(knowledge); }}
                    className="hidden group-hover:flex text-zinc-600 hover:text-red-400 p-0.5 rounded ml-1">
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
            {hasChildren && expanded && children.map((child) => (
                <TreeNode key={child.id} knowledge={child} depth={depth + 1} />
            ))}
        </div>
    );
}

// ─── AddKnowledgeForm ─────────────────────────────────────────────────────────

function AddKnowledgeForm({ onDone }: { onDone: () => void }) {
    const [title, setTitle] = useState("");
    const { upsertKnowledge } = useKtHelper();

    const handleSave = async () => {
        if (!title.trim()) return;
        await upsertKnowledge({ id: 0, title: title.trim(), parentId: null });
        onDone();
    };

    return (
        <div className="flex items-center gap-1 px-2 py-1">
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Title…"
                className="flex-1 bg-transparent text-xs text-zinc-200 outline-none border-b border-zinc-700"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onDone(); }}
            />
            <button onClick={handleSave} className="text-zinc-500 hover:text-green-400"><Check className="w-3 h-3" /></button>
            <button onClick={onDone} className="text-zinc-600 hover:text-zinc-300"><X className="w-3 h-3" /></button>
        </div>
    );
}

// ─── KnowledgeTreeView ────────────────────────────────────────────────────────

export function KnowledgeTreeView() {
    const { knowledges, isLoading } = useKtStore();
    const { loadKnowledges } = useKtHelper();
    const [adding, setAdding] = useState(false);

    useEffect(() => { loadKnowledges(); }, []);

    const roots = knowledges.filter((k) => k.parentId === null);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
                <span className="text-xs font-semibold text-editor-fg uppercase tracking-wide">Knowledge</span>
                <button onClick={() => setAdding(true)}
                    className="text-zinc-600 hover:text-zinc-300 p-0.5 rounded">
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
                {adding && <AddKnowledgeForm onDone={() => setAdding(false)} />}
                {isLoading && <div className="text-xs text-zinc-600 px-3 py-2">Loading…</div>}
                {!isLoading && roots.map((root) => (
                    <TreeNode key={root.id} knowledge={root} depth={0} />
                ))}
                {!isLoading && roots.length === 0 && !adding && (
                    <div className="text-xs text-zinc-600 px-3 py-4 text-center">No knowledge yet</div>
                )}
            </div>
        </div>
    );
}
