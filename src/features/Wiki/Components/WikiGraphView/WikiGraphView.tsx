import { useEffect, useRef, useState } from "react";
import { Search, RefreshCw, Plus, ScanLine, Bookmark, BookmarkCheck } from "lucide-react";
import { useWikiStore } from "../../store/useWiki.store";
import { useWikiLoader } from "../../hooks/useWikiLoader.helper";
import { useWikiTabHelper } from "../../hooks/useWikiTab.helper";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { constants } from "@/utils/constants";
import { wikiService } from "../../service/wiki.service";
import {
    buildGraphNodes, simulateStep,
    buildEdgeMap, edgeWeight,
    kwRadius, kwColor,
    buildInfoCountRange, buildFamiliarityRange,
    type GraphNode,
} from "../../utils/wiki.graph.utils";
import { WIKI_NODE_SELECTED, WIKI_NODE_MARKED } from "../../utils/wiki.constants";
import WikiInsertModal from "../WikiInfoPanel/WikiInsertModal";
import WikiInsertKeywordModal from "../WikiInfoPanel/WikiInsertKeywordModal";
import { WikiKeywordEditModal } from "../small/WikiKeywordEditModal";
import type { WikiKeyword } from "../../types/wiki.type";

const INIT_SIM_STEPS = 400;
const LERP_SPEED     = 0.1;   // alpha lerp per frame
const ALPHA_DIM      = 0.08;  // dimmed node/edge opacity
const ALPHA_NEIGHBOR = 0.55;  // connected-but-not-selected

const EDGE_COLOR = "#4b5563"; // gray-600 — neutral edge

