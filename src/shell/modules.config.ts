/**
 * Module Registration
 *
 * Register all feature modules into the VSCode shell.
 * To add a new module: create `src/features/xxx/shell/xxx.module.ts` and add it here.
 * Shell components (ActivityBar, VSSideBar, VSEditorArea, VSPanel) require no changes.
 */

import { moduleRegistry } from "./moduleRegistry";
import { workspaceModule } from "@/features/workspace";
import { kModule } from "@/features/K";
import { projectModule } from "@/features/project";
import { lifeLogModule } from "@/features/lifeLog";
import { noteModule } from "@/features/note";

// Filter registrations — features register their filter configs
import { registerWorkspaceFilters } from "@/features/workspace";
import { registerKFilters } from "@/features/K";
import { registerNoteFilters } from "@/features/note";
import { registerTaskFilters } from "@/features/taskDetail";

// Registration order = ActivityBar display order
moduleRegistry.register(workspaceModule);
moduleRegistry.register(projectModule);
moduleRegistry.register(kModule);
moduleRegistry.register(lifeLogModule);
// moduleRegistry.register(wikiModule);
// noteModule and workspaceModule are available but not shown in ActivityBar by default
// (they can still have editor panels registered for tab rendering)
moduleRegistry.register(noteModule);

// ── Filter Configuration Registration ────────────────────────────────────────
// Register feature-specific filter configurations for genericFilter
registerWorkspaceFilters();
registerKFilters();
registerNoteFilters();
registerTaskFilters();
