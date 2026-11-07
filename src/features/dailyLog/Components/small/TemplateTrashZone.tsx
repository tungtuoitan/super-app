import { useRef } from "react";
import { Trash2 } from "lucide-react";
import { useDrop } from "react-dnd";
import type { DropTargetMonitor } from "react-dnd";
import { DRAG_TYPE } from "../../dailyLogTemplate.constants";
import type { DailyLogSection } from "../../types/dailyLog.types";
import type { FieldDragItem } from "../../types/dailyLogTemplate.types";

interface TrashZoneProps {
    section: DailyLogSection;
    onDrop: (visibleIdx: number) => void;
}

export function TrashZone({ section, onDrop }: TrashZoneProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [{ isOver }, drop] = useDrop<FieldDragItem, void, { isOver: boolean }>({
        accept: DRAG_TYPE,
        canDrop: (item) => item.section === section,
        drop: (item) => onDrop(item.visibleIdx),
        collect: (m: DropTargetMonitor) => ({ isOver: m.isOver() && m.canDrop() }),
    });
    drop(ref);

    return (
        <div
            ref={ref}
            className={`mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-[13px] transition-colors duration-100 ${
                isOver
                    ? "border-sa-danger/50 bg-sa-danger/10 text-sa-danger"
                    : "border-sa-border text-muted-foreground/50"
            }`}
        >
            <Trash2 className="w-3 h-3" />
            <span>Drop to remove</span>
        </div>
    );
}
