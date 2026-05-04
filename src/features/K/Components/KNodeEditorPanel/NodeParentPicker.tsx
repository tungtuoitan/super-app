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
        <div className="absolute left-0 top-full mt-1 z-20 w-full min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
                <span className="text-[11px] text-zinc-500 uppercase tracking-widest">Set parent</span>
                <button onClick={() => setParentPickerNodeId(null)} className="text-zinc-600 hover:text-zinc-300">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
                <button
                    onClick={() => handleSaveParent(parentPickerNodeId, null)}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors
                        ${currentParentId === null ? "text-zinc-200 bg-zinc-800" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
                >
                    — No parent (Level 1)
                </button>
                {eligible.map((n) => (
                    <button
                        key={n.id}
                        onClick={() => handleSaveParent(parentPickerNodeId, n.id)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors
                            ${currentParentId === n.id ? "text-zinc-200 bg-zinc-800" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
                    >
                        <span className="truncate">{n.name}</span>
                        {currentParentId === n.id && <Check className="w-3 h-3 ml-auto shrink-0 text-blue-400" />}
                    </button>
                ))}
            </div>
        </div>
    );
}
