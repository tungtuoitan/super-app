import { contextMenuRegistry, constants } from "@/shared";
import { WorkspaceFolderNodeMenu, WorkspaceChildNodeMenu, WorkspaceSelectorMenu, WsGridMenu } from "@/features/workspace";
import { NoteGridMenu, RichTextEditorMenu } from "@/features/note";
import { ProjectGridMenu, TaskGridMenu, TaskFlowMenu } from "@/features/project";
import { LogListMenu, TrackPanelMenu } from "@/features/lifeLog";
import { KNodeMenu, KNodePanelCardMenu, KKnowledgeMenu, KTestFlowMenu, KNodePanelBlankMenu } from "@/features/K";
import { WikiGraphNodeMenu } from "@/features/Wiki";
import { TabBarMenu } from "./components/menus/TabBarMenu";

const t = constants.contextMenu.contextMenuTypes;

contextMenuRegistry.register({ handles: [t.folder],              component: WorkspaceFolderNodeMenu });
contextMenuRegistry.register({ handles: [t.note, t.file],        component: WorkspaceChildNodeMenu });
contextMenuRegistry.register({ handles: [t.workspaceSelector],   component: WorkspaceSelectorMenu });
contextMenuRegistry.register({ handles: [t.workspaceGrid],       component: WsGridMenu });
contextMenuRegistry.register({ handles: [t.noteGrid],            component: NoteGridMenu });
contextMenuRegistry.register({ handles: [t.richTextEditor],      component: RichTextEditorMenu });
contextMenuRegistry.register({ handles: [t.projectGrid],         component: ProjectGridMenu });
contextMenuRegistry.register({ handles: [t.taskGrid],            component: TaskGridMenu });
contextMenuRegistry.register({ handles: [t.taskFlow],            component: TaskFlowMenu });
contextMenuRegistry.register({ handles: [t.lifeLogLog],          component: LogListMenu });
contextMenuRegistry.register({ handles: [t.lifeLogTrack],        component: TrackPanelMenu });
contextMenuRegistry.register({ handles: [t.kNode],               component: KNodeMenu });
contextMenuRegistry.register({ handles: [t.kNodePanelCard],      component: KNodePanelCardMenu });
contextMenuRegistry.register({ handles: [t.kKnowledgeSelector],  component: KKnowledgeMenu });
contextMenuRegistry.register({ handles: [t.kTestFlow],           component: KTestFlowMenu });
contextMenuRegistry.register({ handles: [t.kNodePanelBlank],     component: KNodePanelBlankMenu });
contextMenuRegistry.register({ handles: [t.wikiGraphNode],       component: WikiGraphNodeMenu });
contextMenuRegistry.register({ handles: [t.tab],                 component: TabBarMenu });
