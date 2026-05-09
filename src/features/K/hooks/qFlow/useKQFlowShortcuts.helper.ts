import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { useKStore } from "@/features/K/store/useK.store";
import { useGlobalShortcut } from "@/shared";
import type { KFlowClipboard } from "@/features/K/types/kContext.type";

interface UseKFlowShortcutsArgs {
    selectedEdgeIds: string[];
    selectedNodeIds: number[];
    selectedStringIds: string[];
    handleEdgeDelete: (id: string) => void;
    handleDeleteQuestion: (id: number) => void;
    handleOrganize: (ids: string[]) => void;
    lockSelection: (ids: string[]) => void;
    targetNodeId: number | null;
    handlePasteQuestions: (
        clipboard: KFlowClipboard,
        targetNodeId: number | null,
        cursorPos: { x: number; y: number },
    ) => void;
    editingNodeId: string | null;
}

export function useKQFlowShortcuts({
    selectedEdgeIds,
    selectedNodeIds,
    selectedStringIds,
    handleEdgeDelete,
    handleDeleteQuestion,
    handleOrganize,
    lockSelection,
    targetNodeId,
    handlePasteQuestions,
    editingNodeId,
}: UseKFlowShortcutsArgs) {
    const rfInstance = useReactFlow();
    const { kFlowClipboard, setKFlowClipboard } = useKStore();

    // Track cursor position for cursor-anchored paste
    const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    useEffect(() => {
        const handler = (e: MouseEvent) => { mousePosRef.current = { x: e.clientX, y: e.clientY }; };
        document.addEventListener("mousemove", handler);
        return () => document.removeEventListener("mousemove", handler);
    }, []);

    // Delete selected edges (higher priority so edge-only selections don't trigger node delete)
    useGlobalShortcut("delete", { id: "kflow-delete-edge", priority: 65, enabled: selectedEdgeIds.length > 0 && !editingNodeId }, () => {
        selectedEdgeIds.forEach((id) => handleEdgeDelete(id));
    });

    // Delete selected nodes — only fires when no edges are selected
    useGlobalShortcut("delete", { id: "kflow-delete-nodes", priority: 60, enabled: selectedNodeIds.length > 0 && selectedEdgeIds.length === 0 && !editingNodeId }, () => {
        selectedNodeIds.forEach((id) => handleDeleteQuestion(id));
    });

    // Ctrl+X — cut selected questions into the clipboard
    // lockSelection prevents ReactFlow from clearing the selection when the
    // keyboard event shifts DOM focus away from the canvas.
    useGlobalShortcut("ctrl+x", { id: "kflow-cut", priority: 60, enabled: selectedNodeIds.length > 0 && !editingNodeId }, () => {
        setKFlowClipboard({ questionIds: selectedNodeIds, sourceNodeId: targetNodeId });
        lockSelection(selectedNodeIds.map(String));
    });

    // Ctrl+V — paste clipboard questions at the current cursor position
    useGlobalShortcut("ctrl+v", { id: "kflow-paste", priority: 60, enabled: !!kFlowClipboard && !editingNodeId }, () => {
        if (!kFlowClipboard) return;
        const cursorFlowPos = rfInstance.screenToFlowPosition(mousePosRef.current);
        handlePasteQuestions(kFlowClipboard, targetNodeId, cursorFlowPos);
        setKFlowClipboard(null);
    });

    // Escape — cancel pending clipboard
    useGlobalShortcut("escape", { id: "kflow-cancel-cut", priority: 55, enabled: !!kFlowClipboard }, () => {
        setKFlowClipboard(null);
    });

    // Ctrl+O — organize selected nodes
    useGlobalShortcut("ctrl+o", { id: "kflow-organize", priority: 60, enabled: selectedStringIds.length >= 2 && !editingNodeId }, () => {
        handleOrganize(selectedStringIds);
    });
}
