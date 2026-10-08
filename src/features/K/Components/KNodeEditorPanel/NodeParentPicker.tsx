import { X, Check } from "lucide-react";
import { useKNodeEditorStore } from "../../store/useKNodeEditor.store";
import { useKNodeEditorLoader } from "../../hooks/useKNodeEditor.loader";
import { isAncestorNode } from "../../hooks/kNodeEditor.miniHelper";

export function NodeParentPicker() {
    const { parentPickerNodeId, setParentPickerNodeId } = useKNodeEditorStore();
    const { allNodes, handleSaveParent } = useKNodeEditorLoader();

    if (parentPickerNodeId === null) return null;

    const currentNode = allNodes.find((n) => n.id === parentPickerNodeId);
    const currentParentId = currentNode?.parentId ?? null;

    const eligible = allNodes.filter(
        (n) => n.id !== parentPickerNodeId && !isAncestorNode(n.id, parentPickerNodeId, allNodes)
    );

    return (
        <div className="absolute left-0 top-full mt-1 z-20 w-full min-w-[200px] bg-popover border border-sa-border-strong rounded-lg sa-shadow-pop overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-sa-border">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Set parent</span>
                <button onClick={() => setParentPickerNodeId(null)} className="rounded-md p-0.5 text-muted-foreground hover:bg-sa-hover hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
                <button
                    onClick={() => handleSaveParent(parentPickerNodeId, null)}
                    className={`w-full text-left px-3 h-7 text-[13px] transition-colors duration-100
                        ${currentParentId === null ? "text-foreground bg-sa-hover-strong" : "text-muted-foreground hover:bg-sa-hover hover:text-foreground"}`}
                >
                    — No parent (Level 1)
                </button>
                {eligible.map((n) => (
                    <button
                        key={n.id}
                        onClick={() => handleSaveParent(parentPickerNodeId, n.id)}
                        className={`w-full text-left px-3 h-7 text-[13px] flex items-center gap-2 transition-colors duration-100
                            ${currentParentId === n.id ? "text-foreground bg-sa-hover-strong" : "text-muted-foreground hover:bg-sa-hover hover:text-foreground"}`}
                    >
                        <span className="truncate">{n.name}</span>
                        {currentParentId === n.id && <Check className="w-3 h-3 ml-auto shrink-0 text-sa-amber" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
