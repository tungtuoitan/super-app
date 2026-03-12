/**
 * K V2 Types — flat node structure matching kws.workspace_items
 * API returns data directly on each item (no entityType/entityId/data nesting).
 */

// ============================================
// K ITEM (flat node — maps to KWorkspaceItemResponseV2)
// ============================================

/**
 * Flat K node item — maps directly to kws.workspace_items row
 * name/description/color/icon are on the item itself (no separate entity join)
 */
export interface KItemV2 {
  /** kws.workspace_items.id */
  id: number;

  /** kws.workspace_items.workspace_id */
  workspaceId: number;

  /** parent kws.workspace_items.id — self-referencing, null = root */
  parentId: number | null;

  /** Node name */
  name: string;

  /** Node description */
  description?: string | null;

  /** Hex color code */
  color?: string | null;

  /** Icon emoji or class */
  icon?: string | null;

  /** Materialized path, e.g. "/1/5/12/" */
  pathIds: string;

  /** Tree depth (1 = root level) */
  pathDepth: number;

  // ── Timestamps ────────────────────────────
  createdAt: string;
  updatedAt?: string | null;
  deletedAt?: string | null;

  // ── Computed ──────────────────────────────
  accessType: "owner" | "shared";
  isOriginal: boolean;

  // ── UI state ──────────────────────────────
  isExpanded?: boolean;
  isSelected?: boolean;
}

// ============================================
// TYPE GUARDS
// ============================================

/** All K items are nodes — always returns true, kept for API consistency */
export function isNode(_item: KItemV2): _item is KItemV2 {
  return true;
}

/** All K items can have children */
export function canHaveChildren(_item: KItemV2): boolean {
  return true;
}

/** @deprecated All K items are nodes. Use isNode instead. */
export function isFolder(_item: KItemV2): _item is KItemV2 {
  return true;
}
