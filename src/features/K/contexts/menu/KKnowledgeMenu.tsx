import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useMenuContext } from "@/shared";
import type { KKnowledgeSelectorMenuData } from "@/shared";

export function KKnowledgeMenu() {
    const { contextData, executeDirectly, openConfirmDialog } = useMenuContext();
    const data = contextData as KKnowledgeSelectorMenuData | null;

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: data?.onAdd })}>
                <Plus className="w-4 h-4 mr-2" />
                New Knowledge
            </MenuItem>

            {data?.hasSelected && (
                <>
                    <MenuDivider />
                    <MenuItem onClick={() => executeDirectly({ callback: data?.onEdit })}>
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
                                onConfirm: data?.onDelete,
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
