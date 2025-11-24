// Tags Feature Public Exports

// Components
export { WorkspaceTree } from './WorkspaceTree';
export { TagCreateDialog } from './TagCreateDialog';
export { AddTagDialog } from './AddTagDialog';

// Context & Hooks
export { TagUIProvider, useTagUI } from './TagUIContext';

// Hooks
export { useTags, useWorkspaceTagTree } from '../../hooks/Tags/useTags';
export { useTagsForAutocomplete } from '../../hooks/Tags/useTagsForAutocomplete';

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