/**
 * useTaskFlowViewControls — view navigation for the Task Flow canvas.
 * F1: toggle focusClose / birdEye, F2: back to center, minimap toggle.
 */

import { useRef, useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useMultiProjectTaskFlowSelector } from "../../Selectors/useMultiProjectTaskFlow.selector";
import { NODE_WIDTH, NODE_HEIGHT } from "../../utils/multiProjectTaskFlow.utils";
import { MIN_ZOOM, MAX_ZOOM } from "../../utils/multiProjectTaskFlow.constants";

type ViewMode = "focusClose" | "birdEye";

export const useTaskFlowViewControlsHelper = (containerRef: React.RefObject<HTMLDivElement>) => {
    const { flowNodes } = useMultiProjectTaskFlowSelector();
    const rfInstance = useReactFlow();
    const dynMinZoomRef = useRef(MIN_ZOOM);
    const inProgressIndexRef = useRef(0);
    const [viewMode, setViewMode] = useState<ViewMode>("focusClose");
    const [showMiniMap, setShowMiniMap] = useState(false);

    const getActiveNodes = () => {
        return flowNodes.filter((n) => {
            const status = (n.data as { task?: { status: string } }).task?.status;
            return status === "in_progress" || status === "background_progress";
        });
    };

    const handleFocusClose = () => {
        const activeNodes = getActiveNodes();
        if (activeNodes.length === 0) {
            rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
            setTimeout(() => {
                const { zoom } = rfInstance.getViewport();
                dynMinZoomRef.current = Math.max(MIN_ZOOM, zoom);
            }, 320);
            setViewMode("focusClose");
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of activeNodes) {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + NODE_WIDTH);
            maxY = Math.max(maxY, n.position.y + NODE_HEIGHT);
        }
        const cW = containerRef.current?.clientWidth ?? 800;
        const cH = containerRef.current?.clientHeight ?? 600;
        const boxW = maxX - minX;
        const boxH = maxY - minY;
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const targetSide = (7 / 12) * cW;
        const zoomX = boxW > 0 ? targetSide / boxW : 2;
        const zoomY = boxH > 0 ? Math.min(targetSide, cH * (7 / 12)) / boxH : 2;
        const zoom = Math.min(zoomX, zoomY, MAX_ZOOM);
        rfInstance.setViewport({ x: cW / 2 - centerX * zoom, y: cH / 2 - centerY * zoom, zoom }, { duration: 300 });
        setViewMode("focusClose");
    };

    const handleBirdEye = () => {
        const activeNodes = getActiveNodes();
        if (flowNodes.length === 0) { setViewMode("birdEye"); return; }

        let allMinX = Infinity, allMinY = Infinity, allMaxX = -Infinity, allMaxY = -Infinity;
        for (const n of flowNodes) {
            allMinX = Math.min(allMinX, n.position.x);
            allMinY = Math.min(allMinY, n.position.y);
            allMaxX = Math.max(allMaxX, n.position.x + NODE_WIDTH);
            allMaxY = Math.max(allMaxY, n.position.y + NODE_HEIGHT);
        }
        const cW = containerRef.current?.clientWidth ?? 800;
        const cH = containerRef.current?.clientHeight ?? 600;
        const allW = allMaxX - allMinX;
        const allH = allMaxY - allMinY;
        const padding = 0.15;
        const fitZoom = Math.min(
            allW > 0 ? cW * (1 - padding * 2) / allW : 1,
            allH > 0 ? cH * (1 - padding * 2) / allH : 1,
            MAX_ZOOM,
        );

        let cx: number, cy: number;
        if (activeNodes.length > 0) {
            let aMinX = Infinity, aMinY = Infinity, aMaxX = -Infinity, aMaxY = -Infinity;
            for (const n of activeNodes) {
                aMinX = Math.min(aMinX, n.position.x); aMinY = Math.min(aMinY, n.position.y);
                aMaxX = Math.max(aMaxX, n.position.x + NODE_WIDTH); aMaxY = Math.max(aMaxY, n.position.y + NODE_HEIGHT);
            }
            cx = (aMinX + aMaxX) / 2; cy = (aMinY + aMaxY) / 2;
        } else {
            cx = (allMinX + allMaxX) / 2; cy = (allMinY + allMaxY) / 2;
        }

        rfInstance.setViewport({ x: cW / 2 - cx * fitZoom, y: cH / 2 - cy * fitZoom, zoom: fitZoom }, { duration: 300 });
        setTimeout(() => { dynMinZoomRef.current = Math.max(MIN_ZOOM, fitZoom); }, 320);
        setViewMode("birdEye");
    };

    const handleBackToCenter = () => {
        const activeNodes = getActiveNodes();
        if (activeNodes.length === 0) {
            rfInstance.fitView({ padding: 0.15, maxZoom: 1, duration: 300 });
            setTimeout(() => {
                const { zoom } = rfInstance.getViewport();
                dynMinZoomRef.current = Math.max(MIN_ZOOM, zoom);
            }, 320);
            return;
        }
        const idx = inProgressIndexRef.current % activeNodes.length;
        inProgressIndexRef.current = idx + 1;
        const node = activeNodes[idx];
        rfInstance.setCenter(node.position.x + 115, node.position.y + 38, { zoom: 1, duration: 300 });
    };

    const handleF1Toggle = () => {
        if (viewMode === "focusClose") handleBirdEye();
        else handleFocusClose();
    };

    const handleF1ToggleRef = useRef(handleF1Toggle);
    handleF1ToggleRef.current = handleF1Toggle;
    const handleBackToCenterRef = useRef(handleBackToCenter);
    handleBackToCenterRef.current = handleBackToCenter;

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA") return;
            if (e.key === "F1") { e.preventDefault(); handleF1ToggleRef.current(); }
            if (e.key === "F2") { e.preventDefault(); handleBackToCenterRef.current(); }
            if (e.key === "F3") { e.preventDefault(); setShowMiniMap((v) => !v); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    return {
        viewMode,
        showMiniMap,
        setShowMiniMap,
        dynMinZoomRef,
        handleFocusClose,
        handleBirdEye,
        handleBackToCenter,
        handleF1Toggle,
    };
};
