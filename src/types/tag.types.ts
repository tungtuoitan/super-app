/**
 * @deprecated This file re-exports from folder.types.ts for backward compatibility
 * Use folder.types.ts directly in new code
 */

// Re-export all folder types with tag aliases for backward compatibility
export type { 
    Folder as Tag,
    FolderDTO as TagDTO,
    FolderTreeResponseDTO as TagTreeResponseDTO,
    CreateFolderDTO as CreateTagDTO,
    UpdateFolderDTO as UpdateTagDTO,
    MoveFolderDTO as MoveTagDTO,
    GetFoldersParams as GetTagsParams,
    FolderLayoutType as TagLayoutType,
    FolderTreeNode as TagTreeNode,
    FolderWithPath as TagWithPath,
    WorkspaceWithFolderTree as WorkspaceWithTagTree,
    WorkspaceTreeItemDTO,
    WorkspaceWithTreeDTO
} from './folder.types';
