/**
 * K V2 Types
 *
 * Structure:
 * - Root level: k_items table properties (was workspace_items)
 * - data property: KNodeData (node entity data)
 *
 * entityType: 2 = node (only supported type)
 */

// ============================================
// NODE ENTITY DATA
// ============================================

/**
 * Node entity data (maps to folders table — will migrate to k_nodes table)
 */
export interface KNodeData {
  /** Node ID (folders.id → future: k_nodes.id) */
  id: number;

  /** User ID who owns the node */
  userId: number;

  /** Node name */
  name: string;

  /** Node description */
  description?: string;

  /** URL slug */
  slug?: string;

  /** Hex color code */
  color?: string;

  /** Icon emoji or class */
  icon?: string;

  /** Created timestamp - ISO string */
  createdAt: string;

  /** Updated timestamp - ISO string */
  updatedAt?: string;

  /** Soft delete timestamp - ISO string */
  deletedAt?: string | null;
}

// @deprecated aliases — remove after Phase 3
/** @deprecated Use KNodeData */
export type FolderEntity = KNodeData;
/** @deprecated Use KNodeData */
export type FolderData = KNodeData;

// ============================================
// BASE K ITEM
// ============================================

/**
 * Base k item — properties from k_items table (was workspace_items)
 *
 * ID CONVENTION:
 * - id          = k_items.id (primary key)
 * - kId         = k_items.k_id (which K this item belongs to)
 * - parentId    = parent k_items.id (SELF-REFERENCING, null = root)
 * - entityId    = entity ID (folders.id → future: k_nodes.id)
 */
interface BaseKItem {
  /** k_items.id — primary key */
  id: number;

  /** k_items.workspace_id — which K this belongs to */
  workspaceId: number;

  /** parent k_items.id — self-referencing, null = root */
  parentId: number | null;

  /** entityType: 2 = node */
  entityType: 2;

  /** entity ID (folders.id → future: k_nodes.id) */
  entityId: number;

  /** Created timestamp */
  createdAt: string;

  /** Updated timestamp */
  updatedAt?: string;

  /** Soft delete timestamp */
  deletedAt?: string | null;

  // ── computed ──────────────────────────────
  /** Tree depth level (0 = root) */
  level: number;

  /** Position in current level */
  position: number;

  /** "owner" or "shared" */
  accessType: "owner" | "shared";

  /** True if original, false if copied */
  isOriginal: boolean;

  // ── UI state ──────────────────────────────
  isExpanded?: boolean;
  isSelected?: boolean;
}

// ============================================
// K NODE ITEM
// ============================================

/** A node item in the K tree */
export interface KNodeItem extends BaseKItem {
  entityType: 2;
  data: KNodeData;
}

/** Union type — currently only KNodeItem (extendable later) */
export type KItemV2 = KNodeItem;

// @deprecated aliases
/** @deprecated Use KNodeItem */
export type WorkspaceFolderItem = KNodeItem;

// ============================================
// TYPE GUARDS
// ============================================

/** Type guard: is a node (always true for KItemV2, kept for consistency) */
export function isNode(item: KItemV2): item is KNodeItem {
  return item.entityType === 2;
}

/** Can have children (nodes always can) */
export function canHaveChildren(item: KItemV2): item is KNodeItem {
  return item.entityType === 2;
}

// @deprecated — kept for backward compat, remove after Phase 3
/** @deprecated Use isNode */
export function isFolder(item: KItemV2): item is KNodeItem {
  return item.entityType === 2;
}

// ============================================
// K TREE RESPONSE
// ============================================

/**
 * K with flat item list — used by API response
 */
export interface KWithTreeResponseV2 {
  workspaceId: number;
  userId: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  type?: string;
  maxDepth?: number;
  isDefault: boolean;
  isPublic: boolean;
  isTemplate: boolean;
  isArchived: boolean;
  /** Total number of nodes */
  nodeCount: number;
  memberCount: number;
  settings?: string;
  createdAt: string;
  updatedAt?: string;
  /** Flat list — frontend builds hierarchy using parentId */
  items: KItemV2[];
}

// @deprecated alias
/** @deprecated Use KWithTreeResponseV2 */
export type WorkspaceWithTreeResponseV2 = KWithTreeResponseV2;