export default function WikiGraphView() {
    const { keywords, infos, isLoading, searchText, setSearchText, setSelectedKeywordIds, selectedKeywordIds, markedKeywordIds, setMarkedKeywordIds, focusKeywordId, setFocusKeywordId } = useWikiStore();
    const { loadAll }          = useWikiLoader();
    const { openWikiTab }      = useWikiTabHelper();
    const { showContextMenu }  = useOrchestratorContextMenuHelper();

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
    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr    = window.devicePixelRatio || 1;
        const W      = canvas.width / dpr, H = canvas.height / dpr;
        const scale  = scaleRef.current;
        const offX   = offRef.current.x, offY = offRef.current.y;
        const nodes  = nodesRef.current;
        const selIds = selectedIdsRef.current;
        const q      = searchText.trim().toLowerCase();
        const now    = Date.now();

        // ── Lerp camera toward target ─────────────────────────────────────────
        const ct = cameraTargetRef.current;
        if (ct) {
            const CAMERA_LERP = 0.1;
            scaleRef.current   += (ct.scale - scaleRef.current) * CAMERA_LERP;
            offRef.current.x   += (ct.offX  - offRef.current.x) * CAMERA_LERP;
            offRef.current.y   += (ct.offY  - offRef.current.y) * CAMERA_LERP;
            const dist = Math.abs(ct.offX - offRef.current.x) + Math.abs(ct.offY - offRef.current.y) + Math.abs(ct.scale - scaleRef.current);
            if (dist < 0.5) cameraTargetRef.current = null;
        }

        // ── Lerp node alphas each frame ────────────────────────────────────────
        const selNodes = nodes.filter(n => selIds.has(n.id));

        nodes.forEach(node => {
            let target: number;
            if (q) {
                target = node.name.toLowerCase().includes(q) ? 1 : ALPHA_DIM;
            } else if (selIds.size === 0) {
                target = 1;
            } else if (selIds.has(node.id)) {
                target = 1;
            } else if (selNodes.some(sel => edgeWeight(node, sel, edgeMapRef.current) > 0)) {
                target = ALPHA_NEIGHBOR;
            } else {
                target = ALPHA_DIM;
            }
            node.alpha += (target - node.alpha) * LERP_SPEED;
        });

        // ── Paint ─────────────────────────────────────────────────────────────
        ctx.save();
        ctx.clearRect(0, 0, W * dpr, H * dpr);
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = "#0f1117";
        ctx.fillRect(0, 0, W, H);

        // Subtle dot grid
        ctx.save();
        const step = 32 * scale;
        const x0   = ((offX % step) + step) % step;
        const y0   = ((offY % step) + step) % step;
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        for (let x = x0; x < W; x += step)
            for (let y = y0; y < H; y += step)
                ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
        ctx.restore();

        ctx.translate(offX, offY);
        ctx.scale(scale, scale);

        // ── Edges ─────────────────────────────────────────────────────────────
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const w = edgeWeight(a, b, edgeMapRef.current);
                if (!w) continue;

                const isHighlighted = selIds.size > 0 && (selIds.has(a.id) || selIds.has(b.id));
                const edgeAlpha     = isHighlighted
                    ? Math.min(a.alpha, b.alpha)   // highlighted edge follows node alpha
                    : Math.min(a.alpha, b.alpha) * 0.4;

                ctx.save();
                ctx.globalAlpha = edgeAlpha;
                ctx.strokeStyle = EDGE_COLOR;
                ctx.lineWidth   = isHighlighted ? w + 0.5 : w * 0.6;
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                ctx.restore();
            }
        }

        // ── Nodes ─────────────────────────────────────────────────────────────
        nodes.forEach(node => {
            const r          = kwRadius(node, infoCountRange.min, infoCountRange.max);
            const isSelected = selIds.has(node.id);
            const { inner: colorInner, outer: colorOuter } =
                kwColor(node, familiarityRange.min, familiarityRange.max);

            ctx.save();
            ctx.globalAlpha = node.alpha;

            // Selected: violet glow
            if (isSelected) {
                ctx.shadowColor = WIKI_NODE_SELECTED.glow;
                ctx.shadowBlur  = 20;
            }

            // Fill gradient — familiarity (gray→green) for normal, violet for selected
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(
                node.x - r * 0.3, node.y - r * 0.35, 0,
                node.x, node.y, r * 1.1
            );
            grad.addColorStop(0, isSelected ? WIKI_NODE_SELECTED.inner : colorInner);
            grad.addColorStop(1, isSelected ? WIKI_NODE_SELECTED.outer : colorOuter);
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Ring
            if (isSelected) {
                // Pulsing violet ring for selected
                const pulse = 0.55 + Math.sin(now / 700) * 0.45;
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                ctx.lineWidth   = 1.5;
                ctx.strokeStyle = WIKI_NODE_SELECTED.ring;
                ctx.globalAlpha = node.alpha * pulse;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + 4 + Math.sin(now / 700) * 2, 0, Math.PI * 2);
                ctx.lineWidth   = 1;
                ctx.globalAlpha = node.alpha * (1 - pulse) * 0.5;
                ctx.stroke();
            } else {
                // Subtle tinted ring matching node color
                ctx.lineWidth   = 0.75;
                ctx.strokeStyle = colorInner + "50"; // 31% opacity
                ctx.globalAlpha = node.alpha * 0.6;
                ctx.stroke();
            }

            ctx.globalAlpha = node.alpha;

            // Marked: amber outer ring + ★ badge
            if (markedIdsRef.current.has(node.id)) {
                ctx.shadowColor = WIKI_NODE_MARKED.glow;
                ctx.shadowBlur  = 10;
                ctx.strokeStyle = WIKI_NODE_MARKED.ring;
                ctx.lineWidth   = 2;
                ctx.globalAlpha = node.alpha * 0.9;
                ctx.beginPath();
                ctx.arc(node.x, node.y, r + (isSelected ? 9 : 5), 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur  = 0;

                // ★ badge at top-right of node
                const bs = Math.max(8, r * 0.42);
                const bx = node.x + r * 0.68;
                const by = node.y - r * 0.68;
                ctx.font         = `${bs}px serif`;
                ctx.fillStyle    = WIKI_NODE_MARKED.badge;
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                ctx.globalAlpha  = node.alpha;
                ctx.fillText("★", bx, by);
            }

            // Icon (if available) — clipped to inner circle
            const cachedImg = imageCacheRef.current.get(node.id);
            if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
                const ir = r * 0.62;
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y - r * 0.1, ir, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(cachedImg, node.x - ir, node.y - r * 0.1 - ir, ir * 2, ir * 2);
                ctx.restore();
                // Scrim at bottom for label readability
                ctx.save();
                ctx.beginPath();
                ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
                ctx.clip();
                const scrim = ctx.createLinearGradient(node.x, node.y + r * 0.15, node.x, node.y + r);
                scrim.addColorStop(0, "rgba(0,0,0,0)");
                scrim.addColorStop(1, "rgba(0,0,0,0.72)");
                ctx.fillStyle = scrim;
                ctx.fillRect(node.x - r, node.y + r * 0.15, r * 2, r * 0.85);
                ctx.restore();
                const fs = Math.max(8, Math.min(10, r * 0.46));
                ctx.font         = `600 ${fs}px -apple-system, sans-serif`;
                ctx.fillStyle    = "#fff";
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(
                    node.name.length > 12 ? node.name.slice(0, 11) + "…" : node.name,
                    node.x, node.y + r * 0.68
                );
            } else {
                // Text label
                const fs = Math.max(9, Math.min(12, r * 0.58));
                ctx.font          = `${isSelected ? 600 : 500} ${fs}px -apple-system, sans-serif`;
                ctx.fillStyle     = "#fff";
                ctx.textAlign     = "center";
                ctx.textBaseline  = "middle";
                const words = node.name.split(" ");
                if (words.length > 1 && node.name.length > 9) {
                    const mid = Math.ceil(words.length / 2);
                    ctx.fillText(words.slice(0, mid).join(" "), node.x, node.y - fs * 0.58);
                    ctx.fillText(words.slice(mid).join(" "),    node.x, node.y + fs * 0.58);
                } else {
                    ctx.fillText(node.name, node.x, node.y);
                }
            }

            ctx.restore();
        });

        ctx.restore();
    };

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
        showContextMenu(e, constants.contextMenu.contextMenuTypes.wikiGraphNode, {
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
        <div className="flex flex-col h-full bg-[#0f1117]">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 px-2.5 py-2 border-b border-white/[0.05] flex-shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 w-3.5 h-3.5 pointer-events-none" />
                    <input
                        className="w-full h-7 bg-zinc-800/60 border border-white/[0.07] rounded-md pl-7 pr-2 text-xs text-zinc-200 outline-none focus:border-violet-500/60 placeholder:text-zinc-600 transition-colors"
                        placeholder="Search keywords…"
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleAutoLayout}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800/60 border border-white/[0.07] text-zinc-600 hover:text-zinc-300 transition-colors"
                    title="Auto layout"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {selectedKeywordIds.length > 0 && (
                    <button
                        onClick={handleToggleMark}
                        disabled={!allSelectedMarked && !canMarkMore}
                        className={[
                            "w-7 h-7 flex items-center justify-center rounded-md border transition-colors",
                            allSelectedMarked
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
                                : canMarkMore
                                    ? "bg-zinc-800/60 border-white/[0.07] text-zinc-500 hover:text-amber-400 hover:border-amber-500/30"
                                    : "bg-zinc-800/60 border-white/[0.07] text-zinc-700 cursor-not-allowed opacity-50",
                        ].join(" ")}
                        title={
                            allSelectedMarked
                                ? "Unmark selected"
                                : canMarkMore
                                    ? "Mark selected (max 5)"
                                    : "Max 5 nodes can be marked"
                        }
                    >
                        {allSelectedMarked
                            ? <BookmarkCheck className="w-3.5 h-3.5" />
                            : <Bookmark      className="w-3.5 h-3.5" />
                        }
                    </button>
                )}
                {/* <button
                    onClick={async () => {
                        setIsRescanning(true);
                        try {
                            await wikiService.rescanAll();
                            await loadAll();
                        } finally {
                            setIsRescanning(false);
                        }
                    }}
                    disabled={isRescanning}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800/60 border border-white/[0.07] text-zinc-600 hover:text-emerald-400 hover:border-emerald-500/30 disabled:opacity-40 transition-colors"
                    title="Re-scan all keyword↔info links"
                >
                    <ScanLine className={`w-3.5 h-3.5 ${isRescanning ? "animate-pulse" : ""}`} />
                </button> */}
                <button
                    onClick={() => setShowAddKeyword(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800/60 border border-white/[0.07] text-zinc-400 hover:text-violet-300 hover:border-violet-500/40 transition-colors"
                    title="Add keyword"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setShowInsert(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-md bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                    title="Insert info"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
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

                {/* Size legend */}
                {/* <div className="absolute bottom-3 right-3 bg-zinc-900/80 border border-white/[0.05] rounded-lg px-2.5 py-2 text-[10px] text-zinc-600 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full border border-violet-500/50 inline-block" />
                        <span>Low usage</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border border-violet-400/50 inline-block" />
                        <span>High usage</span>
                    </div>
                </div> */}
            </div>

            {/* Tooltip */}
            {/* {tooltip && (
                <div
                    className="fixed z-50 bg-zinc-900/95 border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl pointer-events-none text-xs backdrop-blur-sm"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    <div className="font-semibold text-zinc-100 mb-1">{tooltip.node.name}</div>
                    <div className="text-zinc-500">
                        Score {calcScore(tooltip.node)} · {tooltip.node.infoIds.length} info{tooltip.node.infoIds.length !== 1 ? "s" : ""}
                    </div>
                    {tooltip.node.synonyms.length > 0 && (
                        <div className="text-violet-400 mt-0.5 text-[10px]">≈ {tooltip.node.synonyms.join(", ")}</div>
                    )}
                    <div className="text-zinc-600 mt-1 text-[10px]">double-click to edit</div>
                </div>
            )} */}

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
