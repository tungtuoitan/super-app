import { FileText } from "lucide-react";
import { NoteGrid } from "../Components/NoteGrid";
import { NoteEditorPanel } from "../Components/NoteEditorPanel";
import { NoteDetailTab } from "../Components/NoteDetailTab";
import { constants } from "@/utils/constants";
import { ICON_MAP, type IconType } from "@/shared/icons";
import type { ModuleDefinition } from "@/shell/moduleRegistry";
import type { Note } from "../types/note.types";
import type { BaseTab } from "@/types/editor/tab.types";

const NoteDetailTabAdapter = () => <NoteDetailTab />;

function getNoteTabIcon(tab: BaseTab) {
    const note = tab.data0 as Note | undefined;
    const IconComponent = note?.icon && ICON_MAP[note.icon as IconType] ? ICON_MAP[note.icon as IconType] : FileText;
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

    panelTabs: [
        {
            id: "noteDetail",
            label: "Note Detail",
            icon: FileText,
            Content: NoteDetailTabAdapter,
        },
    ],
};
