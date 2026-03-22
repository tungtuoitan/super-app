import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ListOrdered, CheckSquare, FileText, MessageSquare, Save, X, Star, Plus, FilePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskDetailSectionStore, SectionTab, isCustomTab } from "@/store/task/useTaskDetailSection.store";
import { useTaskDetailSelector } from "@/Selectors/task/TaskDetailSelector";
import { useTaskProcessStore } from "@/store/task/useTaskProcess.store";
import { useTaskChecklistStore } from "@/store/task/useTaskChecklist.store";
import { useTaskProcessHelper } from "@/hooks/task/useTaskProcess.helper";
import { useTaskChecklistHelper } from "@/hooks/task/useTaskChecklist.helper";
import { useTaskCommentHelper } from "@/hooks/task/useTaskComment.helper";
import { TaskProcess } from "./TaskProcess";
import { TaskChecklist } from "./TaskChecklist";
import { TaskComment } from "./TaskComment";
import { TaskCustomTab, type CustomTabHandle } from "./TaskCustomTab";
import { CommentFilterDropdown, type CommentFilterType } from "./small/CommentFilterDropdown";
import { RichTextEditor } from "@/shared/components";
import { parseCustomTabs, serializeCustomTabs, generateTabId, generateDefaultContent } from "@/types/task/customTab.types";
import { taskService } from "@/services/task.service";
import { useAuthStore } from "@/store/auth/Auth.store";
import { useConfirmationPopoverHelper } from "@/hooks/useConfirmationPopover.helper";
import { useEditorTabsStore } from "@/store/index";
import { BaseTab } from "@/types/editor/tab.types";
import { Task } from "@/store/task/useTask.store";
import { storageService, STORAGE_KEYS } from "@/services/storage.service";
import type { BuiltinTab } from "@/store/task/useTaskDetailSection.store";

const BUILTIN_TABS: Array<{ key: BuiltinTab; label: string; icon: React.ElementType }> = [
    { key: "process", label: "Process", icon: ListOrdered },
    { key: "checklist", label: "Checklist", icon: CheckSquare },
    { key: "desc", label: "Description", icon: FileText },
    { key: "comment", label: "Comment", icon: MessageSquare },
];

const TAB_COLORS: Record<string, { active: string }> = {
    process: { active: "border-purple-500 text-purple-500" },
    checklist: { active: "border-amber-500 text-amber-500" },
    desc: { active: "border-emerald-500 text-emerald-500" },
    comment: { active: "border-sky-500 text-sky-500" },
    custom: { active: "border-cyan-500 text-cyan-500" },
};

