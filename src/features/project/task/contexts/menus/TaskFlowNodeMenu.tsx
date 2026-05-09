import { MenuItem } from "@szhsin/react-menu";
import { Trash2 } from "lucide-react";
import { useTaskFlowNodeMenuHelper } from "@/features/multiProject";

export function TaskFlowNodeMenu() {
    const { permanentlyDelete, isLocked } = useTaskFlowNodeMenuHelper();

    return (
        <MenuItem onClick={permanentlyDelete} disabled={isLocked}>
            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
            <span className="text-destructive">Permanently Delete</span>
        </MenuItem>
    );
}
