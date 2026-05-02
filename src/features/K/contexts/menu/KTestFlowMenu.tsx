import React from "react";
import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Trash2 } from "lucide-react";
import { useMenuContext } from "@/shared";
import type { KTestFlowMenuData } from "@/shared";

export function KTestFlowMenu() {
    const { contextData, executeDirectly } = useMenuContext();
    const data = contextData as KTestFlowMenuData | null;

    const hasSelected = (data?.selectedIds?.length ?? 0) > 0;
    const selectedCount = data?.selectedIds?.length ?? 0;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: data?.onAddQuestion })}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
            </MenuItem>
            {hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: data?.onDeleteSelected })}>
                        <Trash2 className="w-4 h-4 mr-2 text-red-400" />
                        <span className="text-red-400">
                            Delete{selectedCount > 1 ? ` (${selectedCount})` : ""}
                        </span>
                    </MenuItem>
                </>
            )}
        </>
    );
}
