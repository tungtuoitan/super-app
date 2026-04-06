/**
 * ConversationDialog — Messenger-style floating panel
 *
 * Fixed to the bottom-right of the screen.
 * Minimize → collapses to a slim title bar.
 * Header shows current entity; clicking the entity opens a floating dropdown picker.
 */

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Minus, X,
    Folder, CheckSquare, FileText, Globe, Pencil, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useConversationHelper } from "@/hooks/conversation/useConversation.helper";
import { useProjectStore } from "@/store/project/useProject.store";
import { useTaskGridStore } from "@/store/task/useTaskGrid.store";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { constants } from "@/utils/constants";
import { ConversationHeadless } from "@/HeadlessComponents/conversation/ConversationHeadless";
import { storageService, STORAGE_KEYS } from "@/services/storage.service";
import { TopicList } from "./small/TopicList";
import { MessageArea } from "./small/MessageArea";

// ── entity type config ────────────────────────────────────────────────────────

const ENTITY_TYPES = [
    { value: "project", label: "Project", icon: <Folder      className="w-3.5 h-3.5" /> },
    { value: "task",    label: "Task",    icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { value: "note",    label: "Note",    icon: <FileText    className="w-3.5 h-3.5" /> },
] as const;

type EntityTypeValue = typeof ENTITY_TYPES[number]["value"];

// ── derive entity from a tab ──────────────────────────────────────────────────

function getTabEntity(tab: { type: string; data: any; title: string } | null) {
    if (!tab || !tab.data || !tab.data.id || tab.data.id <= 0) return null;
    const t = constants.vscode.tab.tabTypes;
    switch (tab.type) {
        case t.project:   return { entityType: "project",   entityId: tab.data.id as number, label: tab.data.name  ?? tab.title };
        case t.task:      return { entityType: "task",      entityId: tab.data.id as number, label: tab.data.title ?? tab.title };
        case t.note:      return { entityType: "note",      entityId: tab.data.id as number, label: tab.data.title ?? tab.title };
        case t.workspace: return { entityType: "workspace", entityId: tab.data.id as number, label: tab.data.name  ?? tab.title };
        default:          return null;
    }
}

// ── persist layout ───────────────────────────────────────────────────────────

interface DialogLayout { width: number; height: number; right: number }

const DEFAULT_LAYOUT: DialogLayout = { width: 680, height: 540, right: 24 };

function loadLayout(): DialogLayout {
    return storageService.get<DialogLayout>(STORAGE_KEYS.CONVERSATION_DIALOG_LAYOUT) ?? DEFAULT_LAYOUT;
}

function saveLayout(layout: Partial<DialogLayout>) {
    const current = loadLayout();
    storageService.set(STORAGE_KEYS.CONVERSATION_DIALOG_LAYOUT, { ...current, ...layout });
}

// ── component ─────────────────────────────────────────────────────────────────

export function ConversationDialog() {
    const {
        isOpen, setIsOpen,
        isMinimized, setIsMinimized,
        entityType, entityId, entityLabel,
    } = useConversationStore();
    const { openDialog, switchEntity } = useConversationHelper();

    const { projects } = useProjectStore();
    const { tasks }    = useTaskGridStore();
    const { openTabs, activeTabId } = useEditorTabsStore();
    const activeTab = openTabs.find(t => t.id === activeTabId) ?? null;
    const activeTabEntity = getTabEntity(activeTab as any);

    // ── Sync entity with active tab ─────────────────────────────────────
    useEffect(() => {
        if (!isOpen) return;
        if (activeTabEntity) {
            if (activeTabEntity.entityType !== entityType || activeTabEntity.entityId !== entityId) {
                switchEntity(activeTabEntity.entityType, activeTabEntity.entityId, activeTabEntity.label);
            }
        } else {
            if (entityType !== null || entityId !== null) {
                switchEntity(null, null, "");
            }
        }
    }, [activeTabId]);

    const [showPicker, setShowPicker] = useState(false);
    const [pickerType, setPickerType] = useState<EntityTypeValue>("project");
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 320 });
    const badgeButtonRef = useRef<HTMLButtonElement>(null);

    // ── Resize drag (vertical) ──────────────────────────────────────────────
    const [panelHeight, setPanelHeight] = useState(() => loadLayout().height);
    const dragStartRef = useRef<{ y: number; h: number } | null>(null);

    // ── Resize drag (horizontal — left edge) ────────────────────────────────
    const MIN_WIDTH = 480;
    const MAX_WIDTH = MIN_WIDTH * 2; // 960
    const [panelWidth, setPanelWidth] = useState(() => loadLayout().width);
    const dragStartXRef = useRef<{ x: number; w: number } | null>(null);

    // ── Move drag (horizontal — title bar) ──────────────────────────────────
    const [panelRight, setPanelRight] = useState(() => loadLayout().right);
    const moveStartRef = useRef<{ x: number; r: number } | null>(null);
    const didMoveRef = useRef(false);

    // ── Persist layout on change ────────────────────────────────────────────
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => saveLayout({ width: panelWidth, height: panelHeight, right: panelRight }), 300);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [panelWidth, panelHeight, panelRight]);

    // ── F8 shortcut → open global chat + focus compose ───────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "F8") {
                e.preventDefault();
                openDialog(null, null, "");
            }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [openDialog]);

    // ── Header gradient — unified violet theme ────────────────────────────────
    const headerGradient = "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)";

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartRef.current = { y: e.clientY, h: panelHeight };

        const onMove = (ev: MouseEvent) => {
            if (!dragStartRef.current) return;
            const delta = dragStartRef.current.y - ev.clientY;
            const next = Math.max(240, Math.min(window.innerHeight - 80, dragStartRef.current.h + delta));
            setPanelHeight(next);
        };
        const onUp = () => {
            dragStartRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [panelHeight]);

    // ── Width resize (drag left edge) ────────────────────────────────────────
    const handleWidthResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartXRef.current = { x: e.clientX, w: panelWidth };

        const onMove = (ev: MouseEvent) => {
            if (!dragStartXRef.current) return;
            const delta = dragStartXRef.current.x - ev.clientX; // drag left = positive = wider
            const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, window.innerWidth - panelRight - 20, dragStartXRef.current.w + delta));
            setPanelWidth(next);
        };
        const onUp = () => {
            dragStartXRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [panelWidth, panelRight]);

    // ── Width resize (drag right edge) ───────────────────────────────────────
    const dragStartRightRef = useRef<{ x: number; w: number; r: number } | null>(null);

    const handleRightResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartRightRef.current = { x: e.clientX, w: panelWidth, r: panelRight };

        const onMove = (ev: MouseEvent) => {
            if (!dragStartRightRef.current) return;
            const delta = ev.clientX - dragStartRightRef.current.x; // drag right = positive = wider
            const nextWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragStartRightRef.current.w + delta));
            const nextRight = Math.max(0, dragStartRightRef.current.r - (nextWidth - dragStartRightRef.current.w));
            setPanelWidth(nextWidth);
            setPanelRight(nextRight);
        };
        const onUp = () => {
            dragStartRightRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [panelWidth, panelRight]);

    // ── Horizontal move (drag title bar) ─────────────────────────────────────
    const handleMoveStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        moveStartRef.current = { x: e.clientX, r: panelRight };
        didMoveRef.current = false;

        const onMove = (ev: MouseEvent) => {
            if (!moveStartRef.current) return;
            if (Math.abs(ev.clientX - moveStartRef.current.x) > 3) didMoveRef.current = true;
            const delta = moveStartRef.current.x - ev.clientX; // drag left = positive = more right
            const maxRight = window.innerWidth - panelWidth - 20;
            const next = Math.max(0, Math.min(maxRight, moveStartRef.current.r + delta));
            setPanelRight(next);
        };
        const onUp = () => {
            moveStartRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [panelRight, panelWidth]);

    // Items for the selected picker type — must be before early return (Rules of Hooks)
    const pickerItems = useMemo(() => {
        const q = pickerSearch.toLowerCase();
        if (pickerType === "project") {
            return projects
                .filter(p => !p.deletedAt && p.id > 0 && p.name.toLowerCase().includes(q))
                .map(p => ({ id: p.id, label: p.name }));
        }
        if (pickerType === "task") {
            return tasks
                .filter(t => t.id > 0 && t.title?.toLowerCase().includes(q))
                .map(t => ({ id: t.id, label: t.title ?? `Task #${t.id}` }));
        }
        return [];
    }, [pickerType, pickerSearch, projects, tasks]);

    if (!isOpen) return null;

    const handlePickerOpen = () => {
        if (showPicker) { setShowPicker(false); return; }

        const rect = badgeButtonRef.current?.getBoundingClientRect();
        if (rect) {
            setPickerPos({
                top: rect.bottom + 6,
                left: rect.left,
                width: Math.max(320, rect.width),
            });
        }
        setPickerSearch("");
        setPickerType((entityType as EntityTypeValue) ?? "project");
        setShowPicker(true);
    };

    const handleSelect = (id: number, label: string) => {
        openDialog(pickerType, id, label);
        setShowPicker(false);
        setPickerSearch("");
    };

    const currentIcon = ENTITY_TYPES.find(t => t.value === entityType)?.icon
        ?? <Globe className="w-3 h-3" />;

    return (
        <>
            <div
                className={cn(
                    "fixed bottom-0 z-[10100]",
                    "flex flex-col",
                    "rounded-t-xl overflow-hidden",
                    "shadow-[0_-4px_32px_rgba(0,0,0,0.45)]",
                    "ring-1 ring-white/10",
                    !dragStartRef.current && !dragStartXRef.current && "transition-[height] duration-200 ease-in-out",
                )}
                style={{ height: isMinimized ? 44 : panelHeight, width: panelWidth, right: panelRight }}
            >
                {/* ── Left-edge resize handle (width) ────────────────────────── */}
                {!isMinimized && (
                    <div
                        onMouseDown={handleWidthResizeStart}
                        className="absolute top-0 left-0 bottom-0 w-1.5 cursor-ew-resize z-10 group"
                        title="Drag to resize width"
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-0.5 h-10 rounded-full bg-white/20 group-hover:bg-white/50 transition-colors" />
                    </div>
                )}

                {/* ── Right-edge resize handle (width) ───────────────────────── */}
                {!isMinimized && (
                    <div
                        onMouseDown={handleRightResizeStart}
                        className="absolute top-0 right-0 bottom-0 w-1.5 cursor-ew-resize z-10 group"
                        title="Drag to resize width"
                    >
                        <div className="absolute top-1/2 -translate-y-1/2 right-0 w-0.5 h-10 rounded-full bg-white/20 group-hover:bg-white/50 transition-colors" />
                    </div>
                )}

                {/* ── Resize handle (height) ─────────────────────────────────── */}
                {!isMinimized && (
                    <div
                        onMouseDown={handleResizeStart}
                        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize z-10 group"
                        title="Drag to resize"
                    >
                        <div className="mx-auto mt-0.5 w-10 h-0.5 rounded-full bg-white/20 group-hover:bg-white/50 transition-colors" />
                    </div>
                )}

                {/* ── Title bar ──────────────────────────────────────────────── */}
                <div
                    className="h-[44px] shrink-0 flex items-center gap-2 px-3 select-none cursor-grab active:cursor-grabbing transition-[background] duration-300"
                    style={{ background: headerGradient }}
                    onMouseDown={handleMoveStart}
                    onDoubleClick={() => setIsMinimized(m => !m)}
                >
                    {/* Entity badge → opens floating picker */}
                    {entityType && entityLabel ? (
                        <button
                            ref={badgeButtonRef}
                            onClick={handlePickerOpen}
                            onMouseDown={e => e.stopPropagation()}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                                "bg-white/15 text-white/90 border border-white/20",
                                "hover:bg-white/25 transition-colors",
                                showPicker && "bg-white/30 border-white/40"
                            )}
                            title="Switch entity"
                        >
                            {currentIcon}
                            <span className="max-w-[160px] truncate">{entityLabel}</span>
                            <Pencil className="w-2.5 h-2.5 text-white/60 ml-0.5" />
                        </button>
                    ) : (
                        <button
                            ref={badgeButtonRef}
                            onClick={handlePickerOpen}
                            onMouseDown={e => e.stopPropagation()}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                                "bg-white/15 text-white/70 border border-white/20",
                                "hover:bg-white/25 transition-colors",
                                showPicker && "bg-white/30 border-white/40"
                            )}
                            title="Select entity"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Select entity</span>
                        </button>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    <button
                        onClick={() => setIsMinimized(m => !m)}
                        onMouseDown={e => e.stopPropagation()}
                        className="p-1.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        title={isMinimized ? "Expand" : "Minimize"}
                    >
                        <Minus className="w-3.5 h-3.5" />
                    </button>

                    {/* <button
                        onClick={() => setIsOpen(false)}
                        className="p-1.5 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                        title="Close"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button> */}
                </div>

                {/* ── Always-mounted side effects ────────────────────────────── */}
                <ConversationHeadless />

                {/* ── Body ───────────────────────────────────────────────────── */}
                {!isMinimized && (
                    <div className="flex flex-1 min-h-0 bg-background">
                        <div className="w-[200px] shrink-0 border-r border-border/60 flex flex-col bg-muted/20">
                            <TopicList />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                            <MessageArea />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Floating entity picker dropdown (portal to escape overflow:hidden) ── */}
            {showPicker && createPortal(
                <>
                    {/* Backdrop to close picker */}
                    <div
                        className="fixed inset-0 z-[10199]"
                        onClick={() => setShowPicker(false)}
                    />
                    {/* Picker panel */}
                    <div
                        className="fixed z-[10200] bg-popover border border-border rounded-xl shadow-2xl p-3 space-y-2"
                        style={{ top: pickerPos.top, left: pickerPos.left, width: pickerPos.width }}
                    >
                        {/* Type tabs */}
                        <div className="flex items-center gap-1.5">
                            {ENTITY_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => { setPickerType(t.value); setPickerSearch(""); }}
                                    className={cn(
                                        "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                                        pickerType === t.value
                                            ? "bg-violet-600 text-white border-violet-600"
                                            : "border-border text-muted-foreground hover:border-violet-500/50 hover:text-foreground"
                                    )}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <input
                            autoFocus
                            type="text"
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                            placeholder={`Search ${pickerType}s...`}
                            className="w-full text-xs bg-background border border-border/80 rounded-md px-2.5 py-1.5 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 transition-all"
                            onKeyDown={e => e.key === "Escape" && setShowPicker(false)}
                        />

                        {/* Results */}
                        {pickerItems.length === 0 ? (
                            <p className="text-xs text-muted-foreground/60 italic py-1">
                                {pickerSearch ? "No results" : `No ${pickerType}s loaded`}
                            </p>
                        ) : (
                            <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                                {pickerItems.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item.id, item.label)}
                                        className={cn(
                                            "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-left transition-colors",
                                            entityType === pickerType && entityId === item.id
                                                ? "bg-violet-600/15 text-violet-400 font-medium"
                                                : "hover:bg-muted/60 text-foreground"
                                        )}
                                    >
                                        {ENTITY_TYPES.find(t => t.value === pickerType)?.icon}
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {entityType === pickerType && entityId === item.id && (
                                            <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
