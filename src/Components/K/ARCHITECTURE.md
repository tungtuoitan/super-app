# K Module — Architecture Notes

K is a **clone of the Workspace module**, stripped down to nodes-only (no notes, no files).
If you need to understand K, read Workspace first — K mirrors its structure with renamed identifiers.

---

## Origin: Workspace → K mapping

| Concept | Workspace | K |
|---|---|---|
| Route | `/workspace` | `/k` (old: `/Kworkspace`) |
| Module name | `Workspace` | `K` |
| DB table (items) | `workspace_items` | `k_items` |
| DB table (entity) | `folders` | `folders` → future: `k_nodes` |
| Entity types | folder / note / file | **node only** (entityType: 2) |
| Item type constant | `"folder"` | `"node"` |
| Context menu type | `"folder"` | `"k-node"` |

---

## File mapping

| Workspace | K |
|---|---|
| `src/Components/Workspace/Explorer/WorkspaceTree.tsx` | `K/Components/KExplorer/KTree.tsx` |
| `src/Components/Workspace/Explorer/FolderNode.tsx` | `K/Components/KExplorer/KNode.tsx` |
| `src/Components/Workspace/Explorer/RootFolderNode.tsx` | `K/Components/KExplorer/KRootNode.tsx` |
| `src/Components/Workspace/Explorer/FolderDialog/` | `K/Components/KExplorer/KDialog/` |
| `src/store/workspace/Workspace.store.tsx` | `K/store/K.store.tsx` |
| `src/store/workspace/FolderDialog.store.tsx` | `K/store/KDialog.store.tsx` |
| `src/store/workspace/MovingTree.store.tsx` | `K/store/KMovingTree.store.tsx` |
| `src/hooks/workspace/tree.miniHelper.ts` | `K/hooks/Ktree.miniHelper.ts` |
| `src/hooks/workspace/useTreeHelper.ts` | `K/hooks/useKTreeHelper.ts` |
| `src/hooks/workspace/useTreeHelper2.ts` | `K/hooks/useKTreeHelper2.ts` |
| `src/hooks/workspace/useWorkspaceItemHelper.ts` | `K/hooks/useKItemHelper.ts` |
| `src/hooks/workspace/useWorkspace.loader.ts` | `K/hooks/useK.loader.ts` |
| `src/hooks/workspace/useMovingTree.helper.ts` | `K/hooks/useKMovingTree.helper.ts` |
| `src/hooks/workspace/useFolderDialog.helper.ts` | `K/hooks/useKFolderDialog.helper.ts` |
| `src/services/workspace.service.ts` | `K/service/K.service.ts` |
| `src/utils/workspace-mapper.ts` | `K/utils/K-mapper.ts` |
| `src/utils/constants.ts` → `workspace.*` | `K/utils/K.Constants.ts` → `kconstants.*` |
| `src/shared/contexts/helpers/useWorkspaceFolderMenu.helper.ts` | `K/contexts/helpers/useKFolderMenu.helper.ts` |
| `src/shared/contexts/menus/WorkspaceFolderNodeMenu.tsx` | `K/contexts/menu/KNodeMenu.tsx` |
| `src/types/workspace-v2.types.ts` | `K/types/K-v2.types.ts` |
| `src/types/workspace-dto.types.ts` | `K/types/K-dto.types.ts` |

---

## Key renames inside K

| Workspace name | K name |
|---|---|
| `WorkspaceContextData` | `KContextData` |
| `allWorkspaces` | `allK` |
| `currentWorkspace` | `currentK` |
| `isLoadingWorkspaces` | `isLoadingK` |
| `treeData: TreeFolder[]` | `treeData: KTreeNode[]` |
| `FolderDialogContextData` | `NodeDialogContextData` |
| `isFolderDialogOpen` | `isNodeDialogOpen` |
| `editingFolder` | `editingNode` |
| `newFolderName` | `newNodeName` |
| `ItemType` | `NodeItemType` |
| `KuseFolderDialogHelper` | `useKNodeDialogHelper` |
| `openFolderDialog` | `openNodeDialog` |
| `WorkspaceFolderItem` | `KNodeItem` |
| `FolderEntity` | `KNodeData` |
| `WorkspaceWithTreeResponseV2` | `KWithTreeResponseV2` |
| `TreeFolder` (miniHelper) | `KTreeNode` |
| `transformToTreeData` param `dto: WorkspaceDTO` | `dto: KDTO` |
| `constants` (global) | `kconstants` (K-local) |

---

## Differences from Workspace (not just renames)

1. **Nodes only** — K has no note/file items. `entityType` is always `2`.
2. **`kconstants` is a local copy** of `constants` — when updating one, update the other.
   They must stay in sync for: `navigation`, `vscode`, `workspace.itemTypes`, `contextMenu`, `modules`, `filters`.
3. **`OrchestratorMenuContext`** routes context menu by `contextMenu.contextMenuTypes.*` (not `workspace.itemTypes.*`).
   Workspace folder → `"folder"`, K node → `"k-node"`.
4. **DB tables** differ — K uses `k_items` + (currently) `folders` table.
   API prefix: `/api/kworkspace/...` (unchanged from Workspace `/api/workspace/...` — may diverge later).

---

## Deprecated aliases (backward-compat, remove after Phase 3)

Located in their respective files — all marked `@deprecated`:

- `K.store.tsx`: `KWorkspaceContextData`, `allWorkspaces`, `currentWorkspace`, `isLoadingWorkspaces`
- `KDialog.store.tsx`: `FolderDialogStore`, `KuseFolderDialogStore`, `KFolderDialogProvider`, `ItemType`
- `K-v2.types.ts`: `WorkspaceFolderItem`, `FolderEntity`, `FolderData`, `WorkspaceWithTreeResponseV2`, `isFolder()`
- `K-dto.types.ts`: `KWorkspaceDTO`
- `K.types.ts`: `KWorkspaceOperationResult`
- `K.Constants.ts`: `workspace.itemTypes.folder`, `contextMenu.contextMenuTypes.kFolder`, `modules.Kworkspace`, `navigation.*.Kworkspace`
- `constants.ts` (global): same set of aliases mirroring K.Constants.ts
