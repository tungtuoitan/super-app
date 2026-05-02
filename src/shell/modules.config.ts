/**
 * Module Registration
 *
 * Register all feature modules into the VSCode shell.
 * To add a new module: create `src/features/xxx/shell/xxx.module.ts` and add it here.
 * Shell components (ActivityBar, VSSideBar, VSEditorArea, VSPanel) require no changes.
 */

import { moduleRegistry } from "./moduleRegistry";
import { FileText } from "lucide-react";
import React from "react";
import { NoteBodyInPanel } from "@/features/note";
import { shellConstants } from "@/shell";
// Module files are imported directly (not via barrel) to avoid circular deps.
// Each *.module file may import from other feature barrels; keeping them out
// of their own barrel breaks the init cycle during HMR and initial load.
import { workspaceModule } from "@/features/workspace/shell/workspace.module";
import { kModule }         from "@/features/K/shell/k.module";
import { projectModule }   from "@/features/project/shell/project.module";
import { lifeLogModule }   from "@/features/lifeLog/shell/lifeLog.module";
import { noteModule }      from "@/features/note/shell/note.module";
import { menuContextRegistry } from "@/shared";

// ── Menu components ───────────────────────────────────────────────────────────
import { WorkspaceFolderNodeMenu, WorkspaceChildNodeMenu, WorkspaceSelectorMenu, WsGridMenu } from "@/features/workspace";
import { NoteGridMenu, RichTextEditorMenu } from "@/features/note";
import { ProjectGridMenu, TaskGridMenu, TaskFlowMenu } from "@/features/project";
import { LogListMenu, TrackPanelMenu } from "@/features/lifeLog";
import { KNodeMenu, KNodePanelCardMenu, KKnowledgeMenu, KTestFlowMenu, KNodePanelBlankMenu } from "@/features/K";
import { WikiGraphNodeMenu } from "@/features/Wiki";
import { TabBarMenu } from "./components/TabBarMenu";

// ── Filter registrations ──────────────────────────────────────────────────────
import { registerWorkspaceFilters } from "@/features/workspace";
import { registerKFilters } from "@/features/K";
import { registerNoteFilters } from "@/features/note";
import { registerTaskFilters } from "@/features/taskDetail";
import { registerProjectFilters } from "@/features/project";

// ── Global panel tabs ─────────────────────────────────────────────────────────
const NoteBodyInPanelContent = () => React.createElement(NoteBodyInPanel);
moduleRegistry.registerGlobalPanelTab({
    id: "noteDetail",
    label: "Note Detail",
    icon: FileText,
    Content: NoteBodyInPanelContent,
    showWhenTabType: shellConstants.vscode.tab.tabTypes.note,
});

// ── Module registration (ActivityBar display order) ───────────────────────────
moduleRegistry.register(workspaceModule);
moduleRegistry.register(projectModule);
moduleRegistry.register(kModule);
moduleRegistry.register(lifeLogModule);
moduleRegistry.register(noteModule);

// ── Filter configuration ──────────────────────────────────────────────────────
registerWorkspaceFilters();
registerKFilters();
registerNoteFilters();
registerTaskFilters();
registerProjectFilters();

// ── Context menu registration ─────────────────────────────────────────────────
menuContextRegistry.register({ handles: ["folder"],                component: WorkspaceFolderNodeMenu });
menuContextRegistry.register({ handles: ["note", "file"],          component: WorkspaceChildNodeMenu });
menuContextRegistry.register({ handles: ["workspace-selector"],    component: WorkspaceSelectorMenu });
menuContextRegistry.register({ handles: ["workspace-grid"],        component: WsGridMenu });
menuContextRegistry.register({ handles: ["note-grid"],             component: NoteGridMenu });
menuContextRegistry.register({ handles: ["richtext-editor"],       component: RichTextEditorMenu });
menuContextRegistry.register({ handles: ["project-grid"],          component: ProjectGridMenu });
menuContextRegistry.register({ handles: ["task-grid"],             component: TaskGridMenu });
menuContextRegistry.register({ handles: ["task-flow"],             component: TaskFlowMenu });
menuContextRegistry.register({ handles: ["lifelog-log"],           component: LogListMenu });
menuContextRegistry.register({ handles: ["lifelog-track"],         component: TrackPanelMenu });
menuContextRegistry.register({ handles: ["k-node"],                component: KNodeMenu });
menuContextRegistry.register({ handles: ["k-node-panel-card"],     component: KNodePanelCardMenu });
menuContextRegistry.register({ handles: ["k-knowledge-selector"],  component: KKnowledgeMenu });
menuContextRegistry.register({ handles: ["k-test-flow"],           component: KTestFlowMenu });
menuContextRegistry.register({ handles: ["k-node-panel-blank"],    component: KNodePanelBlankMenu });
menuContextRegistry.register({ handles: ["wiki-graph-node"],       component: WikiGraphNodeMenu });
menuContextRegistry.register({ handles: ["tab"],                   component: TabBarMenu });
