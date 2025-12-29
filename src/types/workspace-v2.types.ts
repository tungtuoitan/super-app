/**
 * Workspace V2 Types
 *
 * New structure with clear separation:
 * - Root level: workspace_items table properties
 * - data property: Full entity data (FolderData | NoteData | FileData)
 *
 * This makes it clear which properties come from workspace_items table
 * and which come from the entity tables (folders/notes/files)
 */

// ============================================
// BASE ENTITY TYPES (Pure database entities)
// ============================================

/**
 * Base Folder entity from database (folders table)
 * Pure entity data with ISO string dates
 * Use this for API responses and workspace tree data
 */
export interface FolderEntity {
  /** Folder ID (folders.id) */
  id: number;

  /** User ID who owns the folder (folders.user_id) */
  userId: number;

  /** Folder name (folders.name) */
  name: string;

  /** Folder description (folders.description) */
  description?: string;

  /** URL slug (folders.slug) */
  slug?: string;

  /** Hex color code (folders.color) */
  color?: string;

  /** Icon emoji or class (folders.icon) */
  icon?: string;

  /** Created timestamp (folders.created_at) - ISO string from API */
  createdAt: string;

  /** Updated timestamp (folders.updated_at) - ISO string from API */
  updatedAt?: string;

  /** Soft delete timestamp (folders.deleted_at) - ISO string from API */
  deletedAt?: string | null;

  /** Copy metadata JSON (folders.copy_info) */
  copyInfo?: string | null;
}

/**
 * Base Note entity from database (notes table)
 * Pure entity data with ISO string dates
 * Use this for API responses and workspace tree data
 */
export interface NoteEntity {
  /** Note ID (notes.id) */
  id: number;

  /** User ID who owns the note (notes.user_id) */
  userId: number;

  /** Note name/title (notes.name) */
  name: string;

  /** Note description/content (notes.description) */
  description?: string;

  /** Status code (notes.status_code) */
  statusCode?: string;

  /** Created timestamp (notes.created_at) - ISO string from API */
  createdAt: string;

  /** Updated timestamp (notes.updated_at) - ISO string from API */
  updatedAt?: string;

  /** Soft delete timestamp (notes.deleted_at) - ISO string from API */
  deletedAt?: string | null;

  /** Copy metadata JSON (notes.copy_info) */
  copyInfo?: string | null;
}

/**
 * Base File entity from database (files table)
 * Pure entity data with ISO string dates
 * Use this for API responses and workspace tree data
 */
export interface FileEntity {
  /** File ID (files.id) */
  id: number;

  /** User ID who owns the file (files.user_id) */
  userId: number;

  /** File name (files.name) */
  name: string;

  /** File URL (files.url) */
  url?: string;

  /** File size in bytes (files.file_size) */
  fileSize?: number;

  /** MIME type (files.mime_type) */
  mimeType?: string;

  /** File extension (files.extension) */
  extension?: string;

  /** Status code (files.status_code) */
  statusCode?: string;

  /** Created timestamp (files.created_at) - ISO string from API */
  createdAt: string;

  /** Updated timestamp (files.updated_at) - ISO string from API */
  updatedAt?: string;

  /** Soft delete timestamp (files.deleted_at) - ISO string from API */
  deletedAt?: string | null;

  /** Copy metadata JSON (files.copy_info) */
  copyInfo?: string | null;

  /** Human-readable file size (computed) */
  fileSizeFormatted?: string;
}

// ============================================
// DEPRECATED ALIASES (Backward compatibility)
// ============================================

/** @deprecated Use FolderEntity instead - will be removed in future version */
export type FolderData = FolderEntity;

/** @deprecated Use NoteEntity instead - will be removed in future version */
export type NoteData = NoteEntity;

/** @deprecated Use FileEntity instead - will be removed in future version */
export type FileData = FileEntity;

// ============================================
// BASE WORKSPACE ITEM
// ============================================

/**
 * Base workspace item with common workspace_items table properties
 *
 * ID NAMING CONVENTION:
 * - id          = workspace_items.id (workspace item ID in workspace_items table)
 * - workspaceId = workspace_items.workspace_id (which workspace this item belongs to)
 * - parentId    = parent workspace_item ID (parent's workspace_items.id - SELF-REFERENCING)
 * - entityId    = entity ID (folders.id | notes.id | files.id - the actual entity being referenced)
 *
 * RELATIONSHIP:
 * - workspace_items.id is unique per workspace_items row
 * - workspace_items.entity_id references the actual entity (folder/note/file)
 * - workspace_items.parent_id references parent workspace_items.id (SELF-REFERENCING)
 *
 * KEY CHANGE FROM V1:
 * - parent_id NOW references workspace_items.id (NOT entity ID!)
 * - This enables proper multi-workspace support and prevents circular references
 */
