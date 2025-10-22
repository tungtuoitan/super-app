// Tags Feature Public Exports

// Components
export { WorkspaceTree } from './components/WorkspaceTree';
export { TagCreateDialog } from './components/TagCreateDialog';
export { AddTagDialog } from './components/AddTagDialog';

// Toolbar Components  
export { TagAdd } from './components/toolbars/items/TagAdd';
export { TagSearch } from './components/toolbars/items/TagSearch';
export { TagFilter } from './components/toolbars/items/TagFilter';
export { TagLayoutSelector } from './components/toolbars/items/TagLayoutSelector';

// Context & Hooks
export { TagUIProvider, useTagUI } from './store/TagUIContext';

// Hooks
export { useTags, useWorkspaceTagTree } from './hooks/useTags';
export { useTagsForAutocomplete } from './hooks/useTagsForAutocomplete';

// Service
export { tagService } from './services/tagService';

// Types
export type { 
    Tag, 
    TagLayoutType,
    CreateTagDTO, 
    UpdateTagDTO, 
    GetTagsParams
} from './types/tag.types';