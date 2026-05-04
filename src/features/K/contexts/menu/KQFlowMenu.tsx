import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Grid2X2, Plus, Trash2 } from "lucide-react";
import { useMenuContext, useMenuContextHelper } from "@/shared";

export function KQFlowMenu() {
    const { contextData } = useMenuContext();
    const { executeDirectly } = useMenuContextHelper();

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
                    {contextData.selectedIds.length >= 2 && contextData?.onOrganize && (
                        <MenuItem onClick={() => executeDirectly({ callback: contextData?.onOrganize })}>
                            <Grid2X2 className="w-4 h-4 mr-2" />
                            Organize ({contextData.selectedIds.length})
                        </MenuItem>
                    )}
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
