import { FileText } from "lucide-react";
import { shellConstants } from "@/shell/shell.constants";
import { NoteGrid } from "../Components/NoteGrid";
import { NoteEditorPanel } from "../Components/NoteEditorPanel";
import { constants, menuContextRegistry } from "@/shared";
import type { ModuleDefinition } from "@/shell";
import { NoteGridMenu } from "../contexts/menus/NoteGridMenu";
import { RichTextEditorMenu } from "../contexts/menus/RichTextEditorMenu";
import type { Note } from "../types/note.types";
import type { BaseTab } from "@/shell";
import { ICON_MAP, IconKey } from "@/shared";

menuContextRegistry.register({ handles: ["note-grid"],      component: NoteGridMenu });
menuContextRegistry.register({ handles: ["richtext-editor"], component: RichTextEditorMenu });

function getNoteTabIcon(tab: BaseTab) {
    const note = tab.data0 as Note | undefined;
    const IconComponent = note?.icon && ICON_MAP[note.icon as IconKey] ? ICON_MAP[note.icon as IconKey] : FileText;
    return <IconComponent className="w-4 h-4" />;
}

export const noteModule: ModuleDefinition = {
    id: "Note",
    icon: FileText,
    label: "Notes",

    SidebarView: NoteGrid,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.note]: NoteEditorPanel,
    },

    getTabMeta: (tab) => ({
        icon: getNoteTabIcon(tab),
        color: (tab.data0 as Note | undefined)?.color ?? "#60a5fa",
    }),

    // panelTabs: [ NOTEDETAIL IS USED WHEN ACTIVETAB = NOTE
    //     {
    //         id: "noteDetail",
    //         label: "Note Detail",
    //         icon: FileText,
    //         Content: NoteDetailTabAdapter,
    //     },
    // ],
};





