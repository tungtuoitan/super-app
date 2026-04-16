/**
 * Feature flags configuration
 *
 * V2 is now the default and only supported version.
 * This file is kept for backward compatibility but V2 is always enabled.
 */

export const featureFlags = {
  /**
   * Workspace V2 API structure (always enabled)
   *
   * V2 structure provides clear separation:
   * - Root level: workspace_items table properties
   * - data property: Full entity data (FolderData | NoteData | FileData)
   */
  USE_WORKSPACE_V2: true as const,
} as const;

/**
 * @deprecated V2 is always enabled. This function always returns true.
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return true;
}

/**
 * @deprecated V2 is always enabled.
 */
export function getFeatureFlag<K extends keyof typeof featureFlags>(
  feature: K
): typeof featureFlags[K] {
  return featureFlags[feature];
}
