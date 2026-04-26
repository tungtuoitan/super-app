import { useState, useRef, useEffect } from "react";import { useDrag, useDrop } from "react-dnd";
import { Trash2, LibraryBig, Library, HelpCircle, RotateCcw, Maximize2, Minimize2, Bookmark } from "lucide-react";
import type { KItemV2 } from "../../types/K-v2.types";
import { useKNodeEditorStore } from "../../store/KNodeEditor.store";
import { useKNodeEditorLoader } from "../../hooks/useKNodeEditor.loader";
import { useKStore } from "../../store/K.store";
import { DND_TYPE, CARD_HEIGHT, isAncestorNode } from "../../hooks/kNodeEditor.miniHelper";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import type { IconType } from "../../shared/icons/icon.types";
import { ICON_MAP } from "../../shared/icons/icon.config";
import { IconPicker } from "@/shared/components/ui/IconPicker";
import { useOrchestratorContextMenuHelper } from "@/shared/menuContexts/helpers/useOrchestratorContextMenu.helper";
import { kconstants } from "../../utils/K.Constants";
import { useKNodeTabHelper } from "../../hooks/useKNodeTabHelper";
import { storageService, STORAGE_KEYS } from "@/services/storage.service";
import { KHighlightText } from "../KExplorer/KHighlightText";
import { useGridControlStore } from "@/shared/store/useGridControl.store";
import {useGlobalShortcut} from "@/shared/hooks/useGlobalShortcut";

