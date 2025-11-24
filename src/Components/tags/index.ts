// Tags Feature Public Exports

// Components
export { WorkspaceTree } from './WorkspaceTree';
export { TagCreateDialog } from './TagCreateDialog';
export { AddTagDialog } from './AddTagDialog';

// Context & Hooks
export { TagUIProvider, useTagUI } from './TagUIContext';

// Hooks
export { useTags, useWorkspaceTagTree } from './useTags';
export { useTagsForAutocomplete } from './useTagsForAutocomplete';

// Service
export { tagService } from './tagService';

// Types
export type { 
    Tag, 
    TagLayoutType,
    CreateTagDTO, 
    UpdateTagDTO, 
    GetTagsParams
} from './tag.types';