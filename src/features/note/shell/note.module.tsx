import { FileText } from "lucide-react";
import { shellConstants } from "@/shell";
import { NoteGrid } from "../Components/NoteGrid";
import { NoteEditorPanel } from "../Components/NoteEditorPanel";
import type { ModuleDefinition } from "@/shell";
import type { TabStorage } from "@/shell";
import type { Note, NoteDTO } from "../types/note.types";
import type { BaseTab } from "@/shell";
import { ICON_MAP, IconKey } from "@/shared";
import { useNoteSaveActions } from "../hooks/useNoteSaveActions";
import { noteService } from "../service/note.service";
import { transformNotes } from "../utils/note.utils";
import { useNoteGridStore } from "../store/useNoteGrid.store";
import { useSideBarStore } from "@/shell";


function getNoteTabIcon(tab: BaseTab) {
    const note = tab.data0 as Note | undefined;
    const IconComponent = note?.icon && ICON_MAP[note.icon as IconKey] ? ICON_MAP[note.icon as IconKey] : FileText;
    return <IconComponent className="w-4 h-4" />;
}

export const noteModule: ModuleDefinition = {
    id: "Note",
    icon: FileText,
    label: "Notes",

    useSaveActions: useNoteSaveActions,

    tabPersistence: {
        getDataId: (tab) => {
            const note = tab.data as Note;
            return note.id > 0 ? note.id : null;
        },
        restoreTab: async (persisted: TabStorage, userToken: string) => {
            const result = await noteService._getNotes(userToken, { ids: String(persisted.dataId) });
            if (!result.success || !result.data?.length) return null;
            const noteData = transformNotes(result.data as NoteDTO[])[0];
            if (!noteData) return null;
            return {
                id: persisted.tabId,
                type: shellConstants.vscode.tab.tabTypes.note,
                data: noteData,
                data0: noteData,
                title: noteData.name || shellConstants.vscode.tabTitles.unsavedNote,
                hasUnsavedChanges: false,
            };
        },
    },

    useIsInModule: () => {
        const { notes } = useNoteGridStore();
        const { moduleName } = useSideBarStore();
        return (tab: BaseTab) => {
            if (moduleName !== "Note") return false;
            if (tab.type !== shellConstants.vscode.tab.tabTypes.note) return false;
            return notes.some((n) => n.id === (tab.data as Note).id);
        };
    },

    useOnTabClose: () => {
        const { setNotes } = useNoteGridStore();
        return (tab: BaseTab) => {
            if (tab.type !== shellConstants.vscode.tab.tabTypes.note) return;
            const noteData = tab.data as Note;
            // Remove temp notes (negative ID) from the note grid
            if (noteData.id < 0) {
                setNotes((prev) => prev.filter((n) => n.id !== noteData.id));
            }
        };
    },

    SidebarView: NoteGrid,

    editorPanels: {
        [shellConstants.vscode.tab.tabTypes.note]: NoteEditorPanel,
    },

    getTabMeta: (tab) => ({
        icon: getNoteTabIcon(tab),
        color: (tab.data0 as Note | undefined)?.color ?? "#60a5fa",
    }),

    filterViewKey: "noteGrid",
};
