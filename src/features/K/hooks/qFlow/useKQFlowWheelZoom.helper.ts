import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import type { Viewport } from "@xyflow/react";
import { useKStore } from "@/features/K/store/useK.store";

const PAN_SPEED = 0.8;

export function useKQFlowWheelZoom(
    containerRef: React.RefObject<HTMLDivElement>,
    knowledgeId: number,
) {
    const rfInstance = useReactFlow();
    const { setKFlowViewportMap } = useKStore();
    const saveViewportTimer = useRef<ReturnType<typeof setTimeout>>();

    const saveViewport = (vp: { x: number; y: number; zoom: number }) => {
        clearTimeout(saveViewportTimer.current);
        saveViewportTimer.current = setTimeout(() => {
            setKFlowViewportMap((prev) => ({ ...prev, [knowledgeId]: vp }));
        }, 250);
    };

    const handleMoveEnd = (_: unknown, viewport: Viewport) => {
        setKFlowViewportMap((prev) => ({ ...prev, [knowledgeId]: viewport }));
    };

    // Custom wheel handler:
    //   scroll        → pan vertically
    //   Shift+scroll  → pan horizontally
    //   Ctrl+scroll   → zoom toward cursor (cursor-anchored)
    // Attached at capture phase on document so it intercepts before ReactFlow.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!el.contains(e.target as HTMLElement)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const { x, y, zoom } = rfInstance.getViewport();
            let newVp: { x: number; y: number; zoom: number };
            if (e.ctrlKey) {
                // Zoom anchored to the cursor
                const factor = e.deltaY > 0 ? 0.716 : 1.360; // ~4× faster than default
                const newZoom = Math.min(Math.max(zoom * factor, 0.15), 2);
                const rect = el.getBoundingClientRect();
                const cx = e.clientX - rect.left;
                const cy = e.clientY - rect.top;
                newVp = {
                    x: cx - (cx - x) * (newZoom / zoom),
                    y: cy - (cy - y) * (newZoom / zoom),
                    zoom: newZoom,
                };
            } else if (e.shiftKey) {
                newVp = { x: x - e.deltaY * PAN_SPEED, y, zoom };
            } else {
                newVp = { x, y: y - e.deltaY * PAN_SPEED, zoom };
            }
            rfInstance.setViewport(newVp);
            saveViewport(newVp);
        };
        document.addEventListener("wheel", onWheel, { passive: false, capture: true });
        return () => document.removeEventListener("wheel", onWheel, { capture: true } as EventListenerOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rfInstance]);

    return { handleMoveEnd };
}
