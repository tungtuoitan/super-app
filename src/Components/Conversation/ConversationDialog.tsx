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
    Folder, CheckSquare, FileText, Globe, Pencil, Check, Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/store/conversation/useConversation.store";
import { useConversationHelper } from "@/hooks/conversation/useConversation.helper";
import { useProjectStore } from "@/store/project/useProject.store";
import { useTaskGridStore } from "@/store/task/useTaskGrid.store";
import { useEditorTabsStore } from "@/store/editor/EditorTab.store";
import { constants } from "@/utils/constants";
import { ConversationHeadless } from "@/HeadlessComponents/conversation/ConversationHeadless";
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

// ── component ─────────────────────────────────────────────────────────────────

export function ConversationDialog() {
    const {
        isOpen, setIsOpen,
        isMinimized, setIsMinimized,
        entityType, entityId, entityLabel,
    } = useConversationStore();
    const { openDialog } = useConversationHelper();

    const { projects } = useProjectStore();
    const { tasks }    = useTaskGridStore();
    const { openTabs, activeTabId } = useEditorTabsStore();
    const activeTab = openTabs.find(t => t.id === activeTabId) ?? null;
    const activeTabEntity = getTabEntity(activeTab as any);

    const [showPicker, setShowPicker] = useState(false);
    const [pickerType, setPickerType] = useState<EntityTypeValue>("project");
    const [pickerSearch, setPickerSearch] = useState("");
    const [pickerPos, setPickerPos] = useState({ top: 0, left: 0, width: 320 });
    const badgeButtonRef = useRef<HTMLButtonElement>(null);

    // ── Resize drag ───────────────────────────────────────────────────────────
    const [panelHeight, setPanelHeight] = useState(540);
    const dragStartRef = useRef<{ y: number; h: number } | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragStartRef.current = { y: e.clientY, h: panelHeight };

        const onMove = (ev: MouseEvent) => {
            if (!dragStartRef.current) return;
            const delta = dragStartRef.current.y - ev.clientY; // drag up = positive = taller
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
                    "fixed bottom-0 right-6 z-[100]",
                    "w-[680px] flex flex-col",
                    "rounded-t-xl overflow-hidden",
                    "shadow-[0_-4px_32px_rgba(0,0,0,0.45)]",
                    "ring-1 ring-white/10",
                    !dragStartRef.current && "transition-[height] duration-200 ease-in-out",
                )}
                style={{ height: isMinimized ? 44 : panelHeight }}
            >
                {/* ── Resize handle ───────────────────────────────────────────── */}
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
                    className="h-[44px] shrink-0 flex items-center gap-2 px-3 select-none"
                    style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)" }}
                >
                    {/* Entity badge → opens floating picker */}
                    {entityType && entityLabel ? (
                        <button
                            ref={badgeButtonRef}
                            onClick={handlePickerOpen}
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

                    {/* Use current tab entity button */}
                    {activeTabEntity && !(activeTabEntity.entityType === entityType && activeTabEntity.entityId === entityId) && (
                        <button
                            onClick={() => openDialog(activeTabEntity.entityType, activeTabEntity.entityId, activeTabEntity.label)}
                            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                            title={`Switch to current tab: ${activeTabEntity.label}`}
                        >
                            <Navigation className="w-3 h-3" />
                            <span className="max-w-[100px] truncate">{activeTabEntity.label}</span>
                        </button>
                    )}

                    {/* Spacer → click to toggle minimize */}
                    <div className="flex-1 cursor-pointer" onClick={() => setIsMinimized(m => !m)} />

                    <button
                        onClick={() => setIsMinimized(m => !m)}
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
                        className="fixed inset-0 z-[199]"
                        onClick={() => setShowPicker(false)}
                    />
                    {/* Picker panel */}
                    <div
                        className="fixed z-[200] bg-popover border border-border rounded-xl shadow-2xl p-3 space-y-2"
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
