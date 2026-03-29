import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { CornerDownRight, Pencil, ArrowUpRight, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "../helpers/useOrchestratorContextMenu.helper";

export function ConversationMessageMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();

    const isReply: boolean = contextData?.isReply ?? false;

    return (
        <>
            {!isReply && (
                <MenuItem onClick={() => executeDirectly({ callback: contextData?.onReply })}>
                    <CornerDownRight className="w-4 h-4 mr-2" />
                    Reply
                </MenuItem>
            )}

            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onEdit })}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
            </MenuItem>

            {!isReply && (
                <MenuItem onClick={() => executeDirectly({ callback: contextData?.onPromote })}>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Promote to Topic
                </MenuItem>
            )}

            <MenuDivider />

            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onDelete })}>
                <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                <span className="text-destructive">Delete</span>
            </MenuItem>
        </>
    );
}
