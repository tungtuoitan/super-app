import { useConfirmationPopoverHelper, useDeviceStore } from "@/shared";
import { getGenericConfirmMessage } from "../confirmPopover/confirmMessage.utils";
import {MenuContextType, useMenuContextStore} from "./MenuContext.store";

interface OpenConfirmDialogParams {
    type: "soft-delete" | "hard-delete";
    entityType: "note" | "workspace" | "folder" | "task";
    count: number;
    allAreTempItems: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onConfirm?: (...args: any[]) => any;
    event: any;
}

interface ExecuteDirectlyParams {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    callback?: (...args: any[]) => any;
}

export const useMenuContextHelper = () => {
    const { showConfirmation } = useConfirmationPopoverHelper();
    const { setIsMenuContextOpen, setAnchorPoint, setContextType, setContextData } = useMenuContextStore();
    const { isMobile } = useDeviceStore();

    const openConfirmDialog = ({ type, entityType, count, allAreTempItems, onConfirm, event }: OpenConfirmDialogParams) => {
        setIsMenuContextOpen(false);

        if (allAreTempItems) {
            onConfirm?.();
            return;
        }

        const nativeEvent = event.syntheticEvent || event;
        const anchorElement = nativeEvent?.target as HTMLElement;
        const isMultiple = count > 1;
        const confirmMsg = getGenericConfirmMessage({ type, entityType, count, isMultiple });
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
            onConfirm: () => onConfirm?.(),
        });
    };

    const executeDirectly = ({ callback }: ExecuteDirectlyParams) => {
        setIsMenuContextOpen(false);
        callback?.();
    };

    const showContextMenu = (event: React.MouseEvent, type: MenuContextType = "default", data?: unknown) => {
        event.preventDefault();
        event.stopPropagation();
        if (isMobile) return;
        setAnchorPoint({ x: event.clientX, y: event.clientY });
        setContextType(type);
        setContextData(data || null);
        setIsMenuContextOpen(true);
    };

    return {
        openConfirmDialog,
        executeDirectly,
        showContextMenu,
        setIsMenuContextOpen
    };
};
