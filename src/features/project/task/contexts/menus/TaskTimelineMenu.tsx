import { MenuItem, MenuHeader } from "@szhsin/react-menu";
import { Check } from "lucide-react";
import { useTaskTimelineMenuHelper } from "../helpers/useTaskTimelineMenu.helper";

export function TaskTimelineMenu() {
    const { statusOptions, currentStatus, isEditable, changeStatus } = useTaskTimelineMenuHelper();

    return (
        <>
            <MenuHeader>Status</MenuHeader>
            {statusOptions.map((opt) => {
                const isCurrent = opt.code === currentStatus;
                return (
                    <MenuItem key={opt.code} onClick={() => changeStatus(opt.code)} disabled={!isEditable || isCurrent}>
                        <span className="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: opt.color }} />
                        <span className="flex-1">{opt.label}</span>
                        {isCurrent && <Check className="w-4 h-4 ml-3" />}
                    </MenuItem>
                );
            })}
        </>
    );
}
