import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, Trash2, Layers, Trash, LibraryBig, Bookmark } from "lucide-react";
import { useKStore } from "../../store/K.store";
import type { BaseTab } from "@/shell/types/tab.types";
import type { KItemV2 } from "../../types/K-v2.types";
import type { BreadcrumbEntry } from "../../hooks/kNodeEditor.miniHelper";
import { KNodeEditorProvider, useKNodeEditorStore } from "../../store/KNodeEditor.store";
import { useKNodeEditorLoader } from "../../hooks/useKNodeEditor.loader";
import { NodeCard } from "./NodeCard";
import { InlineNewNodeCard } from "./InlineNewNodeCard";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { kconstants } from "../../utils/K.Constants";
import { useGridControlStore } from "@/shared/store/useGridControl.store";
import { stripHtmlToText } from "./KNodeDescEditor";
import { containsNormalized } from "../../utils/searchUtils";
import {KtreeMiniHelper} from "../../hooks";

function KNodeEditorContent() {
    const { rootNode, breadcrumb, setBreadcrumb, setEditingNodeId, setParentPickerNodeId, inlineNewParentId, setInlineNewParentId, showDeleted, setShowDeleted, showAllChild, setShowAllChild, editingNodeId, unsavedPromptNodeId, setPromptFlashTick } = useKNodeEditorStore();
    const { currentK, allK, setSelectedItemIds, setLastSelectedItemId, setScrollToItem, markedNodeId, _treeRef, treeData } = useKStore();
    const { scopedNodes, allNodes } = useKNodeEditorLoader();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { warning } = useConsoleHelper();
    const { searchQuery } = useGridControlStore();

    const kName = allK.find(k => k.id === rootNode.knowledgeId)?.name ?? "";

    // Compute card-0 from breadcrumb last item (not from tab.data directly)
    const currentScopeNode = (() => {
        const last = breadcrumb[breadcrumb.length - 1];
        if (!last?.id || last.id < 0) return rootNode;
        return allNodes.find(n => n.id === last.id) ?? rootNode;
    })()

    // ── Warning: > 12 direct children ────────────────────────────────────────
    const directChildrenCount = (() => {
        const scopeId = currentScopeNode.id < 0 ? null : currentScopeNode.id;
        return allNodes.filter(n => n.parentId === scopeId && !n.deletedAt).length;
    })();

    const warnedScopeRef = useRef<number | null>(null);
    useEffect(() => {
        if (directChildrenCount > 12 && warnedScopeRef.current !== currentScopeNode.id) {
            warning(`[K] "${currentScopeNode.name}" has ${directChildrenCount} direct children (> 12). Consider grouping them into sub-nodes.`);
            warnedScopeRef.current = currentScopeNode.id;
        }
    }, [directChildrenCount, currentScopeNode.id, currentScopeNode.name]);

    // Init breadcrumb: walk up parentId chain from rootNode to the tree root
    const breadcrumbNodeIdRef = useRef<number | null>(null);
    useEffect(() => {
        if (rootNode.id > 0 && allNodes.length === 0) return; // wait for tree
        if (breadcrumbNodeIdRef.current === rootNode.id) return; // already built
        breadcrumbNodeIdRef.current = rootNode.id;

        const path: BreadcrumbEntry[] = [];
        if (rootNode.id > 0) {
            let curr: KItemV2 | undefined = allNodes.find(n => n.id === rootNode.id);
            while (curr) {
                path.unshift({ id: curr.id, name: curr.name, color: curr.color || null });
                if (curr.parentId == null) break;
                const parentId = curr.parentId;
                curr = allNodes.find(n => n.id === parentId);
            }
        }
        if (path.length === 0) {
            path.push({ id: rootNode.id < 0 ? null : rootNode.id, name: rootNode.name, color: rootNode.color || null });
        }

        setBreadcrumb(path);
        setEditingNodeId(null);
        setParentPickerNodeId(null);
        setShowDeleted(false);
        setShowAllChild(true);
    }, [rootNode.id, allNodes]);

    // Sync KTree selection whenever breadcrumb last item changes (drilldown or back)
    const lastBreadcrumbId = breadcrumb[breadcrumb.length - 1]?.id ?? null;
    const lastBreadcrumbName = breadcrumb[breadcrumb.length - 1]?.name ?? null;

    const { setOpenTabs } = useEditorTabBarStore();

    useEffect(() => {
        if (lastBreadcrumbId && lastBreadcrumbId > 0) {
            setSelectedItemIds([lastBreadcrumbId]);
            setLastSelectedItemId(lastBreadcrumbId);
            setScrollToItem(true);
        }
    }, [lastBreadcrumbId]);

    // Sync kNode singleton tab title in TabBar whenever breadcrumb changes
    useEffect(() => {
        if (!lastBreadcrumbName) return;
        setOpenTabs(prev => prev.map(t =>
            t.type === constants.vscode.tab.tabTypes.kNode
                ? { ...t, title: lastBreadcrumbName }
                : t
        ));
    }, [lastBreadcrumbName]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { knowledgeId: number; parentId: number | null };
            if (detail.knowledgeId !== rootNode.knowledgeId) return;
            // Block if editing or unsaved-prompt is active — flash the prompt instead
            if (editingNodeId != null || unsavedPromptNodeId != null) {
                setPromptFlashTick(t => t + 1);
                return;
            }
            setInlineNewParentId(detail.parentId);
        };
        window.addEventListener("k-node-inline-create", handler);
        return () => window.removeEventListener("k-node-inline-create", handler);
    }, [rootNode.knowledgeId]);

    const handleGridContextMenu = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-node-card]")) return;
        e.preventDefault();
        showContextMenu(e, constants.contextMenu.contextMenuTypes.kNodePanelBlank, currentScopeNode);
    };

    const sortedNodes = [...scopedNodes].sort((a, b) => (a.pathDepth ?? 0) - (b.pathDepth ?? 0))

    // Filter by search query — diacritic-insensitive match on name or description
    const filteredNodes = (() => {
        if (!searchQuery.trim()) return sortedNodes;
        return sortedNodes.filter(n =>
            containsNormalized(n.name, searchQuery) ||
            (n.description ? containsNormalized(stripHtmlToText(n.description), searchQuery) : false)
        );
    })();

    if (currentK?.id !== rootNode.knowledgeId) {
        return (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                Select the knowledge in the sidebar to view this node
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full w-full">
            {/* breadcrumb + stats */}
            <div className="flex items-center gap-2 px-6 py-2.5 border-b border-zinc-800 shrink-0 min-w-0">
                <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                    {/* Knowledge prefix — always first */}
                    {kName && (
                        <span className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => {
                                    setBreadcrumb(prev => [prev[0]]);
                                    // Open workspace root in KTree so direct children are visible
                                    KtreeMiniHelper.expandPathToItem(_treeRef, treeData, kconstants.workspace.root.workspaceItemId);
                                }}
                                className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                                title={kName}
                            >
                                <LibraryBig className="w-3.5 h-3.5 shrink-0" style={{ color: "#A1887F" }} />
                                <span className="text-sm truncate max-w-[120px]">{kName}</span>
                            </button>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        </span>
                    )}
                    {/* Breadcrumb items — skip null-id entry (knowledge root sentinel, already shown via kName prefix) */}
                    {(() => {
                        const visible = breadcrumb.filter(entry => entry.id !== null);
                        return visible.map((entry, i) => {
                            const isLast = i === visible.length - 1;
                            const origIdx = breadcrumb.indexOf(entry);
                            const entryColor = entry.color || undefined;
                            return (
                                <span key={entry.id ?? i} className="flex items-center gap-1 min-w-0 shrink-0">
                                    {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />}
                                    <button
                                        onClick={() => !isLast && setBreadcrumb(prev => prev.slice(0, origIdx + 1))}
                                        disabled={isLast}
                                        className={`text-sm truncate max-w-[140px] transition-colors ${
                                            isLast
                                                ? "font-semibold cursor-default"
                                                : "text-zinc-500 hover:text-zinc-300"
                                        }`}
                                        style={isLast && entryColor ? { color: entryColor } : undefined}
                                    >
                                        {entry.name}
                                    </button>
                                    {entry.id === markedNodeId && (
                                        <Bookmark className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" />
                                    )}
                                </span>
                            );
                        });
                    })()}
                </div>
                <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-600 shrink-0">
                    <span>{filteredNodes.length} node{filteredNodes.length !== 1 ? "s" : ""}</span>
                    <button
                        onClick={() => setShowAllChild(v => !v)}
                        className={`p-1 rounded transition-colors ${!showAllChild ? "text-blue-400 bg-blue-900/20" : "text-zinc-600 hover:text-zinc-400"}`}
                        title={showAllChild ? "Show direct children only" : "Show all levels"}
                    >
                        <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => setShowDeleted(v => !v)}
                        className={`p-1 rounded transition-colors ${showDeleted ? "text-red-400 bg-red-900/20" : "text-zinc-600 hover:text-zinc-400"}`}
                        title={showDeleted ? "Hide deleted" : "Show deleted"}
                    >
                        <Trash className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* card grid */}
            <div className="h-full overflow-y-auto px-6 py-6" onContextMenu={handleGridContextMenu}>
                <div className="grid grid-cols-4 gap-3">
                    {/* card 0 = current scope node (breadcrumb last item) */}
                    <NodeCard node={currentScopeNode} isRoot />
                    {filteredNodes.map((node) => (
                        <NodeCard key={node.id} node={node} />
                    ))}
                    {inlineNewParentId !== undefined && <InlineNewNodeCard />}
                </div>
            </div>
        </div>
    );
}

interface KNodeEditorPanelProps {
    tab: BaseTab;
}

export function KNodeEditorPanel({ tab }: KNodeEditorPanelProps) {
    const rootNode = tab.data as unknown as KItemV2;
    return (
        <KNodeEditorProvider rootNode={rootNode}>
            <KNodeEditorContent />
        </KNodeEditorProvider>
    );
}
