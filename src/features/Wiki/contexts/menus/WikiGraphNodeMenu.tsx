import { MenuItem } from "@szhsin/react-menu";
import { Trash2 } from "lucide-react";
import { useMenuContext, useMenuContextHelper } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";

export function WikiGraphNodeMenu() {
    const { contextData } = useMenuContext();
    const { setIsMenuContextOpen } = useMenuContextHelper();
    const { showConfirmation }                  = useConfirmationPopoverHelper();

    const name = contextData?.keyword?.name ?? "this keyword";

    const handleDelete = (e: any) => {
        setIsMenuContextOpen(false);
        const anchor = ((e.syntheticEvent ?? e) as MouseEvent).target as HTMLElement;
        showConfirmation({
            anchorEl:     anchor,
            title:        `Delete "${name}"?`,
            subtitle:     "This keyword and all its info links will be permanently removed.",
            confirmText:  "Delete",
            cancelText:   "Cancel",
            confirmColor: "destructive",
            zIndex:       20000,
            onConfirm:    () => contextData?.onDelete?.(),
        });
    };

    return (
        <MenuItem onClick={handleDelete} className="text-red-500">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete "{name}"
        </MenuItem>
    );
}
