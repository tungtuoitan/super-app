import type { MutableRefObject, RefObject } from "react";
import {
    edgeWeight, kwRadius, kwColor,
    type GraphNode,
} from "./wiki.graph.utils";
import { getWikiGraphPalette } from "./wikiGraphTheme.utils";
import { LERP_SPEED, ALPHA_DIM, ALPHA_NEIGHBOR, LABEL_FONT } from "./wiki.constants";

export interface WikiGraphDrawParams {
    canvasRef: RefObject<HTMLCanvasElement>;
    nodesRef: MutableRefObject<GraphNode[]>;
    edgeMapRef: MutableRefObject<Map<string, number>>;
    scaleRef: MutableRefObject<number>;
    offRef: MutableRefObject<{ x: number; y: number }>;
    cameraTargetRef: MutableRefObject<{ offX: number; offY: number; scale: number } | null>;
    selectedIdsRef: MutableRefObject<Set<number>>;
    markedIdsRef: MutableRefObject<Set<number>>;
    imageCacheRef: MutableRefObject<Map<number, HTMLImageElement>>;
    searchText: string;
    infoCountRange: { min: number; max: number };
    familiarityRange: { min: number; max: number };
}

export function drawWikiGraph({
    canvasRef, nodesRef, edgeMapRef, scaleRef, offRef, cameraTargetRef,
    selectedIdsRef, markedIdsRef, imageCacheRef,
    searchText, infoCountRange, familiarityRange,
}: WikiGraphDrawParams) {
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
    const pal    = getWikiGraphPalette(); // theme tokens → concrete colors

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
    ctx.fillStyle = pal.background;
    ctx.fillRect(0, 0, W, H);

    // Subtle dot grid
    ctx.save();
    const step = 32 * scale;
    const x0   = ((offX % step) + step) % step;
    const y0   = ((offY % step) + step) % step;
    ctx.fillStyle = pal.dot;
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
            ctx.strokeStyle = isHighlighted ? pal.edgeActive : pal.edge;
            ctx.lineWidth   = isHighlighted ? w * 0.6 + 0.6 : w * 0.5;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            ctx.restore();
        }
    }

    // ── Nodes ─────────────────────────────────────────────────────────────
    nodes.forEach(node => {
        const r          = kwRadius(node, infoCountRange.min, infoCountRange.max);
        const isSelected = selIds.has(node.id);
        const { inner: colorInner } =
            kwColor(node, familiarityRange.min, familiarityRange.max);

        ctx.save();
        ctx.globalAlpha = node.alpha;

        // Selected: soft amber glow
        if (isSelected) {
            ctx.shadowColor = pal.accentGlow;
            ctx.shadowBlur  = 14;
        }

        // Fill — surface; familiarity (gray→green) as a light tint, amber tint when selected
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = pal.nodeFill;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = isSelected ? pal.accentSoft : colorInner + "26"; // ~15% tint
        ctx.fill();

        // Ring
        if (isSelected) {
            // Pulsing amber ring for selected
            const pulse = 0.55 + Math.sin(now / 700) * 0.45;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            ctx.lineWidth   = 1.5;
            ctx.strokeStyle = pal.accent;
            ctx.globalAlpha = node.alpha * pulse;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 4 + Math.sin(now / 700) * 2, 0, Math.PI * 2);
            ctx.lineWidth   = 1;
            ctx.globalAlpha = node.alpha * (1 - pulse) * 0.5;
            ctx.stroke();
        } else {
            // Hairline ring tinted by familiarity
            ctx.lineWidth   = 1;
            ctx.strokeStyle = colorInner;
            ctx.globalAlpha = node.alpha * 0.85;
            ctx.stroke();
        }

        ctx.globalAlpha = node.alpha;

        // Marked: dashed outer ring + amber ★ badge
        if (markedIdsRef.current.has(node.id)) {
            ctx.strokeStyle = pal.marked;
            ctx.lineWidth   = 1.25;
            ctx.globalAlpha = node.alpha * 0.9;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + (isSelected ? 9 : 5), 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // ★ badge at top-right of node
            const bs = Math.max(8, r * 0.42);
            const bx = node.x + r * 0.68;
            const by = node.y - r * 0.68;
            ctx.font         = `${bs}px serif`;
            ctx.fillStyle    = pal.accent;
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
            ctx.font         = `500 ${fs}px ${LABEL_FONT}`;
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
            ctx.font          = `${isSelected ? 600 : 500} ${fs}px ${LABEL_FONT}`;
            ctx.fillStyle     = pal.label;
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
}
