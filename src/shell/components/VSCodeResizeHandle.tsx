import { useRef, type RefObject } from "react";
import { type ImperativePanelGroupHandle } from "react-resizable-panels";
import { useDeviceStore } from "@/shared";

interface VSCodeResizeHandleProps {
    direction: "horizontal" | "vertical";
    id?: string;
    /** Ref to the parent PanelGroup so we can resize once at pointerup. */
    groupRef: RefObject<ImperativePanelGroupHandle | null>;
    /**
     * Indices of the two panels this handle sits between, in the group's layout.
     * `before` is the panel that grows when user drags toward `after`.
     */
    indices: [before: number, after: number];
    /** Optional getter that returns the PanelGroup container element for measurement. */
    getGroupElement?: () => HTMLElement | null;
}

interface DragState {
    pointerId: number;
    startCoord: number;       // clientX or clientY at pointerdown
    groupSize: number;        // width or height of group container
    groupOrigin: number;      // top or left of group container
    startLayout: number[];    // panel sizes (%) at pointerdown
    sashEl: HTMLDivElement;   // overlay sash (fixed-position line)
    sashStartCoord: number;   // initial sash position (clientX/Y)
}

const SASH_COLOR = "#007acc";

/**
 * VSCode-style resize handle.
 *
 * Unlike react-resizable-panels' built-in handle (which calls setLayout on
 * every pointermove → continuous reflow of all Panel children), this handle:
 *   1. On pointerdown: snapshot start layout + render a fixed-position sash line.
 *   2. On pointermove: only update sash transform (GPU composite — zero layout).
 *   3. On pointerup: compute new sizes once, call groupRef.setLayout() once.
 *
 * Result: drag phase does zero work on the heavy subtree (editor / sidebar /
 * panel) — even with React Flow, Monaco etc. open, drag stays at 60fps.
 */
export function VSCodeResizeHandle({ direction, id, groupRef, indices, getGroupElement }: VSCodeResizeHandleProps) {
    const isHorizontal = direction === "horizontal";
    const { isMobile } = useDeviceStore();
    const dragRef = useRef<DragState | null>(null);
    const handleElRef = useRef<HTMLDivElement | null>(null);

    const findGroupEl = (): HTMLElement | null => {
        if (getGroupElement) {
            const el = getGroupElement();
            if (el) return el;
        }
        // Fallback: walk up from handle DOM until we hit a PanelGroup container
        let el: HTMLElement | null = handleElRef.current?.parentElement ?? null;
        while (el && !el.dataset.panelGroupId) el = el.parentElement;
        return el;
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!groupRef.current) return;
        const groupEl = findGroupEl();
        if (!groupEl) return;

        const rect = groupEl.getBoundingClientRect();
        const groupSize = isHorizontal ? rect.width : rect.height;
        const groupOrigin = isHorizontal ? rect.left : rect.top;
        const startCoord = isHorizontal ? e.clientX : e.clientY;

        // Build sash overlay (fixed positioning, will-change for compositor layer)
        const sashEl = document.createElement("div");
        sashEl.style.cssText = `
            position: fixed;
            ${isHorizontal ? `top: ${rect.top}px; height: ${rect.height}px; left: ${startCoord}px; width: 2px;`
                           : `left: ${rect.left}px; width: ${rect.width}px; top: ${startCoord}px; height: 2px;`}
            background: ${SASH_COLOR};
            transform: translate${isHorizontal ? "X" : "Y"}(-50%);
            will-change: transform;
            pointer-events: none;
            z-index: 99999;
        `;
        document.body.appendChild(sashEl);

        dragRef.current = {
            pointerId: e.pointerId,
            startCoord,
            groupSize,
            groupOrigin,
            startLayout: groupRef.current.getLayout(),
            sashEl,
            sashStartCoord: startCoord,
        };

        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.classList.add("is-resizing");
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = dragRef.current;
        if (!d || e.pointerId !== d.pointerId) return;

        // Clamp pointer to group bounds so sash never escapes the container
        const raw = isHorizontal ? e.clientX : e.clientY;
        const clamped = Math.max(d.groupOrigin, Math.min(d.groupOrigin + d.groupSize, raw));
        const delta = clamped - d.sashStartCoord;

        // Compositor-only update — no layout, no paint of subtree
        d.sashEl.style.transform = `translate${isHorizontal ? "X" : "Y"}(${delta - 1}px)`;
    };

    const finishDrag = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
        const d = dragRef.current;
        if (!d || e.pointerId !== d.pointerId) return;

        d.sashEl.remove();
        document.body.classList.remove("is-resizing");
        try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* already released */ }

        if (commit && groupRef.current) {
            // Compute new sizes from final pointer position (only one resize, here)
            const raw = isHorizontal ? e.clientX : e.clientY;
            const clamped = Math.max(d.groupOrigin, Math.min(d.groupOrigin + d.groupSize, raw));
            const deltaPct = ((clamped - d.startCoord) / d.groupSize) * 100;

            const [beforeIdx, afterIdx] = indices;
            const next = [...d.startLayout];
            const beforeSize = next[beforeIdx] + deltaPct;
            const afterSize = next[afterIdx] - deltaPct;

            // Avoid negative sizes / overshoot
            if (beforeSize > 0 && afterSize > 0) {
                next[beforeIdx] = beforeSize;
                next[afterIdx] = afterSize;
                groupRef.current.setLayout(next);
            }
        }

        dragRef.current = null;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => finishDrag(e, true);
    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => finishDrag(e, false);

    // ── Visuals ──────────────────────────────────────────────────────────────
    if (!isHorizontal && isMobile) {
        return (
            <div
                ref={handleElRef}
                role="separator"
                aria-orientation="horizontal"
                data-resize-handle-id={id}
                className="group relative w-full h-3 flex items-center justify-center cursor-row-resize bg-black active:bg-[#007acc]/20 touch-none select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
            >
                <div className="flex gap-1 pointer-events-none">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                </div>
            </div>
        );
    }

    return (
        <div
            ref={handleElRef}
            role="separator"
            aria-orientation={isHorizontal ? "vertical" : "horizontal"}
            data-resize-handle-id={id}
            className={`group relative z-[10001] pointer-events-auto bg-transparent hover:bg-[#007acc]/40 transition-colors duration-100 select-none touch-none ${
                isHorizontal ? "h-full w-[1px]  cursor-col-resize" : "w-full h-[1px] cursor-row-resize"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
        />
    );
}
