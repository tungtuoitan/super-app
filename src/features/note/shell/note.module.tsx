import { FileText } from "lucide-react";
import { NoteGrid } from "../Components/NoteGrid";
import { NoteEditorPanel } from "../Components/NoteEditorPanel";
import { constants } from "@/shared";
import type { ModuleDefinition } from "@/shell";
import type { Note } from "../types/note.types";
import type { BaseTab } from "@/shell";
import { ICON_MAP, IconKey } from "@/shared";

function getNoteTabIcon(tab: BaseTab) {
    const note = tab.data0 as Note | undefined;
    const IconComponent = note?.icon && ICON_MAP[note.icon as IconKey] ? ICON_MAP[note.icon as IconKey] : FileText;
    return <IconComponent className="w-4 h-4" />;
}

export const noteModule: ModuleDefinition = {
    id: constants.modules.note,
    icon: FileText,
    label: constants.vscode.displayNames.notes,

    SidebarView: NoteGrid,

    editorPanels: {
        [constants.vscode.tab.tabTypes.note]: NoteEditorPanel,
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
