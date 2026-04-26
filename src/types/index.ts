/**
 * Type Definitions Index
 * Barrel export for truly shared, cross-feature types.
 *
 * Rules:
 * - Only include types used by 2+ unrelated features
 * - Feature-specific types live in features/<name>/types/
 * - Auth/API types → src/types/auth.types.ts
 */

export * from "./common.types";
export * from "./folder.types";
export * from "./workspace-v2.types";
export * from "../shell/types/auth.types";
