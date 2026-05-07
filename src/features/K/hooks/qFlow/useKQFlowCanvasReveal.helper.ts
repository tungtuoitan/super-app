import { useEffect, useLayoutEffect, useState } from "react";
import { useReactFlow, useNodesInitialized } from "@xyflow/react";
import { useKStore } from "@/features/K/store/useK.store";

interface UseKFlowCanvasRevealArgs {
    nodeId: number;
    loading: boolean;
    questionsLength: number;
    storeNodesLength: number;
    positionsLoaded: boolean;
}

export function useKQFlowCanvasReveal({
    nodeId,
    loading,
    questionsLength,
    storeNodesLength,
    positionsLoaded,
}: UseKFlowCanvasRevealArgs) {
    const [hasFitView, setHasFitView] = useState(false);
    const [isCanvasReady, setIsCanvasReady] = useState(false);
    const rfInstance = useReactFlow();
    const nodesInitialized = useNodesInitialized();
    const { kFlowViewportMap } = useKStore();

    // WHY useLayoutEffect: fires synchronously after DOM commit but BEFORE paint,
    // ensuring the overlay is opaque on the very first frame the new nodeId renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useLayoutEffect(() => { setIsCanvasReady(false); }, [nodeId]);

    // Restore saved viewport AFTER paint (overlay is already opaque by this point).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        const saved = kFlowViewportMap[nodeId];
        if (saved) {
            setHasFitView(true);
            requestAnimationFrame(() => rfInstance.setViewport(saved));
        } else {
            setHasFitView(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    // Lift overlay only when: data loaded + positions loaded + nodes measured (or canvas empty)
    useEffect(() => {
        if (loading) return;
        if (!positionsLoaded) return;

        if (storeNodesLength === 0) {
            // Reveal immediately only when canvas is genuinely empty.
            // If questions exist, the rebuild effect hasn't populated storeNodes yet — wait.
            if (questionsLength === 0) setIsCanvasReady(true);
            return;
        }

        if (!nodesInitialized) return;

        if (!hasFitView) {
            setHasFitView(true);
            rfInstance.fitView({ padding: 0.2, duration: 0 });
            requestAnimationFrame(() => setIsCanvasReady(true));
        } else {
            setIsCanvasReady(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, positionsLoaded, storeNodesLength, questionsLength, nodesInitialized, hasFitView, rfInstance]);

    return { isCanvasReady };
}
