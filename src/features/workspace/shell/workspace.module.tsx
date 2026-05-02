import { Boxes, Box, BarChart3, ArrowRightLeft } from "lucide-react";
import { WorkspaceView } from "../Components/WorkspaceView";
import { WsEditorPanel } from "../Components/WsEditorPanel";
import { MovingTab } from "../Components/VSPanel/MovingTab";
import { shellConstants, type ModuleDefinition, useSideBarStore, getSideBarState } from "@/shell";
import type { TabStorage } from "@/shell";
import type { BaseTab } from "@/shell";
import { useWsSaveActions } from "../hooks/ws/useWsSaveActions";
import { wsService } from "../service/ws.service";
import type { WsDTO } from "../service/ws.service";
import type { Ws } from "../types/workspace.types";
import { useWorkspaceStore, getWorkspaceState } from "../store/Workspace.store";
import { useWsStore } from "../store/ws/useWs.store";
import { useMovingTreeStore } from "../store/MovingTree.store";
import { useWorkspaceHelper } from "../hooks/useWorkspaceHelper";
import { getKeywordState } from "@/shared";
import {
    findKeywordForNote,
    parseBreadcrumbFromKeyword,
    enrichBreadcrumbWithColors,
    buildBreadcrumbFromTree,
} from "@/shell";


const MovingTabAdapter = () => <MovingTab />;

const TAB_COLORS: Record<string, string> = {
    [shellConstants.vscode.tab.tabTypes.workspace]: "#a78bfa",
    [shellConstants.vscode.tab.tabTypes.trackingGraph]: "#22c55e",
};

const _transformWs = (dto: WsDTO): Ws => ({
    id: dto.id,
    name: dto.name,
    description: dto.description,
    createdAt: new Date(dto.createdAt),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
    deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
    userId: dto.userId,
});

