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
import { projectKeywordPlugin } from "@/features/project/shell/project.module";
import { lifeLogKeywordPlugin } from "@/features/lifeLog/shell/lifeLog.module";
import { workspaceKeywordPlugin } from "@/features/workspace/shell/workspace.keywordPlugin";

keywordNavigatorRegistry.register(projectKeywordPlugin);
keywordNavigatorRegistry.register(lifeLogKeywordPlugin);
keywordNavigatorRegistry.register(workspaceKeywordPlugin);