interface BaseWorkspaceItem {
  // ============ FROM workspace_items TABLE ============

  /**
   * Workspace item ID (workspace_items.id)
   * This is the PRIMARY KEY of workspace_items table
   * Use for: Update, Move, Delete, Restore actions
   */
  id: number;

  /**
   * Workspace ID (workspace_items.workspace_id)
   * References workspaces.id - which workspace this item belongs to
   */
  workspaceId: number;

  /**
   * Parent workspace_item ID (workspace_items.parent_id → workspace_items.id)
   * SELF-REFERENCING foreign key to workspace_items.id
   * null = root level item (direct child of workspace)
   * Example: If parent workspace_item.id=118, then parentId=118
   */
  parentId: number | null;

  /**
   * Entity type code (workspace_items.entity_type)
   * 2 = folder, 3 = note, 4 = file
   */
  entityType: 2 | 3 | 4;

  /**
   * Entity ID (workspace_items.entity_id)
   * References the actual entity: folders.id | notes.id | files.id
   * This is the ID of the folder/note/file being referenced
   * Example: If entityType=2 and entityId=87, this references folders.id=87
   */
  entityId: number;

  /** Created timestamp (workspace_items.created_at) */
  createdAt: string;

  /** Updated timestamp (workspace_items.updated_at) */
  updatedAt?: string;

  /** Soft delete timestamp (workspace_items.deleted_at) */
  deletedAt?: string | null;

  /** Copy metadata JSON (workspace_items.copy_info) */
  copyInfo?: string | null;

  // ============ COMPUTED PROPERTIES ============

  /** Tree depth level (0 = root) */
  level: number;

  /** Position in current level for sorting */
  position: number;

  /** Access type: "owner" or "shared" */
  accessType: "owner" | "shared";

  /** True if original, false if copied */
  isOriginal: boolean;

  // ============ UI STATE ============

  /** UI state: expanded/collapsed */
  isExpanded?: boolean;

  /** UI state: selected */
  isSelected?: boolean;
}

// ============================================
// DISCRIMINATED UNION TYPES
// ============================================

/** Workspace item containing a folder */
export interface WorkspaceFolderItem extends BaseWorkspaceItem {
  entityType: 2;
  data: FolderEntity;
}

/** Workspace item containing a note */
export interface WorkspaceNoteItem extends BaseWorkspaceItem {
  entityType: 3;
  data: NoteEntity;
}

/** Workspace item containing a file */
export interface WorkspaceFileItem extends BaseWorkspaceItem {
  entityType: 4;
  data: FileEntity;
}

/**
 * Discriminated union of all workspace item types
 * TypeScript will narrow the type based on entityType property
 */
export type WorkspaceItemV2 = WorkspaceFolderItem | WorkspaceNoteItem | WorkspaceFileItem;

// ============================================
// TYPE GUARDS
// ============================================

/** Type guard to check if item is a folder */
export function isFolder(item: WorkspaceItemV2): item is WorkspaceFolderItem {
  return item.entityType === 2;
}

/** Type guard to check if item is a note */
export function isNote(item: WorkspaceItemV2): item is WorkspaceNoteItem {
  return item.entityType === 3;
}

/** Type guard to check if item is a file */
export function isFile(item: WorkspaceItemV2): item is WorkspaceFileItem {
  return item.entityType === 4;
}

/** Type guard to check if item can have children (folders only) */
export function canHaveChildren(item: WorkspaceItemV2): item is WorkspaceFolderItem {
  return item.entityType === 2;
}

// ============================================
// WORKSPACE TREE RESPONSE
// ============================================

/**
 * Workspace with tree response V2
 * Contains workspace metadata and flat list of items
 */
export interface WorkspaceWithTreeResponseV2 {
  /** Workspace ID */
  workspaceId: number;

  /** User ID who owns the workspace */
  userId: number;

  /** Workspace name */
  name: string;

  /** Workspace description */
  description?: string;

  /** Hex color code */
  color?: string;

  /** Icon name or class */
  icon?: string;

  /** Workspace organization type */
  type?: string;

  /** Maximum depth allowed */
  maxDepth?: number;

  /** Whether this is the default workspace */
  isDefault: boolean;

  /** Whether publicly accessible */
  isPublic: boolean;

  /** Whether this is a template */
  isTemplate: boolean;

  /** Whether archived */
  isArchived: boolean;

  /** Total number of folders */
  folderCount: number;

  /** Total number of notes */
  noteCount: number;

  /** Total number of files */
  fileCount: number;

  /** Number of members */
  memberCount: number;

  /** Additional settings as JSON */
  settings?: string;

  /** When created */
  createdAt: string;

  /** When last updated */
  updatedAt?: string;

  /**
   * FLAT list of workspace items with full entity data
   * Frontend builds hierarchy using parentId
   */
  items: WorkspaceItemV2[];
}
