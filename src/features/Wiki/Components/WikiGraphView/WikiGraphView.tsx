import { useEffect, useRef, useState } from "react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { useWikiTabHelper } from "../../hooks/useWikiTab.helper";
import { useMenuContextHelper } from "@/shared";
import { constants } from "@/shared";
import { wikiService } from "../../service/wiki.service";
import {
    buildGraphNodes, simulateStep,
    buildEdgeMap,
    kwRadius,
    buildInfoCountRange, buildFamiliarityRange,
    type GraphNode,
} from "../../utils/wiki.graph.utils";
import { drawWikiGraph } from "../../utils/wikiGraphDraw.utils";
import { INIT_SIM_STEPS } from "../../utils/wiki.constants";
import WikiInsertModal from "../WikiInfoPanel/WikiInsertModal";
import WikiInsertKeywordModal from "../WikiInfoPanel/WikiInsertKeywordModal";
import { WikiKeywordEditModal } from "../small/WikiKeywordEditModal";
import WikiGraphToolbar from "../small/WikiGraphToolbar";
import type { WikiKeyword } from "../../types/wiki.type";

export default function WikiGraphView() {
    const { keywords, infos, isLoading, searchText, setSearchText, setSelectedKeywordIds, selectedKeywordIds, markedKeywordIds, setMarkedKeywordIds, focusKeywordId, setFocusKeywordId } = useWikiStore();
    const { loadAll }          = useWikiLoader();
    const { openWikiTab }      = useWikiTabHelper();
    const { showContextMenu }  = useMenuContextHelper();

    const canvasRef           = useRef<HTMLCanvasElement>(null);
    const nodesRef            = useRef<GraphNode[]>([]);
    const edgeMapRef          = useRef<Map<string, number>>(new Map());
    const animRef             = useRef<number>(0);
    const draggedIdRef        = useRef<number | null>(null);
    const dragStartPosRef     = useRef<{ x: number; y: number } | null>(null);
    const isPanRef            = useRef(false);
    const panStartRef         = useRef({ x: 0, y: 0 });
    const panOff0Ref          = useRef({ x: 0, y: 0 });
    const scaleRef            = useRef(1);
    const offRef              = useRef({ x: 0, y: 0 });
    const cameraTargetRef     = useRef<{ offX: number; offY: number; scale: number } | null>(null);
    // canvas-local selected ids (synced from store, used in draw without re-render)
    const selectedIdsRef      = useRef<Set<number>>(new Set());
    // canvas-local marked ids (synced from store, used in draw without re-render)
    const markedIdsRef        = useRef<Set<number>>(new Set());

    const [showInsert, setShowInsert]         = useState(false);
    const [showAddKeyword, setShowAddKeyword] = useState(false);
    const [isRescanning, setIsRescanning]     = useState(false);
    const [editKw, setEditKw]                 = useState<WikiKeyword | null>(null);
    const [tooltip, setTooltip]             = useState<{ x: number; y: number; node: GraphNode } | null>(null);
    // Only active (non-deleted) keywords appear as graph nodes
    const activeKeywords    = keywords.filter(k => !k.deletedAt);
    const infoCountRange    = buildInfoCountRange(activeKeywords);
    const familiarityRange  = buildFamiliarityRange(activeKeywords);

    /** Cache of loaded HTMLImageElement keyed by keyword id */
    const imageCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());

    /** Track last click time per node for double-click detection */
    const lastClickRef = useRef<{ id: number; t: number } | null>(null);

    // ── Sync store selection → canvas ref ─────────────────────────────────────
    useEffect(() => {
        selectedIdsRef.current = new Set(selectedKeywordIds);
    }, [selectedKeywordIds]);

    // ── Sync store marked ids → canvas ref ────────────────────────────────────
    useEffect(() => {
        markedIdsRef.current = new Set(markedKeywordIds);
    }, [markedKeywordIds]);

    // ── Sync image cache when keywords change ─────────────────────────────────
    useEffect(() => {
        keywords.forEach(kw => {
            if (!kw.icon) { imageCacheRef.current.delete(kw.id); return; }
            const cached = imageCacheRef.current.get(kw.id);
            // Reload if icon changed or not yet loaded
            if (!cached || cached.src !== kw.icon) {
                const img = new Image();
                img.src = kw.icon;
                imageCacheRef.current.set(kw.id, img);
            }
        });
    }, [keywords]);

    // ── Pan camera to focused keyword ─────────────────────────────────────────
    useEffect(() => {
        if (!focusKeywordId) return;
        const n = nodesRef.current.find(n => n.id === focusKeywordId);
        if (!n) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        const targetScale = Math.max(1.0, scaleRef.current);
        cameraTargetRef.current = {
            offX: W / 2 - n.x * targetScale,
            offY: H / 2 - n.y * targetScale,
            scale: targetScale,
        };
        setFocusKeywordId(null);
    }, [focusKeywordId]);

    // ── Load on mount ──────────────────────────────────────────────────────────
    useEffect(() => { loadAll(); }, []);

    // ── Rebuild nodes + edge map when keywords or infos change ────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || activeKeywords.length === 0) return;
        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        const newEdgeMap = buildEdgeMap(activeKeywords, infos);
        edgeMapRef.current = newEdgeMap;
        const nodes = buildGraphNodes(activeKeywords, W, H);
        for (let i = 0; i < INIT_SIM_STEPS; i++) simulateStep(nodes, W, H, null, newEdgeMap);
        nodes.forEach(n => { n.vx = 0; n.vy = 0; n.alpha = 1; });
        nodesRef.current = nodes;
    }, [keywords, infos]);

    // ── Canvas resize ─────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr    = window.devicePixelRatio || 1;
        const resize = () => {
            canvas.width  = canvas.offsetWidth  * dpr;
            canvas.height = canvas.offsetHeight * dpr;
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(canvas);
        return () => ro.disconnect();
    }, []);

    // ── Draw ──────────────────────────────────────────────────────────────────
    const draw = () => drawWikiGraph({
        canvasRef, nodesRef, edgeMapRef, scaleRef, offRef, cameraTargetRef,
        selectedIdsRef, markedIdsRef, imageCacheRef,
        searchText, infoCountRange, familiarityRange,
    });

    // ── Animation loop (draw only — no simulation) ────────────────────────────
    useEffect(() => {
        const loop = () => {
            draw();
            animRef.current = requestAnimationFrame(loop);
        };
        animRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    // ── Coord helpers ─────────────────────────────────────────────────────────
    const c2w = (cx: number, cy: number) => ({
        x: (cx - offRef.current.x) / scaleRef.current,
        y: (cy - offRef.current.y) / scaleRef.current,
    });

    const nodeAt = (cx: number, cy: number): GraphNode | null => {
        const { x, y } = c2w(cx, cy);
        return nodesRef.current.find(n => {
            const r = kwRadius(n, infoCountRange.min, infoCountRange.max) + 6;
            return (n.x - x) ** 2 + (n.y - y) ** 2 <= r * r;
        }) ?? null;
    };

    // ── Mouse handlers ────────────────────────────────────────────────────────
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;

        if (isPanRef.current) {
            offRef.current = {
                x: panOff0Ref.current.x + e.clientX - panStartRef.current.x,
                y: panOff0Ref.current.y + e.clientY - panStartRef.current.y,
            };
            return;
        }
        if (draggedIdRef.current !== null) {
            const { x, y } = c2w(cx, cy);
            const n = nodesRef.current.find(n => n.id === draggedIdRef.current);
            if (n) { n.x = x; n.y = y; n.vx = 0; n.vy = 0; }
            return;
        }
        const node = nodeAt(cx, cy);
        if (node) {
            setTooltip({ x: e.clientX + 14, y: e.clientY - 8, node });
            canvasRef.current!.style.cursor = "pointer";
        } else {
            setTooltip(null);
            canvasRef.current!.style.cursor = "grab";
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const node = nodeAt(cx, cy);
        if (node) {
            draggedIdRef.current    = node.id;
            dragStartPosRef.current = { x: node.x, y: node.y };
            canvasRef.current!.style.cursor = "grabbing";
        } else {
            isPanRef.current    = true;
            panStartRef.current = { x: e.clientX, y: e.clientY };
            panOff0Ref.current  = { ...offRef.current };
            canvasRef.current!.style.cursor = "grabbing";
        }
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // Right/middle click — only resets drag state; selection must not change
        // (onContextMenu fires separately for right-click)
        if (e.button !== 0) {
            draggedIdRef.current    = null;
            dragStartPosRef.current = null;
            isPanRef.current        = false;
            return;
        }

        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;

        if (draggedIdRef.current !== null) {
            const n = nodesRef.current.find(n => n.id === draggedIdRef.current);
            if (n && dragStartPosRef.current) {
                const moved =
                    Math.abs(n.x - dragStartPosRef.current.x) +
                    Math.abs(n.y - dragStartPosRef.current.y) > 6;
                if (moved) {
                    n.pinned = true;
                    wikiService.savePinnedPosition(n.id, n.x, n.y);
                } else if (e.shiftKey) {
                    // Shift+click: toggle this node in/out of the multi-selection
                    const cur = selectedIdsRef.current;
                    const next = new Set(cur);
                    if (next.has(n.id)) next.delete(n.id);
                    else                next.add(n.id);
                    selectedIdsRef.current = next;
                    setSelectedKeywordIds([...next]);
                } else {
                    // Detect double-click (< 350ms since last click on same node)
                    const now = Date.now();
                    const last = lastClickRef.current;
                    if (last && last.id === n.id && now - last.t < 350) {
                        // Double-click → open keyword edit modal
                        lastClickRef.current = null;
                        const kw = keywords.find(k => k.id === n.id);
                        if (kw) setEditKw(kw);
                    } else {
                        lastClickRef.current = { id: n.id, t: now };
                        // Single click: select only this node (toggle off if already solo)
                        const isSoloSelected =
                            selectedIdsRef.current.size === 1 && selectedIdsRef.current.has(n.id);
                        const newIds = isSoloSelected ? [] : [n.id];
                        selectedIdsRef.current = new Set(newIds);
                        setSelectedKeywordIds(newIds);
                        if (newIds.length > 0) openWikiTab(n.id);
                    }
                }
            }
            draggedIdRef.current    = null;
            dragStartPosRef.current = null;
        } else if (isPanRef.current) {
            const dx = Math.abs(e.clientX - panStartRef.current.x);
            const dy = Math.abs(e.clientY - panStartRef.current.y);
            if (dx < 4 && dy < 4 && !nodeAt(cx, cy)) {
                // Click on empty space → deselect all
                selectedIdsRef.current = new Set();
                setSelectedKeywordIds([]);
            }
            isPanRef.current = false;
        }
        canvasRef.current!.style.cursor = nodeAt(cx, cy) ? "pointer" : "grab";
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const rect = canvasRef.current!.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        const f  = e.deltaY > 0 ? 0.88 : 1.14;
        scaleRef.current = Math.max(0.25, Math.min(4, scaleRef.current * f));
        offRef.current   = {
            x: cx - (cx - offRef.current.x) * f,
            y: cy - (cy - offRef.current.y) * f,
        };
    };

    const handleMouseLeave = () => {
        setTooltip(null);
        isPanRef.current = false;
    };

    // ── Mark / unmark selected nodes (max 5) ─────────────────────────────────
    const allSelectedMarked =
        selectedKeywordIds.length > 0 &&
        selectedKeywordIds.every(id => markedKeywordIds.includes(id));

    const unmarkedSelected = selectedKeywordIds.filter(id => !markedKeywordIds.includes(id));
    const canMarkMore      = markedKeywordIds.length + unmarkedSelected.length <= 5;

    const handleToggleMark = () => {
        if (allSelectedMarked) {
            // Unmark all selected
            setMarkedKeywordIds(prev => prev.filter(id => !selectedKeywordIds.includes(id)));
        } else if (canMarkMore) {
            // Mark the ones not yet marked
            setMarkedKeywordIds(prev => [...prev, ...unmarkedSelected]);
        }
    };

    // ── Keyword delete (triggered from context menu) ──────────────────────────
    const handleDeleteKeyword = async (id: number) => {
        await wikiService.deleteKeyword(id);
        setSelectedKeywordIds(prev => prev.filter(sid => sid !== id));
        await loadAll();
    };

    // ── Right-click on canvas → open context menu for node ────────────────────
    const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const node = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
        if (!node) return;
        const kw = keywords.find(k => k.id === node.id);
        if (!kw) return;
        showContextMenu(e, "wiki-graph-node", {
            keyword: kw,
            onDelete: () => handleDeleteKeyword(kw.id),
        });
    };

    const handleAutoLayout = () => {
        nodesRef.current.forEach(n => { n.pinned = false; });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const W = canvas.offsetWidth, H = canvas.offsetHeight;
        const r = Math.min(W, H) * 0.32;
        nodesRef.current.forEach((n, i) => {
            const angle = (i / nodesRef.current.length) * Math.PI * 2 - Math.PI / 2;
            n.x = W / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 50;
            n.y = H / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 50;
            n.vx = 0; n.vy = 0;
        });
        for (let i = 0; i < INIT_SIM_STEPS; i++) simulateStep(nodesRef.current, W, H, null, edgeMapRef.current);
        nodesRef.current.forEach(n => { n.vx = 0; n.vy = 0; });
    };


    return (
        <div className="flex flex-col h-full bg-background">
            {/* Toolbar */}
            <WikiGraphToolbar
                searchText={searchText}
                setSearchText={setSearchText}
                selectedCount={selectedKeywordIds.length}
                allSelectedMarked={allSelectedMarked}
                canMarkMore={canMarkMore}
                onAutoLayout={handleAutoLayout}
                onToggleMark={handleToggleMark}
                onAddKeyword={() => setShowAddKeyword(true)}
                onInsert={() => setShowInsert(true)}
            />

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        Loading…
                    </div>
                )}
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block"
                    style={{ cursor: "grab" }}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                    onWheel={handleWheel}
                    onContextMenu={handleContextMenu}
                />

            </div>


            {showInsert    && <WikiInsertModal          onClose={() => setShowInsert(false)} />}
            {showAddKeyword && <WikiInsertKeywordModal   onClose={() => setShowAddKeyword(false)} />}
            {editKw && (
                <WikiKeywordEditModal
                    keyword={editKw}
                    onClose={() => setEditKw(null)}
                />
            )}
        </div>
    );
}
