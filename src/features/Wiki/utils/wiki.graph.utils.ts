import type { WikiKeyword, WikiInfo } from "../types/wiki.type";
import { WIKI_NODE_SIZE, WIKI_NODE_FAMILIARITY, WIKI_NODE_SELECTED } from "./wiki.constants";

// ─── Accent colors (violet = selected/focused) ────────────────────────────────
export const MONO_ACCENT       = "#8b5cf6"; // violet-500
export const MONO_ACCENT_DIM   = "#6d28d9"; // violet-700
export const MONO_ACCENT_LIGHT = "#c4b5fd"; // violet-300

// ─── Familiarity helpers (drives node color) ──────────────────────────────────

export const calcFamiliarity = (kw: WikiKeyword): number =>
    kw.views + kw.reads + kw.edits;

export const buildFamiliarityRange = (keywords: WikiKeyword[]) => {
    if (keywords.length === 0) return { min: 0, max: 0 };
    const vals = keywords.map(calcFamiliarity);
    return { min: Math.min(...vals), max: Math.max(...vals) };
};

// ─── Info-count helpers (drives node size) ────────────────────────────────────

export const buildInfoCountRange = (keywords: WikiKeyword[]) => {
    if (keywords.length === 0) return { min: 0, max: 0 };
    const vals = keywords.map(k => k.infoIds.length);
    return { min: Math.min(...vals), max: Math.max(...vals) };
};

// ─── Node radius — proportional to linked-info count ─────────────────────────
/** More linked infos → larger node. */
export const kwRadius = (kw: WikiKeyword, infoMin: number, infoMax: number): number => {
    const t = infoMax === infoMin ? 0.3 : (kw.infoIds.length - infoMin) / (infoMax - infoMin);
    return WIKI_NODE_SIZE.min + t * (WIKI_NODE_SIZE.max - WIKI_NODE_SIZE.min);
};

// ─── Node color — interpolated gray→green by familiarity ─────────────────────
const lerpCh = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
const toHex  = ([r, g, b]: [number, number, number]) =>
    `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;

/** Returns { inner, outer } CSS hex colors for a node based on familiarity. */
export const kwColor = (kw: WikiKeyword, famMin: number, famMax: number): { inner: string; outer: string } => {
    const t = famMax === famMin ? 0 : (calcFamiliarity(kw) - famMin) / (famMax - famMin);
    const { grayInner, grayOuter, greenInner, greenOuter } = WIKI_NODE_FAMILIARITY;
    return {
        inner: toHex([lerpCh(grayInner[0], greenInner[0], t), lerpCh(grayInner[1], greenInner[1], t), lerpCh(grayInner[2], greenInner[2], t)]),
        outer: toHex([lerpCh(grayOuter[0], greenOuter[0], t), lerpCh(grayOuter[1], greenOuter[1], t), lerpCh(grayOuter[2], greenOuter[2], t)]),
    };
};

/**
 * Precomputes edge weights between all keyword pairs.
 * Two keywords have edge weight > 0 only when they are both explicitly linked
 * to the same info (via info.keywordIds from the wiki.info_keyword table).
 */
export const buildEdgeMap = (keywords: WikiKeyword[], infos: WikiInfo[]): Map<string, number> => {
    const map = new Map<string, number>();
    const activeKwIds = new Set(keywords.filter(k => !k.deletedAt).map(k => k.id));
    if (activeKwIds.size < 2) return map;

    for (const info of infos) {
        if (info.deletedAt) continue;
        const ids = info.keywordIds.filter(id => activeKwIds.has(id));
        for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
                const lo = Math.min(ids[i], ids[j]);
                const hi = Math.max(ids[i], ids[j]);
                const key = `${lo}-${hi}`;
                map.set(key, (map.get(key) ?? 0) + 1);
            }
        }
    }

    return map;
};

/** O(1) edge-weight lookup from a precomputed map. */
export const edgeWeight = (a: { id: number }, b: { id: number }, edgeMap: Map<string, number>): number => {
    const lo = Math.min(a.id, b.id), hi = Math.max(a.id, b.id);
    return edgeMap.get(`${lo}-${hi}`) ?? 0;
};

// ─── Force-directed simulation ────────────────────────────────────────────────
export interface GraphNode extends WikiKeyword {
    x: number;
    y: number;
    vx: number;
    vy: number;
    pinned: boolean;
    /** Animated opacity 0..1, lerped each frame */
    alpha: number;
}

export const buildGraphNodes = (keywords: WikiKeyword[], canvasW: number, canvasH: number): GraphNode[] => {
    const r = Math.min(canvasW, canvasH) * 0.32;
    const cx = canvasW / 2, cy = canvasH / 2;
    return keywords.map((kw, i) => {
        const angle = (i / keywords.length) * Math.PI * 2 - Math.PI / 2;
        return {
            ...kw,
            x: (kw.posX !== undefined && kw.pinnedPosition) ? kw.posX : cx + r * Math.cos(angle) + (Math.random() - 0.5) * 50,
            y: (kw.posY !== undefined && kw.pinnedPosition) ? kw.posY : cy + r * Math.sin(angle) + (Math.random() - 0.5) * 50,
            vx: 0, vy: 0,
            pinned: kw.pinnedPosition,
            alpha: 1,
        };
    });
};

export const simulateStep = (
    nodes: GraphNode[],
    canvasW: number,
    canvasH: number,
    draggedId: number | null,
    edgeMap: Map<string, number>,
) => {
    const K = 130;
    nodes.forEach(n => { (n as any).fx = 0; (n as any).fy = 0; });

    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i], b = nodes[j];
            const dx = b.x - a.x, dy = b.y - a.y;
            const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
            const rep = (K * K) / (d * d);
            (a as any).fx -= rep * dx / d; (a as any).fy -= rep * dy / d;
            (b as any).fx += rep * dx / d; (b as any).fy += rep * dy / d;
            const w = edgeWeight(a, b, edgeMap);
            if (w) {
                const attr = (d * d) / (K * (5 - Math.min(w, 4)));
                (a as any).fx += attr * dx / d; (a as any).fy += attr * dy / d;
                (b as any).fx -= attr * dx / d; (b as any).fy -= attr * dy / d;
            }
        }
    }

    nodes.forEach(n => {
        if (n.id === draggedId || n.pinned) return;
        (n as any).fx += (canvasW / 2 - n.x) * 0.012;
        (n as any).fy += (canvasH / 2 - n.y) * 0.012;
        n.vx = (n.vx + (n as any).fx) * 0.78;
        n.vy = (n.vy + (n as any).fy) * 0.78;
        n.x = Math.max(50, Math.min(canvasW - 50, n.x + n.vx));
        n.y = Math.max(50, Math.min(canvasH - 50, n.y + n.vy));
    });
};
