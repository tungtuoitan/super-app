import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import { useOrchestratorContextMenuStore } from "@/store/ContextMenu.store";

export function KTestFlowMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly } = useOrchestratorContextMenuHelper();

    const hasSelected = !!(contextData?.selectedIds?.length);

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAddQuestion })}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
            </MenuItem>
            {hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: contextData?.onDeleteSelected })}>
                        <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                        <span className="text-red-400">
                            Delete{contextData.selectedIds.length > 1 ? ` (${contextData.selectedIds.length})` : ""}
                        </span>
                    </MenuItem>
                </>
            )}
        </>
    );
}
