/**
 * Module Registration
 *
 * Register all feature modules into the VSCode shell.
 * To add a new module: create `src/features/xxx/shell/xxx.module.ts` and add it here.
 * Shell components (ActivityBar, VSSideBar, VSEditorArea, VSPanel) require no changes.
 */

import { moduleRegistry } from "./moduleRegistry";
import { workspaceModule } from "@/features/workspace/shell/workspace.module";
import { kModule } from "@/features/K/shell/k.module";
import { projectModule } from "@/features/project/shell/project.module";
import { lifeLogModule } from "@/features/lifeLog/shell/lifeLog.module";
import { noteModule } from "@/features/note/shell/note.module";
import { wsModule } from "@/features/ws/shell/ws.module";

// Registration order = ActivityBar display order
moduleRegistry.register(workspaceModule);
moduleRegistry.register(projectModule);
moduleRegistry.register(kModule);
moduleRegistry.register(lifeLogModule);
// noteModule and wsModule are available but not shown in ActivityBar by default
// (they can still have editor panels registered for tab rendering)
moduleRegistry.register(noteModule);
moduleRegistry.register(wsModule);
