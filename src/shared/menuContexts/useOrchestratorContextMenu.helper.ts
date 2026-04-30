import { useConfirmationPopoverHelper } from "@/shared";
import { OrchestratorContextMenuType, useOrchestratorContextMenuStore } from "@/shared";
import { getConfirmMessage } from "../confirmPopover/confirmation-message.utils";

interface OpenConfirmDialogParams {
    type: "soft-delete" | "hard-delete";
    entityType: "note" | "workspace" | "folder" | "task";
    count: number;
    allAreTempItems: boolean;
    onConfirm: () => void;
    event: any;
}

interface ExecuteDirectlyParams {
    callback: () => void;
}

export const useOrchestratorContextMenuHelper = () => {
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { setIsContextMenuOpen, setAnchorPoint, setContextType, setContextData } = useOrchestratorContextMenuStore();

    const openConfirmDialog = ({ type, entityType, count, allAreTempItems, onConfirm, event }: OpenConfirmDialogParams) => {
        setIsContextMenuOpen(false);

        if (allAreTempItems) {
            onConfirm();
            return;
        }

        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;
        const isMultiple = count > 1;
        const confirmMsg = getConfirmMessage({ type, entityType, count, isMultiple });
        const confirmText = type === "hard-delete" ? "Delete Permanently" : "Delete";

        showConfirmation({
            anchorEl: anchorElement,
            title: confirmMsg.title,
            subtitle: confirmMsg.subtitle,
            confirmText,
            cancelText: "Cancel",
            confirmColor: "destructive",
            buttonVariant: "default",
            zIndex: 20000,
            onConfirm,
        });
    };

    const executeDirectly = ({ callback }: ExecuteDirectlyParams) => {
        setIsContextMenuOpen(false);
        callback();
    };

    const showContextMenu = (event: React.MouseEvent, type: OrchestratorContextMenuType = "default", data?: any) => {
        event.preventDefault();
        event.stopPropagation();
        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType(type);
        setContextData(data || null);
        setIsContextMenuOpen(true);
    };

    return {
        openConfirmDialog,
        executeDirectly,
        showContextMenu,
    };
};
