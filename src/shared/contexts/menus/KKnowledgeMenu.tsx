import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/store/contextMenu/ContextMenu.store";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";

/**
 * KKnowledgeMenu
 * Right-click context menu on the knowledge selector in KView
 *
 * contextData shape:
 *   onAdd:    () => void  — opens a new knowledge tab
 *   onEdit:   () => void  — opens the current knowledge tab for editing
 *   onDelete: () => void  — soft-deletes the current knowledge
 *   hasSelected: boolean  — whether a knowledge is currently selected
 */
export function KKnowledgeMenu() {
    const { contextData } = useOrchestratorContextMenuStore();
    const { executeDirectly, openConfirmDialog } = useOrchestratorContextMenuHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onAdd })}>
                <Plus className="w-4 h-4 mr-2" />
                New Knowledge
            </MenuItem>

            {contextData?.hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: contextData?.onEdit })}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Open Knowledge
                    </MenuItem>
                    <MenuItem
                        onClick={(e) =>
                            openConfirmDialog({
                                type: "soft-delete",
                                entityType: "workspace",
                                count: 1,
                                allAreTempItems: false,
                                onConfirm: contextData?.onDelete,
                                event: e,
                            })
                        }
                        className="text-red-500"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </MenuItem>
                </>
            )}
        </>
    );
}
