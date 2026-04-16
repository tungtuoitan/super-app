import { PanelResizeHandle } from "react-resizable-panels";
import { useMobileStore } from "@/store/Mobile.store";

interface VSCodeResizeHandleProps {
    direction: "horizontal" | "vertical";
    id?: string;
}

export function VSCodeResizeHandle({ direction, id }: VSCodeResizeHandleProps) {
    const isHorizontal = direction === "horizontal";
    const { isMobile } = useMobileStore();

    if (!isHorizontal && isMobile) {
        // Mobile vertical handle: tall touch-friendly bar with grip dots
        return (
            <PanelResizeHandle id={id}>
                <div
                    role="separator"
                    aria-orientation="horizontal"
                    className="group relative w-full h-3 flex items-center justify-center cursor-row-resize bg-black active:bg-[#007acc]/20"
                >
                    <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40 group-active:bg-[#007acc]" />
                    </div>
                </div>
            </PanelResizeHandle>
        );
    }

    return (
        <PanelResizeHandle id={id}>
            <div
                role="separator"
                aria-orientation={isHorizontal ? "vertical" : "horizontal"}
                className={`group relative z-[10001] pointer-events-auto bg-transparent ${isHorizontal ? "h-full cursor-col-resize" : "w-full cursor-row-resize"}`}
            >
                <div
                    className={
                        `${isHorizontal ? "absolute inset-y-0 left-1/2 -translate-x-1/2 w-px" : "absolute inset-x-0 top-1/2 -translate-y-1/2 h-px"}` +
                        " bg-[hsl(var(--editor-border))] transition-colors duration-100 group-hover:bg-[#007acc] data-[resize-handle-active]:bg-[#007acc]"
                    }
                />
            </div>
        </PanelResizeHandle>
    );
}

/**
 * VS Code resize handle styles for reference:
 * - Default: transparent background
 * - Hover: #007acc (VS Code blue)
 * - Active (dragging): #007acc
 * - Width: 4px visual, 8px hit area
 * - Cursor: col-resize (horizontal) or row-resize (vertical)
 */