export function TaskDetailSection() {
    const { activeSection, setActiveSection } = useTaskDetailSectionStore();
    const { selectedTask, isDisabled } = useTaskDetailSelector();

    // Process/Checklist edit mode
    const { isEditing: isProcessEditing } = useTaskProcessStore();
    const { isEditing: isChecklistEditing, settingDefault } = useTaskChecklistStore();
    const { handleSaveEdit: saveProcess, handleCancelEdit: cancelProcess } = useTaskProcessHelper();
    const { handleSaveEdit: saveChecklist, handleCancelEdit: cancelChecklist, handleSetAsDefault } = useTaskChecklistHelper();

    // Auth + tabs for PATCH saves
    const { $user } = useAuthStore();
    const { setOpenTabs, activeTabId } = useEditorTabsStore();
    const { submitVersionComment, submitComment } = useTaskCommentHelper();
    const { showConfirmation } = useConfirmationPopoverHelper();

    /** Update a field in tab data WITHOUT marking hasUnsavedChanges */
    const updateTabDataSilent = useCallback((field: string, value: any) => {
        setOpenTabs((prev: BaseTab[]) => prev.map((t) =>
            t.id === activeTabId ? { ...t, data: { ...(t.data as Task), [field]: value } } : t));
    }, [activeTabId, setOpenTabs]);

    const isNewTask = !selectedTask || selectedTask.id <= 0;

    // ── Auto-set default tab when task changes ──
    const [lastTaskId, setLastTaskId] = useState<number | null>(null);
    useEffect(() => {
        if (!selectedTask || selectedTask.id === lastTaskId) return;
        setLastTaskId(selectedTask.id);
        setActiveSection(selectedTask.id <= 0 ? "desc" : "process");
    }, [selectedTask?.id]);

    // ── Force re-mount RichTextEditor when task changes ──
    const [descKey, setDescKey] = useState(0);
    useEffect(() => { if (selectedTask) setDescKey((p) => p + 1); }, [selectedTask?.id]);

    // ── Focus triggers ──
    const [descFocusTrigger, setDescFocusTrigger] = useState(0);
    const [commentFocusTrigger, setCommentFocusTrigger] = useState(0);
    const [customFocusTrigger, setCustomFocusTrigger] = useState(0);

    // ── Comment filter (persisted) ──
    const [commentFilter, setCommentFilterState] = useState<CommentFilterType>(
        () => storageService.get<CommentFilterType>(STORAGE_KEYS.COMMENT_FILTER) ?? "all");
    const [commentShowDetail, setCommentShowDetailState] = useState(
        () => storageService.get<boolean>(STORAGE_KEYS.COMMENT_SHOW_DETAIL) ?? false);

    const setCommentFilter = useCallback((v: CommentFilterType) => {
        setCommentFilterState(v);
        storageService.set(STORAGE_KEYS.COMMENT_FILTER, v);
    }, []);
    const setCommentShowDetail = useCallback((v: boolean) => {
        setCommentShowDetailState(v);
        storageService.set(STORAGE_KEYS.COMMENT_SHOW_DETAIL, v);
    }, []);

    // ── Description dirty state ──
    const [descDirty, setDescDirty] = useState(false);
    const savedNoteRef = useRef(selectedTask?.note ?? "");
    useEffect(() => { savedNoteRef.current = selectedTask?.note ?? ""; setDescDirty(false); }, [selectedTask?.id]);

    const handleDescChange = useCallback((value: string) => {
        // Update note in tab data WITHOUT marking hasUnsavedChanges
        // (description has its own Save button via section header)
        setOpenTabs((prev: BaseTab[]) =>
            prev.map((t) =>
                t.id === activeTabId
                    ? { ...t, data: { ...(t.data as Task), note: value } }
                    : t,
            ),
        );
        setDescDirty(value !== savedNoteRef.current);
    }, [activeTabId, setOpenTabs]);

    const handleDescSave = useCallback(async () => {
        if (!selectedTask || isNewTask) return;
        const currentNote = selectedTask.note ?? "";
        const oldNote = savedNoteRef.current;
        await taskService._patchTask($user.userToken, selectedTask.id, { note: currentNote });
        setOpenTabs((prev: BaseTab[]) => prev.map((t) =>
            t.id === activeTabId ? { ...t, data0: { ...(t.data as Task) } } : t));
        if (oldNote !== currentNote) submitVersionComment("desc", oldNote, currentNote);
        savedNoteRef.current = currentNote;
        setDescDirty(false);
    }, [selectedTask, isNewTask, $user.userToken, activeTabId, setOpenTabs, submitVersionComment]);

    const handleDescDiscard = useCallback(() => {
        if (!selectedTask) return;
        updateTabDataSilent("note", savedNoteRef.current);
        setDescDirty(false);
        setDescKey((p) => p + 1); // remount editor
    }, [selectedTask, updateTabDataSilent]);

    // ── Custom tab dirty state + refs ──
    const [customTabDirty, setCustomTabDirty] = useState(false);
    const customTabRefs = useRef<Record<string, CustomTabHandle | null>>({});

    const handleCustomTabSave = useCallback(async () => {
        if (!activeSection.startsWith("custom:")) return;
        const tabId = activeSection.slice(7);
        await customTabRefs.current[tabId]?.save();
    }, [activeSection]);

    const handleCustomTabDiscard = useCallback(() => {
        if (!activeSection.startsWith("custom:")) return;
        const tabId = activeSection.slice(7);
        customTabRefs.current[tabId]?.discard();
    }, [activeSection]);

    // ── Unified dirty check for active section ──
    const isSectionDirty =
        (activeSection === "process" && isProcessEditing) ||
        (activeSection === "checklist" && isChecklistEditing) ||
        (activeSection === "desc" && descDirty) ||
        (isCustomTab(activeSection) && customTabDirty);

    const handleSectionSave = useCallback(async () => {
        if (activeSection === "process") saveProcess();
        else if (activeSection === "checklist") saveChecklist();
        else if (activeSection === "desc") await handleDescSave();
        else if (isCustomTab(activeSection)) await handleCustomTabSave();
    }, [activeSection, saveProcess, saveChecklist, handleDescSave, handleCustomTabSave]);

    const handleSectionDiscard = useCallback(() => {
        if (activeSection === "process") cancelProcess();
        else if (activeSection === "checklist") cancelChecklist();
        else if (activeSection === "desc") handleDescDiscard();
        else if (isCustomTab(activeSection)) handleCustomTabDiscard();
    }, [activeSection, cancelProcess, cancelChecklist, handleDescDiscard, handleCustomTabDiscard]);

    // ── Ctrl+Shift+S for section save ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (isSectionDirty) handleSectionSave();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isSectionDirty, handleSectionSave]);

    // ── Auto-discard section changes when switching editor tabs ──
    useEffect(() => {
        if (isSectionDirty) handleSectionDiscard();
    }, [activeTabId]);

    // ── Switch section tab: auto-discard unsaved changes ──
    const handleTabClick = useCallback((key: SectionTab, e?: React.MouseEvent) => {
        if (key === activeSection) return;
        if (isSectionDirty) handleSectionDiscard();
        doSwitchTab(key);
    }, [activeSection, isSectionDirty, handleSectionDiscard]);

    const doSwitchTab = useCallback((key: SectionTab) => {
        setActiveSection(key);
        if (key === "desc") setDescFocusTrigger((p) => p + 1);
        if (key === "comment") setCommentFocusTrigger((p) => p + 1);
        if (isCustomTab(key)) setCustomFocusTrigger((p) => p + 1);
    }, [setActiveSection]);

    // ── Custom tabs data ──
    const customTabs = useMemo(
        () => parseCustomTabs(selectedTask?.customTabsJson),
        [selectedTask?.customTabsJson],
    );

    const handleAddCustomTab = useCallback(() => {
        if (!selectedTask) return;
        const tabNumber = customTabs.tabs.length + 1;
        const defaultContent = generateDefaultContent(tabNumber);
        const newTab = {
            id: generateTabId(), name: `Tab ${tabNumber}`,
            version: "1", content: defaultContent, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        const updated = { tabs: [...customTabs.tabs, newTab] };
        updateTabDataSilent("customTabsJson", serializeCustomTabs(updated));
        setTimeout(() => setActiveSection(`custom:${newTab.id}`), 50);
    }, [selectedTask, customTabs, updateTabDataSilent, setActiveSection]);

    const handleDeleteCustomTab = useCallback((tabId: string, e?: React.MouseEvent) => {
        if (!selectedTask) return;
        const tabToDelete = customTabs.tabs.find((t) => t.id === tabId);
        if (!tabToDelete) return;

        showConfirmation({
            title: `Delete "${tabToDelete.name}"?`,
            subtitle: "This tab and its content will be permanently deleted.",
            confirmText: "Delete",
            cancelText: "Cancel",
            confirmColor: "destructive",
            cancelColor: "outline",
            anchorEl: (e?.currentTarget as HTMLElement) ?? null,
            onConfirm: async () => {
                const updated = { tabs: customTabs.tabs.filter((t) => t.id !== tabId) };
                updateTabDataSilent("customTabsJson", serializeCustomTabs(updated));
                if (activeSection === `custom:${tabId}`) setActiveSection("desc");

                // Log deletion as comment
                submitComment(`[Deleted tab "${tabToDelete.name}" v${tabToDelete.version}]`);
            },
        });
    }, [selectedTask, customTabs, updateTabDataSilent, activeSection, setActiveSection, showConfirmation, submitComment]);

    if (!selectedTask) return null;

    return (
        <div className="flex flex-col h-full ">
            {/* ── Tab Bar ── */}
            <div className="flex items-start shrink-0 gap-1">
                {/* Left: tabs that can wrap */}
                <div className="flex flex-wrap items-center min-w-0 flex-1">
                    {BUILTIN_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeSection === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={(e) => handleTabClick(tab.key, e)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                                    isActive ? TAB_COLORS[tab.key].active : "border-transparent text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        );
                    })}

                    {/* Custom tabs */}
                    {customTabs.tabs.map((tab) => {
                        const tabKey: SectionTab = `custom:${tab.id}`;
                        const isActive = activeSection === tabKey;
                        return (
                            <CustomTabButton key={tab.id} name={tab.name} version={tab.version}
                                isActive={isActive} onClick={(e) => handleTabClick(tabKey, e)}
                                onDelete={(e) => handleDeleteCustomTab(tab.id, e)} isDisabled={isDisabled} />
                        );
                    })}

                    {/* Add tab button */}
                    {!isDisabled && !isNewTask && (
                        <button onClick={handleAddCustomTab}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="Add custom tab">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Right: fixed actions (Save/Discard or Filter) */}
                {isSectionDirty && !isDisabled && (
                    <div className="flex items-center gap-1.5 pr-1 shrink-0 py-1">
                        <button onClick={handleSectionSave}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Save className="h-3 w-3" /> Save
                        </button>
                        {activeSection === "checklist" && (
                            <button onClick={handleSetAsDefault} disabled={settingDefault}
                                className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                                title="Save as default template for this task type">
                                <Star className="h-3 w-3" />
                                {settingDefault ? "Saving…" : "Default"}
                            </button>
                        )}
                        <button onClick={handleSectionDiscard}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground">
                            <X className="h-3 w-3" /> Discard
                        </button>
                    </div>
                )}

                {activeSection === "comment" && !isSectionDirty && (
                    <div className="shrink-0 py-1">
                        <CommentFilterDropdown value={commentFilter} onChange={setCommentFilter}
                            showDetail={commentShowDetail} onShowDetailChange={setCommentShowDetail} />
                    </div>
                )}
            </div>
            <div className="flex-1 min-h-0">
                <div className={cn("h-full", activeSection !== "process" && "hidden")}>
                    {isNewTask ? <NewTaskPlaceholder /> : <TaskProcess />}
                </div>
                <div className={cn("h-full", activeSection !== "checklist" && "hidden")}>
                    {isNewTask ? <NewTaskPlaceholder /> : <TaskChecklist />}
                </div>

                <div className={cn("h-full pt-2.5", activeSection !== "desc" && "hidden")}>
                    <div className="h-full overflow-y-auto border rounded-md">
                        <RichTextEditor
                            key={`note-${descKey}`}
                            value={selectedTask.note || ""}
                            onChange={handleDescChange}
                            placeholder="Enter task description..."
                            minHeight="580px"
                            className="text-left"
                            disabled={isDisabled || isNewTask}
                            focusTrigger={descFocusTrigger}
                            uploadContext="project"
                            uploadContextId={selectedTask.projectId}
                        />
                    </div>
                </div>

                <div className={cn("h-full mt-2.5 border-t pt-4", activeSection !== "comment" && "hidden")}>
                    {isNewTask ? <NewTaskPlaceholder /> : <TaskComment focusTrigger={commentFocusTrigger} filter={commentFilter} showDetail={commentShowDetail} />}
                </div>

                {/* Custom tab content panels */}
                {customTabs.tabs.map((tab) => (
                    <div key={tab.id} className={cn("h-full", activeSection !== `custom:${tab.id}` && "hidden")}>
                        {isNewTask ? <NewTaskPlaceholder /> : (
                            <TaskCustomTab
                                ref={(el) => { customTabRefs.current[tab.id] = el; }}
                                tabId={tab.id}
                                focusTrigger={customFocusTrigger}
                                onDirtyChange={(dirty) => {
                                    if (activeSection === `custom:${tab.id}`) setCustomTabDirty(dirty);
                                }}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function CustomTabButton({ name, version, isActive, onClick, onDelete, isDisabled }: {
    name: string; version: string; isActive: boolean;
    onClick: (e: React.MouseEvent) => void; onDelete: (e: React.MouseEvent) => void; isDisabled: boolean;
}) {
    return (
        <div onClick={onClick} className={cn(
            "group flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors -mb-[1px] cursor-pointer",
            isActive ? TAB_COLORS.custom.active : "border-transparent text-muted-foreground hover:text-foreground",
        )}>
            <FilePlus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[120px]">{name}</span>
            <span className="text-[9px] opacity-60 shrink-0">v{version}</span>
            {!isDisabled && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(e); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                    title="Delete tab">
                    <Trash2 className="h-2.5 w-2.5" />
                </button>
            )}
        </div>
    );
}

const NewTaskPlaceholder = () => (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        Save the task first (Ctrl+S) to use this section.
    </div>
);
