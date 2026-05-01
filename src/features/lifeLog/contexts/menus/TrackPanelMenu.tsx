import { MenuItem, MenuDivider } from "@szhsin/react-menu";
import { Pencil, Trash2 } from "lucide-react";
import { useMenuContext } from "@/shared";
import { useMenuContextHelper } from "@/shared";

export function TrackPanelMenu() {
    const { contextData } = useMenuContext();
    const { executeDirectly } = useMenuContextHelper();

    return (
        <>
            <MenuItem onClick={() => executeDirectly({ callback: contextData?.onEdit })}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
            </MenuItem>
            <MenuDivider />
            <MenuItem
                onClick={() => executeDirectly({ callback: contextData?.onDelete })}
                className="text-red-500"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
            </MenuItem>
        </>
    );
}
