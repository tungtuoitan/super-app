import { FileText } from "lucide-react";
import { NoteGrid } from "../Components/NoteGrid";
import { NoteEditorPanel } from "../Components/NoteEditorPanel";
import { NoteDetailTab } from "../Components/NoteDetailTab";
import { constants } from "@/utils/constants";
import type { ModuleDefinition } from "@/shell/moduleRegistry";

const NoteDetailTabAdapter = () => <NoteDetailTab />;

export const noteModule: ModuleDefinition = {
    id: constants.modules.note,
    icon: FileText,
    label: constants.vscode.displayNames.notes,

    SidebarView: NoteGrid,

    editorPanels: {
        [constants.vscode.tab.tabTypes.note]: NoteEditorPanel,
    },

    panelTabs: [
        {
            id: "noteDetail",
            label: "Note Detail",
            icon: FileText,
            Content: NoteDetailTabAdapter,
        },
    ],
};
