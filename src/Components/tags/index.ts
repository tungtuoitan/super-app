// Tags Feature Public Exports

// Components
export { TagCreateDialog } from './TagCreateDialog';
export { AddFolderDialog } from './AddFolderDialog';
export { WorkspaceTree } from './WorkspaceTree';
export { TagsPanel } from './TagsPanel';
export { CreateFolderDialog } from './CreateFolderDialog';
export { EditWorkspaceItemDialog } from './EditWorkspaceItemDialog';

// Store & Helper (Preferred for new code)
export { TagUIStore, TagUIStoreProvider, useTagUIStore } from '@/store/tagUI/TagUIStore';
export type { TagUIStoreData } from '@/store/tagUI/TagUIStore';
export { useTagUIHelper } from '@/hooks/useTagUIHelper';

// Legacy compatibility - use store + helper instead
// TagUIProvider deprecated - use TagUIStoreProvider from store instead

// Hooks
export { useTags, useWorkspaceTagTree } from '../../hooks/Tags/useTags';
export { useTagsForAutocomplete } from '../../hooks/Tags/useTagsForAutocomplete';

// Service
export { tagService } from '../../services/tagService';

// Types
export type { 
    Folder as Tag, 
    FolderLayoutType as TagLayoutType,
    CreateFolderDTO as CreateTagDTO, 
    UpdateFolderDTO as UpdateTagDTO, 
    GetFoldersParams as GetTagsParams
} from '../../types/folder.types';