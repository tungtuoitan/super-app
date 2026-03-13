import { useState, useRef, useEffect } from "react";import { useDrag, useDrop } from "react-dnd";
import { Trash2, GitBranch, LibraryBig, Library, RotateCcw } from "lucide-react";
import type { KItemV2 } from "../../types/K-v2.types";
import { useKNodeEditorStore } from "../../store/KNodeEditor.store";
import { useKNodeEditorLoader } from "../../hooks/useKNodeEditor.loader";
import { useKStore } from "../../store/K.store";
import { DND_TYPE, CARD_HEIGHT, isAncestorNode } from "../../hooks/kNodeEditor.miniHelper";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import type { IconType } from "../../shared/icons/icon.types";
import { ICON_MAP } from "../../shared/icons/icon.config";
import { IconPicker } from "@/shared/components/ui/IconPicker";
import { useOrchestratorContextMenuHelper } from "@/shared/contexts/helpers/useOrchestratorContextMenu.helper";
import { kconstants } from "../../utils/K.Constants";
import { useKNodeTabHelper } from "../../hooks/useKNodeTabHelper";

export function NodeCard({ node, isRoot }: { node: KItemV2; isRoot?: boolean }) {
    const {
        editingNodeId, editDraft, setEditDraft,
        editOriginal,
        parentPickerNodeId, setParentPickerNodeId,
        unsavedPromptNodeId, setUnsavedPromptNodeId,
    } = useKNodeEditorStore();
    const { allNodes, handleOpenEdit, handleCancelEdit, handleSubmitEdit, handleDelete, handleRestoreCard, handleSaveParent, handleDrillDown, scopeDepth } = useKNodeEditorLoader();
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { openKNodeTab } = useKNodeTabHelper();
    const { hoveredNodeId, setHoveredNodeId } = useKStore();

    const [showIconPicker, setShowIconPicker] = useState(false);
    const iconPickerRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const isEditing = editingNodeId === node.id;

    // Focus name input without scroll when entering edit mode
    useEffect(() => {
        if (isEditing) {
            nameInputRef.current?.focus({ preventScroll: true });
        }
    }, [isEditing]);

    const isPickerOpen = parentPickerNodeId === node.id;
    const isPrompting = unsavedPromptNodeId === node.id;
    const isDeleted = !!node.deletedAt;
    const isKnowledge = isRoot && node.id < 0; // workspace root virtual node
    const isHoveredFromTree = !isRoot && hoveredNodeId === node.id;

    const level = isRoot ? 0 : (node.pathDepth ?? 1);
    const parentNode = !isRoot && node.parentId != null ? allNodes.find((n) => n.id === node.parentId) : null;

    const nodeIcon = node.icon as IconType | undefined;
    const IconComponent = nodeIcon && ICON_MAP[nodeIcon] ? ICON_MAP[nodeIcon] : null;

    // Resolved icon rendering helpers
    const iconColor = node.color || (isRoot ? "#A1887F" : "#90A4AE");
    const NodeIconDisplay = ({ opacity = 0.4 }: { opacity?: number }) => {
        if (isKnowledge) {
            return <LibraryBig className="w-3.5 h-3.5" style={{ color: "#A1887F", opacity }} strokeWidth={2} />;
        }
        if (isRoot) {
            return <LibraryBig className="w-3.5 h-3.5" style={{ color: node.color || "#A1887F", opacity }} strokeWidth={2} />;
        }
        if (IconComponent) {
            return <IconComponent className="w-3.5 h-3.5" style={{ color: iconColor, opacity }} strokeWidth={2} />;
        }
        return <Library className="w-3.5 h-3.5" style={{ color: iconColor, opacity }} />;
    };

    // const bgStyle = isRoot
    //     ? { backgroundColor: "#000000" }
    //     : level === 1 ? { backgroundColor: "#111318" }
    //     : level === 2 ? { backgroundColor: "#14171C" }
    //     : level === 3 ? { backgroundColor: "#181A20" }
    //     : { backgroundColor: "#1B1D23" };

    const bgStyle = isRoot
    ? { backgroundColor: "#000000" }
    : level - scopeDepth === 1 ? { backgroundColor: "#111318" }
    // : level === 2 ? { backgroundColor: "#14171C" }
    : level - scopeDepth === 2 ? { backgroundColor: "#181A20" }
    : { backgroundColor: "#1B1D23" };

    const setDraft = <K extends keyof typeof editDraft>(key: K, value: typeof editDraft[K]) =>
        setEditDraft((prev) => ({ ...prev, [key]: value }));

    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: DND_TYPE,
        item: { id: node.id },
        // Cannot drag: root card or deleted node
        canDrag: () => !isRoot && !isDeleted,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [node.id, isRoot, isDeleted]);

    const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
        accept: DND_TYPE,
        canDrop: (item: { id: number }) => {
            if (item.id === node.id) return false;                        // can't drop onto itself
            if (node.deletedAt != null) return false;                     // can't drop onto deleted target
            if (isAncestorNode(item.id, node.id, allNodes)) return false; // can't drop into descendant
            const draggedNode = allNodes.find(n => n.id === item.id);
            if (draggedNode?.deletedAt != null) return false;             // can't drag deleted source
            if (draggedNode?.parentId === node.id) return false;          // already has this parent — no-op
            return true;
        },
        drop: (item: { id: number }) => handleSaveParent(item.id, node.id),
        collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
    }), [node.id, node.deletedAt, allNodes, handleSaveParent]);

    const cardRef = useRef<HTMLDivElement>(null);
    if (!isRoot) dragRef(cardRef);
    dropRef(cardRef);

    // Ctrl+S to save while editing
    useEffect(() => {
        if (!isEditing) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSubmitEdit(node, editDraft);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [isEditing, node, editDraft]);

    // Detect click outside while editing — compare with original before showing prompt
    useEffect(() => {
        if (!isEditing || isPrompting) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (!cardRef.current?.contains(e.target as Node)) {
                const isDirty =
                    editDraft.name !== editOriginal.name ||
                    editDraft.description !== editOriginal.description ||
                    editDraft.icon !== editOriginal.icon ||
                    editDraft.color !== editOriginal.color;
                if (isDirty) {
                    setUnsavedPromptNodeId(node.id);
                } else {
                    handleCancelEdit();
                }
            }
        };
        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, [isEditing, isPrompting, node.id, editDraft, editOriginal]);

    // Close icon picker on outside click
    useEffect(() => {
        if (!showIconPicker) return;
        const handler = (e: MouseEvent) => {
            if (!iconPickerRef.current?.contains(e.target as Node)) setShowIconPicker(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showIconPicker]);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e, kconstants.contextMenu.contextMenuTypes.kNodePanelCard, node);
    };

    const dropActive = isOver && canDrop;

    // ── Unsaved changes prompt overlay ─────────────────────────────────────────
    const UnsavedPrompt = isPrompting ? (
        <div
            className="absolute inset-0 rounded-lg bg-zinc-950/96 flex flex-col items-center justify-center gap-3 z-30"
            onMouseDown={(e) => e.stopPropagation()}
        >
            <p className="text-xs text-zinc-400 font-medium">Save changes?</p>
            <div className="flex gap-2">
                <button
                    onClick={() => handleSubmitEdit(node, editDraft)}
                    className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                >
                    Save
                </button>
                <button
                    onClick={handleCancelEdit}
                    className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                    Discard
                </button>
            </div>
        </div>
    ) : null;

    // ── unified render (single DOM tree — no remount on mode switch) ───────────
    const cardState = dropActive
        ? "border-blue-400 cursor-copy"
        : isDragging
        ? "border-zinc-700 opacity-40"
        : "border-zinc-700/50 hover:border-zinc-600";

    const hoverBorderColor = isHoveredFromTree && !dropActive && !isDragging
        ? "#75beff44"
        : undefined;

    return (
        <div
            ref={cardRef}
            className={`group relative rounded-lg border flex flex-col ${CARD_HEIGHT} transition-colors duration-150 ${isEditing ? "border-blue-500/20" : cardState} ${isDeleted && !isEditing ? "opacity-50" : ""}`}
            style={{ ...bgStyle, borderColor: !isEditing ? hoverBorderColor : undefined }}
            data-node-card
            onDoubleClick={!isEditing && !isKnowledge ? (e) => { e.stopPropagation(); handleOpenEdit(node); } : undefined}
            onMouseEnter={!isKnowledge ? () => setHoveredNodeId(node.id) : undefined}
            onMouseLeave={!isKnowledge ? () => setHoveredNodeId(null) : undefined}
            onContextMenu={handleContextMenu}
        >
            {UnsavedPrompt}

            {/* Icon — absolute, same position both modes */}
            <div className="absolute top-2 left-2 z-10" ref={iconPickerRef}>
                {isEditing ? (
                    <button
                        onClick={() => setShowIconPicker(v => !v)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors"
                        title="Pick icon"
                    >
                        <NodeIconDisplay opacity={0.6} />
                    </button>
                ) : (
                    <div className="w-5 h-5 flex items-center justify-center pointer-events-none">
                        <NodeIconDisplay opacity={0.4} />
                    </div>
                )}
                {showIconPicker && (
                    <div className="absolute top-6 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl" style={{ width: 280 }}>
                        <IconPicker
                            value={editDraft.icon as IconType | null}
                            onChange={(iconType, defaultColor) => {
                                setDraft("icon", iconType);
                                setDraft("color", defaultColor);
                                setShowIconPicker(false);
                            }}
                            columns={4}
                            maxHeight="240px"
                            showGroupLabels={false}
                            showSearch={true}
                        />
                    </div>
                )}
            </div>

            {/* Drop-to-reparent overlay */}
            {dropActive && !isEditing && (
                <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xs text-blue-300 bg-blue-900/80 px-2 py-1 rounded">Drop to set parent</span>
                </div>
            )}

            {/* Header — fixed h-8 */}
            <div className="flex items-center gap-1.5 px-4 pt-3.5 pb-2 shrink-0 h-8">
                {/* Parent name — click to drilldown into parent */}
                {parentNode ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDrillDown(parentNode); }}
                        className="text-[10px] ml-3 font-mono text-zinc-600 hover:text-zinc-400 border border-zinc-800 hover:border-zinc-700 rounded px-1.5 py-0.5 leading-none truncate max-w-[80px] transition-colors"
                        title={`Go to ${parentNode.name}`}
                    >
                        {parentNode.name}
                    </button>
                ) : !isRoot ? (
                    <span className="text-[10px] ml-3 font-mono text-zinc-700 border border-zinc-800/50 rounded px-1.5 py-0.5 leading-none">
                        root
                    </span>
                ) : null}
                {isEditing ? (
                    <div className="ml-auto flex items-center gap-1">
                        <button
                            onClick={() => handleSubmitEdit(node, editDraft)}
                            className="text-[11px] text-zinc-400 hover:text-green-400 px-1.5 py-0.5 rounded"
                        >
                            Save
                        </button>
                        <button
                            onClick={handleCancelEdit}
                            className="text-[11px] text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded"
                        >
                            Esc
                        </button>
                    </div>
                ) : (
                    <div className="ml-auto hidden group-hover:flex items-center gap-1">
                        {!isKnowledge && !isDeleted && (
                            <button onClick={() => handleDelete(node.id)} className="text-zinc-600 hover:text-red-400 p-0.5 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {!isKnowledge && isDeleted && (
                            <button onClick={() => handleRestoreCard(node.id)} className="text-zinc-600 hover:text-green-400 p-0.5 rounded" title="Restore">
                                <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Name */}
            <div className="px-4 shrink-0 h-6">
                {isEditing ? (
                    <input
                        ref={nameInputRef}
                        value={editDraft.name}
                        onChange={(e) => setDraft("name", e.target.value)}
                        placeholder="Name"
                        className="w-full bg-transparent text-sm font-semibold text-left outline-none border-b border-zinc-700 pb-0.5"
                        style={{ color: editDraft.color || node.color || "#f4f4f5" }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") handleCancelEdit();
                            if (e.key === "Enter") handleSubmitEdit(node, editDraft);
                        }}
                    />
                ) : !isKnowledge ? (
                    <button
                        className="text-sm font-semibold text-left leading-snug line-clamp-2 mt-[3px] w-full hover:underline underline-offset-2 decoration-zinc-600 transition-colors hover:opacity-80"
                        style={{ color: node.color || "#f4f4f5" }}
                        onClick={(e) => { e.stopPropagation(); handleDrillDown(node); }}
                        title={`Drill into ${node.name}`}
                    >
                        {node.name}
                    </button>
                ) : (
                    <div
                        className="text-sm font-semibold text-left leading-snug line-clamp-2 mt-[3px]"
                        style={{ color: node.color || "#f4f4f5" }}
                    >
                        {node.name}
                    </div>
                )}
            </div>

            {/* Description */}
            <div className="px-4 pt-1.5 flex-1 min-h-0 overflow-y-auto">
                {isEditing ? (
                    <AutoResizeTextarea
                        value={editDraft.description}
                        onChange={(v) => setDraft("description", v)}
                        placeholder="Description… (Shift+Enter for new line)"
                        className="text-xs text-zinc-400 leading-relaxed w-full text-left"
                        onKeyDown={(e) => {
                            if (e.key === "Escape") handleCancelEdit();
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitEdit(node, editDraft);
                            }
                        }}
                    />
                ) : (
                    <div className="text-xs text-left text-zinc-400 leading-relaxed whitespace-pre-line">
                        {node.description || ""}
                    </div>
                )}
            </div>

            {/* Footer — always present, same height */}
            <div className={`px-4 pb-3 pt-2 shrink-0 border-t border-none`} />
        </div>
    );
}
