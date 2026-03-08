/**
 * Keyword types for markdown editor
 */

export type KeywordType =
  | 'workspace'
  | 'folder'
  | 'note'
  | 'file'
  | 'external'
  | 'project'
  | 'task'
  | 'log'
  | 'track';

export interface Keyword {
  id: number;
  name: string;

  /**
   * Short link stored in DB.
   * Format:
   * - Workspace:  sa/w{workspaceId}
   * - Folder:     sa/w{workspaceId}/f{workspaceItemId}
   * - Note:       sa/w{workspaceId}/f{folderId}/n{workspaceItemId}
   * - Project:    sa/p{projectId}
   * - Task:       sa/p{projectId}/t{taskId}
   * - Log:        sa/l{logId}
   * - Track:      sa/tr{trackId}
   * - External:   https://...
   */
  link: string;

  /**
   * Human-readable path, e.g. "Workspace A/Folder B/Note C"
   */
  longLink: string;

  type: KeywordType;
  description?: string;
  hardDeletedAt: Date | null;

  /** workspace_items.id — only for folder/note/file */
  workspaceItemId?: number;

  /** folders.id / notes.id / files.id — only for folder/note/file */
  entityId?: number;

  color?: string;
  icon?: string;
}

export interface UpsertExternalKeywordRequest {
  id?: number;
  name: string;
  link: string;
  description?: string;
}
