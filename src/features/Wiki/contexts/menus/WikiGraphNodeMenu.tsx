import { MenuItem } from "@szhsin/react-menu";
import { Trash2 } from "lucide-react";
import { useOrchestratorContextMenuStore } from "@/shared";
import { useConfirmationPopoverHelper } from "@/shared";

export function WikiGraphNodeMenu() {
    const { contextData, setIsContextMenuOpen } = useOrchestratorContextMenuStore();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctxData = contextData as any;
    const { showConfirmation }                  = useConfirmationPopoverHelper();

    const name = ctxData?.keyword?.name ?? "this keyword";

    const handleDelete = (e: any) => {
        setIsContextMenuOpen(false);
        const anchor = ((e.syntheticEvent ?? e) as MouseEvent).target as HTMLElement;
        showConfirmation({
            anchorEl:     anchor,
            title:        `Delete "${name}"?`,
            subtitle:     "This keyword and all its info links will be permanently removed.",
            confirmText:  "Delete",
            cancelText:   "Cancel",
            confirmColor: "destructive",
            zIndex:       20000,
            onConfirm:    () => ctxData?.onDelete?.(),
        });
    };

    return (
        <MenuItem onClick={handleDelete} className="text-red-500">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete "{name}"
        </MenuItem>
    );
}
