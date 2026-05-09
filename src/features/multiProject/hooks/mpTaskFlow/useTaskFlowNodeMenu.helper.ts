import { useMenuContext, useConfirmationPopoverHelper } from "@/shared";

interface TaskFlowNodeMenuData {
    nodeId: string;
    selectedNodeIds: string[];
    onDeleteNodes: (nodeIds: string[]) => void;
    isLocked: boolean;
}

export const useTaskFlowNodeMenuHelper = () => {
    const { contextData } = useMenuContext();
    const { showConfirmation } = useConfirmationPopoverHelper();

    const data = contextData as TaskFlowNodeMenuData | null;
    const isLocked = data?.isLocked ?? false;

    const permanentlyDelete = () => {
        if (!data?.nodeId || isLocked) return;

        const targetIds = data.selectedNodeIds?.includes(data.nodeId)
            ? data.selectedNodeIds
            : [data.nodeId];

        const count = targetIds.length;
        showConfirmation({
            title: `Permanently delete ${count} task${count > 1 ? "s" : ""}?`,
            subtitle: "This action cannot be undone.",
            confirmText: "Delete",
            confirmColor: "destructive",
            onConfirm: () => data.onDeleteNodes?.(targetIds),
        });
    };

    return { permanentlyDelete, isLocked };
};
