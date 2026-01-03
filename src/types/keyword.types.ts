/**
 * Keyword types for markdown editor
 * Includes both internal (workspace/folder/note/heading) and external keywords
 */

export type KeywordType =
  | 'workspace'
  | 'folder'
  | 'note'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'heading-4'
  | 'heading-5'
  | 'heading-6'
  | 'external';

export interface Keyword {
  /**
   * Auto-increment ID (sequential: 1, 2, 3...)
   */
  id: number;

  /**
   * Display name of the keyword
   */
  name: string;

  /**
   * Unique identifier link
   * Format:
   * - Workspace: "workspaceId"
   * - Folder: "workspaceId/folderWorkspaceItemId"
   * - Note: "workspaceId/.../noteWorkspaceItemId"
   * - Heading: "workspaceId/.../noteWorkspaceItemId/title1/title2"
   * - External: "url"
   */
  link: string;

  /**
   * Human-readable display path
   * Format:
   * - Workspace: "WorkspaceName"
   * - Folder: "WorkspaceName/FolderName"
   * - Note: "WorkspaceName/.../NoteName"
   * - Heading: "WorkspaceName/.../NoteName/Title1/Title2"
   * - External: "Name"
   */
  displayLink: string;

  /**
   * Type of keyword
   */
  type: KeywordType;

  /**
   * Is the keyword deleted?
   * Logic:
   * - External: always false
   * - Internal: based on entity's DeletedAt field
   */
  isDeleted: boolean;
}

/**
 * Request DTO for upserting external keywords
 */
export interface UpsertExternalKeywordRequest {
  /**
   * Keyword ID (null for insert, value for update)
   */
  id?: number;

  /**
   * Display name of the keyword
   */
  name: string;

  /**
   * URL link (unique identifier)
   */
  link: string;

  /**
   * Optional description
   */
  description?: string;
}