export const workspaceModule: ModuleDefinition = {
    id: "Workspace",
    icon: Boxes,
    label: "Workspace",


    useSaveActions: useWsSaveActions,

    tabPersistence: {
        getDataId: (tab) => {
            const ws = tab.data as Ws;
            return ws.id > 0 ? ws.id : null;
        },
        restoreTab: async (persisted: TabStorage, userToken: string) => {
            const result = await wsService._getWs(userToken, { ids: String(persisted.dataId) });
            if (!result.success || !result.data?.length) return null;
            const wsData = _transformWs(result.data[0] as WsDTO);
            return {
                id: persisted.tabId,
                type: shellConstants.vscode.tab.tabTypes.workspace,
                data: wsData,
                data0: wsData,
                title: wsData.name || shellConstants.vscode.tabTitles.unsavedWorkspace,
                hasUnsavedChanges: false,
            };
        },
    },

    useIsInModule: () => {
        const { moduleName } = useSideBarStore();
        const { currentWorkspace } = useWorkspaceStore();
        const { workspaces } = useWsStore();
        return (tab: BaseTab) => {
            if (moduleName === "Ws") {
                if (tab.type !== shellConstants.vscode.tab.tabTypes.workspace) return false;
                return workspaces.some((w) => w.id === (tab.data as Ws).id);
            }
            if (moduleName === "Workspace") {
                if (!currentWorkspace?.flatData) return false;
                if (tab.type === shellConstants.vscode.tab.tabTypes.note) {
                    const entityId = (tab.data as { id: number }).id;
                    return currentWorkspace.flatData.some((item: any) => item.entityType === 3 && item.entityId === entityId);
                }
                if (tab.type === shellConstants.vscode.tab.tabTypes.workspace) {
                    return (tab.data as Ws).id === currentWorkspace.id;
                }
            }
            return false;
        };
    },

    onTabClose: (tab: BaseTab) => {
        // Only apply cleanup when the workspace module sidebar is active
        if (getSideBarState().moduleName !== "Workspace") return;
        if (tab.type !== shellConstants.vscode.tab.tabTypes.note) return;

        const { currentWorkspace, setCurrentWorkspace } = getWorkspaceState();
        const entityId = (tab.data as { id: number }).id;

        if (entityId < 0) {
            // Temp note: remove from workspace flatData
            setCurrentWorkspace((prev) => {
                if (!prev?.flatData) return prev;
                return {
                    ...prev,
                    flatData: prev.flatData.filter(
                        (item) => !(item.entityType === 3 && item.entityId === entityId),
                    ),
                };
            });
            return;
        }

        // Existing note: only remove if the workspace item itself is new (negative ID)
        const wsItem = currentWorkspace?.flatData?.find(
            (item) => item.entityType === 3 && item.entityId === entityId,
        );
        if (wsItem && wsItem.id < 0) {
            setCurrentWorkspace((prev) => {
                if (!prev?.flatData) return prev;
                return {
                    ...prev,
                    flatData: prev.flatData.filter((item) => item.id !== wsItem.id),
                };
            });
        }
    },

    SidebarView: WorkspaceView,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.workspace]: WsEditorPanel,
    },

    getTabMeta: (tab) => {
        const color = TAB_COLORS[tab.type] ?? "#9ca3af";
        const Icon = tab.type === shellConstants.vscode.tab.tabTypes.trackingGraph ? BarChart3 : Box;
        return { icon: <Icon className="w-4 h-4" style={{ color }} />, color };
    },

    // ── Tab activate → sync workspace tree selection + scroll ────────────────
    onTabActivate: (tab: BaseTab | null) => {
        const { currentWorkspace, setSelectedItemIds, _treeRef, setLastSelectedItemId } = getWorkspaceState();

        if (!tab) {
            setSelectedItemIds([]);
            setLastSelectedItemId(null);
            return;
        }

        const syncTree = (workspaceItemId: number) => {
            setSelectedItemIds([workspaceItemId]);
            if (_treeRef.current) {
                _treeRef.current.openParents(workspaceItemId.toString());
                _treeRef.current.scrollTo(workspaceItemId.toString());
                const node = _treeRef.current.get(workspaceItemId.toString());
                if (node) node.focus();
            }
        };

        if (tab.type === shellConstants.vscode.tab.tabTypes.note) {
            const noteId = (tab.data as { id: number }).id;
            const item = currentWorkspace?.flatData?.find(
                (i) => i.entityType === 3 && i.entityId === noteId,
            );
            if (item?.id) {
                setLastSelectedItemId(item.id);
                syncTree(item.id);
            } else {
                setSelectedItemIds([]);
                setLastSelectedItemId(null);
            }
        } else if (tab.type === shellConstants.vscode.tab.tabTypes.workspace) {
            const wsId = (tab.data as { id: number }).id;
            const item = currentWorkspace?.flatData?.find(
                (i) => i.entityType === 2 && i.entityId === wsId,
            );
            if (item?.id) syncTree(item.id);
        }
    },

    // ── Breadcrumb builder for note tabs ─────────────────────────────────────
    buildBreadcrumb: (tab: BaseTab) => {
        if (tab.type !== shellConstants.vscode.tab.tabTypes.note) return undefined;

        try {
            const { currentWorkspace } = getWorkspaceState();
            const { allKeywords } = getKeywordState();
            const noteData = tab.data as { id: number; name: string };

            /** Mark workspace items as disabled when they are the currently active workspace */
            const markDisabled = (items: ReturnType<typeof buildBreadcrumbFromTree>) =>
                currentWorkspace
                    ? items.map((item) =>
                          item.type === "workspace" && item.name === currentWorkspace.name
                              ? { ...item, disabled: true }
                              : item,
                      )
                    : items;

            const findWsItemId = (entityType: 2 | 3 | 4, entityId: number): number | null =>
                currentWorkspace?.flatData?.find(
                    (i) => i.entityType === entityType && i.entityId === entityId,
                )?.id ?? null;

            // New notes (id < 0): must use workspace tree
            if (noteData.id < 0) {
                if (!currentWorkspace) return undefined;
                const wsItemId = findWsItemId(3, noteData.id);
                if (!wsItemId) return undefined;
                return markDisabled(
                    buildBreadcrumbFromTree(
                        wsItemId, noteData.id, noteData.name,
                        currentWorkspace.flatData, currentWorkspace.id, currentWorkspace.name,
                    ),
                );
            }

            // Existing notes: keyword-based (fast path)
            if (!allKeywords?.length) return undefined;

            const keyword = findKeywordForNote(noteData.id, allKeywords);
            if (!keyword) {
                // Fallback: workspace tree
                if (!currentWorkspace) return undefined;
                const wsItemId = findWsItemId(3, noteData.id);
                if (!wsItemId) return undefined;
                return markDisabled(
                    buildBreadcrumbFromTree(
                        wsItemId, noteData.id, noteData.name,
                        currentWorkspace.flatData, currentWorkspace.id, currentWorkspace.name,
                    ),
                );
            }

            return markDisabled(
                enrichBreadcrumbWithColors(parseBreadcrumbFromKeyword(keyword), allKeywords),
            );
        } catch {
            return undefined;
        }
    },

    /** Signals TabBar to regenerate breadcrumbs when the active workspace changes */
    useBreadcrumbTrigger: () => useWorkspaceStore().currentWorkspace?.id,

    useOnBeforeModuleSwitch: () => {
        const { saveNewsBeforeNavigate } = useWorkspaceHelper();
        return saveNewsBeforeNavigate;
    },

    usePanelTabs: () => {
        const { setTargetWorkspace } = useMovingTreeStore();
        return [
            {
                id: "moving",
                label: "Moving",
                icon: ArrowRightLeft,
                Content: MovingTabAdapter,
                onLeave: () => setTargetWorkspace(null),
            },
        ];
    },

    filterViewKey: "workspace",
};