export function NodeCard({ node, isRoot, compact, onSubmitEdit }: { node: KItemV2; isRoot?: boolean; compact?: boolean; onSubmitEdit?: (draft: { name: string; description: string; icon: string | null; color: string | null }) => Promise<void> }) {
    const {
        editingNodeId, editDraft, setEditDraft,setEditingNodeId,
        editOriginal,
        parentPickerNodeId, setParentPickerNodeId,
        unsavedPromptNodeId, setUnsavedPromptNodeId,
        promptFlashTick,
    } = useKNodeEditorStore(); 
    const { allNodes, handleOpenEdit, handleCancelEdit, handleSubmitEdit, handleDelete, handleRestoreCard, handleSaveParent, handleDrillDown, handleUpdateIcon, scopeDepth } = useKNodeEditorLoader();
    const submitEdit = (n: KItemV2, draft: { name: string; description: string; icon: string | null; color: string | null }) => {
        if (onSubmitEdit) {
            if (!draft.name.trim()) return;
            setEditingNodeId(null);
            setUnsavedPromptNodeId(null);
            return onSubmitEdit(draft);
        }
        return handleSubmitEdit(n, draft);
    };
    const { showContextMenu } = useOrchestratorContextMenuHelper();
    const { openKNodeTab } = useKNodeTabHelper();
    const { hoveredNodeId, setHoveredNodeId, markedNodeId, setMarkedNodeId, currentK } = useKStore();
    const { searchQuery } = useGridControlStore();

    const isMarked = markedNodeId === node.id;
    const handleToggleMark = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newVal = isMarked ? null : node.id;
        setMarkedNodeId(newVal);
        if (currentK?.id) {
            if (newVal === null) storageService.remove(`${STORAGE_KEYS.K_TREE_MARK}_${currentK.id}`);
            else storageService.set(`${STORAGE_KEYS.K_TREE_MARK}_${currentK.id}`, newVal);
        }
    };

    const [showIconPicker, setShowIconPicker] = useState(false);
    const iconPickerRef = useRef<HTMLDivElement>(null);
    const nameInputRef = useRef<HTMLTextAreaElement>(null);
    const focusFieldRef = useRef<"name" | "description">("name");
    const isEditing = editingNodeId === node.id;

    // Card size: 1×1 (default) → 2×1 → 2×2 → back
    const [cardSize, setCardSize] = useState<"1x1" | "2x1" | "2x2">("1x1");
    const cycleSize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCardSize(s => s === "1x1" ? "2x1" : s === "2x1" ? "2x2" : "1x1");
    };
    const heightClass = compact ? "" : cardSize === "2x2" ? "h-[26.75rem]" : CARD_HEIGHT;
    const spanClass   = cardSize !== "1x1"  ? "col-span-2"  : "";
    const rowClass    = cardSize === "2x2"  ? "row-span-2"  : "";

    // Focus the clicked field when entering edit mode
    useEffect(() => {
        if (!isEditing) return;
        if (focusFieldRef.current === "description") {
            descRef.current?.focus({ preventScroll: true });
        } else {
            nameInputRef.current?.focus({ preventScroll: true });
        }
    }, [isEditing]);

    const isPickerOpen = parentPickerNodeId === node.id;
    const isPrompting = unsavedPromptNodeId === node.id;
    const isDeleted = !!node.deletedAt;
    const isKnowledge = isRoot && node.id < 0;
    const isHoveredFromTree = !isRoot && hoveredNodeId === node.id;


    // ── Flash the save/discard prompt ──────────────────────────────────────────
    const [isFlashing, setIsFlashing] = useState(false);
    const flashPrompt = () => {
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 500);
    };

    // Flash when user clicks outside while prompt is visible
    useEffect(() => {
        if (!isPrompting) return;
        const handler = (e: MouseEvent) => {
            if (!cardRef.current?.contains(e.target as Node)) flashPrompt();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [isPrompting]);

    // Flash when triggered from outside (e.g. blocked inline-create attempt)
    useEffect(() => {
        if (!isPrompting || promptFlashTick === 0) return;
        flashPrompt();
    }, [promptFlashTick]);

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

    const bgStyle = compact
    ? { backgroundColor: "#0f1014" }
    : isRoot
    ? { backgroundColor: "#000000" }
    : level - scopeDepth === 1 ? { backgroundColor: "#111318" }
    : level - scopeDepth === 2 ? { backgroundColor: "#181A20" }
    : { backgroundColor: "#1B1D23" };

    const setDraft = <K extends keyof typeof editDraft>(key: K, value: typeof editDraft[K]) =>
        setEditDraft((prev) => ({ ...prev, [key]: value }));

    const [{ isDragging }, dragRef] = useDrag(() => ({
        type: DND_TYPE,
        item: { id: node.id },
        // Cannot drag: root card, deleted node, currently editing, or compact mode
        canDrag: () => !isRoot && !isDeleted && !isEditing && !compact,
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }), [node.id, isRoot, isDeleted, isEditing, compact]);

    const [{ isOver, canDrop }, dropRef] = useDrop(() => ({
        accept: DND_TYPE,
        canDrop: (item: { id: number }) => {
            if (compact) return false;                                    // no reparenting in compact mode
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
    }), [node.id, node.deletedAt, allNodes, handleSaveParent, compact]);

    const cardRef = useRef<HTMLDivElement>(null);
    const descRef = useRef<HTMLTextAreaElement>(null);
    // In compact mode don't register DND_TYPE drag — lets the Kanban wrapper's drag take over
    if (!isRoot && !compact) dragRef(cardRef);
    dropRef(cardRef);

    // Ctrl+S → save editing node (priority 100 beats EditorToolbar's 50)
    const nodeRef = useRef(node);
    const editDraftRef = useRef(editDraft);
    nodeRef.current = node;
    editDraftRef.current = editDraft;

    useGlobalShortcut("ctrl+s", { id: "k-node-save", priority: 100, enabled: isEditing }, () => {
        submitEdit(nodeRef.current, editDraftRef.current);
        return true;
    });

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
            className={`absolute inset-0 rounded-lg bg-zinc-950/96 flex flex-col items-center justify-center gap-3 z-30 transition-all duration-150 ${isFlashing ? "ring-2 ring-amber-400/20 scale-[1.02] brightness-125" : ""}`}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <p className="text-xs text-zinc-400 font-medium">Save changes?</p>
            <div className="flex gap-2">
                <button
                    onClick={() => submitEdit(node, editDraft)}
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
    const markedBorderColor = isMarked && !isEditing && !dropActive ? "#f59e0b66" : undefined;

    return (
        <div
            ref={cardRef}
            className={`group relative rounded-lg border flex flex-col ${heightClass} ${spanClass} ${rowClass} transition-colors duration-150 ${isEditing ? "border-blue-500/20" : cardState} ${isDeleted && !isEditing ? "opacity-50" : ""}`}
            style={{ ...bgStyle, borderColor: !isEditing ? (markedBorderColor ?? hoverBorderColor) : undefined }}
            data-node-card
            onMouseEnter={!isKnowledge ? () => setHoveredNodeId(node.id) : undefined}
            onMouseLeave={!isKnowledge ? () => setHoveredNodeId(null) : undefined}
            onContextMenu={handleContextMenu}
        >
            {UnsavedPrompt}

            {/* Icon — absolute, same position both modes. Always clickable (except knowledge root / deleted / question). */}
            {/* <div className="absolute top-2 left-2 z-10" ref={iconPickerRef}>
                {isKnowledge || isDeleted || isQuestion ? (
                    <div className="w-5 h-5 flex items-center justify-center pointer-events-none">
                        <NodeIconDisplay opacity={0.4} />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowIconPicker(v => !v)}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors"
                        title="Pick icon"
                    >
                        <NodeIconDisplay opacity={isEditing ? 0.6 : 0.4} />
                    </button>
                )}
                {showIconPicker && (
                    <div className="absolute top-6 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl" style={{ width: 280 }}>
                        <IconPicker
                            value={(isEditing ? editDraft.icon : node.icon) as IconType | null}
                            onChange={(iconType, defaultColor) => {
                                if (isEditing) {
                                    // In edit mode: update draft (saved on submit)
                                    setDraft("icon", iconType);
                                    setDraft("color", defaultColor);
                                } else {
                                    // Not editing: save immediately via API
                                    handleUpdateIcon(node, iconType, defaultColor);
                                }
                                setShowIconPicker(false);
                            }}
                            columns={4}
                            maxHeight="240px"
                            showGroupLabels={false}
                            showSearch={true}
                        />
                    </div>
                )}
            </div> */}

            {/* Drop-to-reparent overlay */}
            {dropActive && !isEditing && (
                <div className="absolute inset-0 rounded-lg flex items-center justify-center pointer-events-none z-10">
                    <span className="text-xs text-blue-300 bg-blue-900/80 px-2 py-1 rounded">Drop to set parent</span>
                </div>
            )}


            {/* Name */}
            <div className={compact && !isEditing ? "px-2 pt-2.5 pb-2" : "mt-4 px-2 shrink-0"}

            >
                {isEditing ? (
                    <AutoResizeTextarea
                        ref={nameInputRef}
                        value={editDraft.name}
                        onChange={(v) => setDraft("name", v)}
                        placeholder="Name"
                        rows={1}
                        className={`${compact ? "text-xs" : "text-sm"} font-semibold text-left border-b border-zinc-700 pb-2`}
                        style={{ color:"#808080" }}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") { e.preventDefault(); handleCancelEdit(); }
                            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); submitEdit(node, editDraft); }
                        }}
                    />
                ) :
                    <button
                        className={`${compact ? "text-xs" : "text-sm"} cursor-text font-semibold text-left leading-snug mt-[3px] w-full whitespace-pre-wrap`}
                        // style={{ color: isQuestion ? "#808080" : (node.color || "#f4f4f5") }}
                        style={{ color:"#808080" }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (isEditing) return;
                            focusFieldRef.current = "name";
                            handleOpenEdit(node);
                        }}
                        
                        >
                        <span className="cursor-text underline-offset-2 decoration-zinc-600 transition-colors hover:opacity-80"
                        title={`Drill into ${node.name}`}
                        >
                            <KHighlightText text={node.name} highlight={searchQuery} />
                        </span>
                    </button>
                 }
            </div>

            {/* Description */}
            {(!compact || isEditing) && (
                <div className={`px-2 pt-1.5 ${compact ? "pb-2" : "flex-1 min-h-0 overflow-y-auto"} text-left`}>
                    {isEditing ? (
                        <AutoResizeTextarea
                            ref={descRef}
                            value={editDraft.description}
                            onChange={(v) => setDraft("description", v)}
                            placeholder="Description…"
                            className="text-xs text-zinc-400 leading-relaxed"
                            onKeyDown={(e) => {
                                if (e.key === "Escape") { e.preventDefault(); handleCancelEdit(); }
                                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); submitEdit(node, editDraft); }
                            }}
                        />
                    ) : (
                        <div
                            onDoubleClick={!isKnowledge && !isDeleted ? (e) => {
                                e.stopPropagation();
                                focusFieldRef.current = "description";
                                handleOpenEdit(node);
                            } : undefined}
                            style={{ cursor: !isKnowledge && !isDeleted ? "text" : undefined, height: "100%" }}
                        >
                            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap break-words">
                                <KHighlightText text={node.description ?? ''} highlight={searchQuery} />
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Footer — bookmark + resize buttons */}
            {!compact && <div className="px-2 pb-1.5 pt-1 shrink-0 flex items-center justify-between">
                {/* Bookmark / mark toggle */}
                {!isKnowledge && (
                    <button
                        onClick={handleToggleMark}
                        title={isMarked ? "Remove mark" : "Mark this node"}
                        className={`p-0.5 rounded transition-all ${isMarked ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400 opacity-0 group-hover:opacity-100"}`}
                    >
                        <Bookmark className="w-3 h-3" fill={isMarked ? "currentColor" : "none"} />
                    </button>
                )}
                {isKnowledge && <span />}
                {!isKnowledge && (
                    <button
                        onClick={cycleSize}
                        className={`p-0.5 rounded transition-all text-zinc-600 hover:text-zinc-400 ${cardSize !== "1x1" ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                        title={cardSize === "2x2" ? "Collapse card" : "Expand card"}
                    >
                        {cardSize === "2x2"
                            ? <Minimize2 className="w-3 h-3" />
                            : <Maximize2 className="w-3 h-3" />}
                    </button>
                )}
            </div>}
        </div>
    );
}
