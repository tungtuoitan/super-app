import { useEffect } from "react";
import { useKTestFlowStore } from "@/features/K/store/useKTestFlow.store";
import type { KTestQuestion } from "@/features/K/types/kTest.type";
import type { QuestionFlowNodeData, KFlowEdgeData } from "@/features/K/types/kTestFlow.type";
import type { Edge, Node } from "@xyflow/react";
import { flowService } from "@/shared";
import {FlowEdgeDTO, FlowNodePositionDTO} from "@/shared";

const QUESTION_NODE_WIDTH = 260;
const NODE_HEIGHT = 160;
const COL_COUNT = 4;
const H_GAP = 40;
const V_GAP = 60;

function buildGridPosition(index: number): { x: number; y: number } {
    const col = index % COL_COUNT;
    const row = Math.floor(index / COL_COUNT);
    return {
        x: col * (QUESTION_NODE_WIDTH + H_GAP),
        y: row * (NODE_HEIGHT + V_GAP),
    };
}

export function useKTestFlowHeadless(selectedTestId: number | null, questions: KTestQuestion[], showDeleted: boolean) {
    const {
        setFlowNodes, setFlowEdges, setSavedEdges,
        savedPositions, setSavedPositions,
        positionsLoaded, setPositionsLoaded,
    } = useKTestFlowStore();

    // Stable key derived from current question IDs — changes only when the question set changes
    const questionIdsKey = questions.map(q => q.id).join(",");

    // Reset immediately when the selected test changes
    useEffect(() => {
        setFlowNodes([]);
        setFlowEdges([]);
        setSavedEdges([]);
        setSavedPositions({});
        setPositionsLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTestId]);

    // Load positions + edges only after questions for this test are available
    useEffect(() => {
        if (!selectedTestId || !questionIdsKey) return;

        setPositionsLoaded(false);
        setSavedPositions({});
        setSavedEdges([]);

        let cancelled = false;
        const questionIds = questions.map(q => q.id);

        Promise.all([
            flowService._getEdges(""),
            flowService._getPositions("", { nodeType: "kQuestion", nodeIds: questionIds.join(",") }),
        ]).then(([edgeRes, posRes]) => {
            if (cancelled) return;

            const posDtos: FlowNodePositionDTO[] = (posRes.data as FlowNodePositionDTO[]) ?? [];
            const edgeDtos: FlowEdgeDTO[] = (edgeRes.data as FlowEdgeDTO[]) ?? [];

            const positions: Record<string, { x: number; y: number }> = {};
            for (const p of posDtos) {
                positions[String(p.nodeId)] = { x: p.x, y: p.y };
            }
            setSavedPositions(positions);

            const qIdSet = new Set(questionIds.map(String));
            const customEdges: Edge<KFlowEdgeData>[] = edgeDtos
                .filter(e => e.sourceType === "kQuestion" && e.targetType === "kQuestion" && qIdSet.has(String(e.sourceId)) && qIdSet.has(String(e.targetId)))
                .map(e => ({
                    id: `custom-${e.id}`,
                    source: String(e.sourceId),
                    target: String(e.targetId),
                    sourceHandle: e.sourceHandle,
                    targetHandle: e.targetHandle,
                    type: "kQuestionEdge",
                    data: { edgeId: e.id, note: e.note, arrowDirection: e.arrowDirection ?? "forward" },
                }));

            setSavedEdges(customEdges);
            setFlowEdges(customEdges);
            setPositionsLoaded(true);
        }).catch(() => {
            if (!cancelled) setPositionsLoaded(true);
        });

        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTestId, questionIdsKey]);

    // Rebuild nodes whenever questions, positions or visibility changes
    useEffect(() => {
        if (!positionsLoaded) return;

        const visibleQuestions = showDeleted ? questions : questions.filter(q => !q.deletedAt);
        const nodes: Node<QuestionFlowNodeData>[] = visibleQuestions.map((q, i) => ({
            id: String(q.id),
            type: "questionFlowNode",
            position: savedPositions[String(q.id)] ?? buildGridPosition(i),
            data: { question: q },
        }));

        setFlowNodes(nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questions, savedPositions, positionsLoaded, showDeleted]);
}
