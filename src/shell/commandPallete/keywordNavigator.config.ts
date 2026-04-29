/**
 * Keyword Navigator Plugin Registration
 *
 * Register all feature keyword plugins here.
 * To add a new feature: create its plugin in features/xxx/shell/xxx.module.tsx
 * and add it below. keywordNavigatorRegistry requires no other changes.
 *
 * Dependency direction:
 *   features/xxx/shell/xxx.module.tsx  →  keywordNavigatorRegistry  ←  this file
 */

import { keywordNavigatorRegistry } from "./keywordNavigator.registry";
import { projectKeywordPlugin } from "@/features/project";
import { lifeLogKeywordPlugin } from "@/features/lifeLog";

keywordNavigatorRegistry.register(projectKeywordPlugin);
keywordNavigatorRegistry.register(lifeLogKeywordPlugin);
