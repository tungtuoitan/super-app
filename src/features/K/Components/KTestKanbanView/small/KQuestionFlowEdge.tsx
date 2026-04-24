import { useCallback, useEffect } from "react";
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from "@xyflow/react";
import type { EdgeProps, Edge } from "@xyflow/react";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import { useKTestFlowHelper } from "@/features/K/hooks/useKTestFlow.helper";
import type { KFlowEdgeData, ArrowDirection } from "@/features/K/types/kTestFlow.type";

const FLOW_DASH = "10 6";
const FLOW_PERIOD = 16;
const ARROW_CYCLE: ArrowDirection[] = ["forward", "backward", "both"];
const ARROW_SYMBOL: Record<ArrowDirection, string> = { forward: "→", backward: "←", both: "↔" };

export function KQuestionFlowEdge({
    id, source, target,
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data, selected,
}: EdgeProps<Edge<KFlowEdgeData>>) {
    const { flowEdges } = useKTestFlowStore();
    const { handleEdgeDelete, handleEdgeToggleDirection } = useKTestFlowHelper();

    const edgeData = data as KFlowEdgeData | undefined;
    const currentArrow = edgeData?.arrowDirection ?? "forward";

    const anyEdgeSelected = flowEdges.some((e) => e.selected);
    const hitWidth = selected ? 20 : anyEdgeSelected ? 0 : 20;

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
    });

    const strokeColor = selected ? "hsl(var(--primary))" : "#6b7280cc";
    const strokeWidth = selected ? 2.2 : 1.8;
    const speed = selected ? 0.5 : 0.9;
    const animFwd = `flow-fwd-kq ${speed}s linear infinite`;
    const animBwd = `flow-bwd-kq ${speed}s linear infinite`;

    // Delete on key
    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") handleEdgeDelete(id);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [selected, id, handleEdgeDelete]);

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const idx = ARROW_CYCLE.indexOf(currentArrow);
        handleEdgeToggleDirection(id, ARROW_CYCLE[(idx + 1) % ARROW_CYCLE.length]);
    }, [id, currentArrow, handleEdgeToggleDirection]);

    const handleDeleteClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        handleEdgeDelete(id);
    }, [id, handleEdgeDelete]);

    return (
        <>
            <defs>
                <style>{`
                    @keyframes flow-fwd-kq { from { stroke-dashoffset: ${FLOW_PERIOD}; } to { stroke-dashoffset: 0; } }
                    @keyframes flow-bwd-kq { from { stroke-dashoffset: 0; } to { stroke-dashoffset: ${FLOW_PERIOD}; } }
                    .react-flow__edge.selected .react-flow__edgeupdater {
                        fill: hsl(var(--primary));
                        stroke: hsl(var(--background));
                        stroke-width: 2.5;
                        r: 8;
                        cursor: crosshair;
                    }
                    .react-flow__edge.selected .react-flow__edgeupdater:hover {
                        fill: hsl(var(--primary) / 0.8);
                        r: 10;
                    }
                `}</style>
            </defs>

            {/* Static track */}
            <BaseEdge
                id={`${id}-track`}
                path={edgePath}
                interactionWidth={hitWidth}
                style={{ stroke: strokeColor, strokeWidth, strokeDasharray: FLOW_DASH, opacity: 0.25 }}
            />

            {/* Animated forward */}
            {(currentArrow === "forward" || currentArrow === "both") && (
                <BaseEdge
                    id={`${id}-fwd`}
                    path={edgePath}
                    interactionWidth={0}
                    style={{ stroke: strokeColor, strokeWidth, strokeDasharray: FLOW_DASH, animation: animFwd }}
                />
            )}

            {/* Animated backward */}
            {(currentArrow === "backward" || currentArrow === "both") && (
                <BaseEdge
                    id={`${id}-bwd`}
                    path={edgePath}
                    interactionWidth={0}
                    style={{
                        stroke: strokeColor,
                        strokeWidth: currentArrow === "both" ? strokeWidth * 0.7 : strokeWidth,
                        strokeDasharray: FLOW_DASH,
                        animation: animBwd,
                        opacity: currentArrow === "both" ? 0.6 : 1,
                    }}
                />
            )}

            {selected && (
                <EdgeLabelRenderer>
                    {/* Direction toggle — above midpoint */}
                    <div
                        style={{ position: "absolute", transform: `translate(-50%, -100%) translate(${labelX}px, ${labelY - 6}px)`, pointerEvents: "all" }}
                        className="nodrag nopan"
                    >
                        <button
                            onClick={handleToggle}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-lg hover:bg-primary/80 active:scale-95 transition-all border border-primary/30"
                        >
                            <span className="text-sm leading-none">{ARROW_SYMBOL[currentArrow]}</span>
                        </button>
                    </div>

                    {/* Delete — below midpoint */}
                    <div
                        style={{ position: "absolute", transform: `translate(-50%, 0%) translate(${labelX}px, ${labelY + 6}px)`, pointerEvents: "all" }}
                        className="nodrag nopan"
                    >
                        <button
                            onClick={handleDeleteClick}
                            className="flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-400 hover:text-red-400 hover:border-red-600 transition-colors shadow-md text-xs"
                        >
                            ×
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
