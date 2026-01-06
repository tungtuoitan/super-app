/**
 * Keyword types for markdown editor
 * Includes both internal (workspace/folder/note/file/heading) and external keywords
 */

export type KeywordType =
  | 'workspace'
  | 'folder'
  | 'note'
  | 'file'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'external';

export interface Keyword {
  /**
   * Database ID
   */
  id: number;

  /**
   * Display name of the keyword
   * Example: "Introduction", "Tổng quan/Học hành/Toán"
   */
  name: string;

  /**
   * Name index for handling duplicate names
   * Default: 1, increments for each duplicate name
   */
  nameIndex: number;

  /**
   * Unique identifier link
   * Format:
   * - Workspace: "w-[workspaceId]"
   * - Folder: "w-[workspaceId]/f-[workspaceItemId]"
   * - Note: "w-[workspaceId]/f-[folderId]/n-[noteWorkspaceItemId]"
   *         or "w-[workspaceId]/n-[noteWorkspaceItemId]"
   * - File: "w-[workspaceId]/f-[folderId]/file-[fileWorkspaceItemId]"
   * - Heading: "w-[workspaceId]/n-[noteId]/h1-Title1/h2-Title2"
   * - External: "https://example.com/..."
   */
  link: string;

  /**
   * Human-readable long link with nameIndex
   * Format:
   * - Workspace: "WorkspaceName[1]"
   * - Folder: "WorkspaceName[1]/FolderName[2]"
   * - Note: "WorkspaceName[1]/FolderName[2]/NoteName[3]"
   * - Heading: "WorkspaceName[1]/NoteName[2]/HeadingPath[3]"
   * - External: "ExternalName[1]"
   */
  longLink: string;

  /**
   * Type of keyword
   */
  type: KeywordType;

  /**
   * Optional description
   */
  description?: string;

  hardDeletedAt: Date | null;
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
