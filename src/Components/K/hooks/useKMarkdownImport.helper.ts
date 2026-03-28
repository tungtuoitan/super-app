import { useState } from "react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { KService } from "../service/K.service";
import { useKLoader } from "./useK.loader";
import { useConsoleHelper } from "@/hooks/console/useConsole.helper";
import { useKStore } from "../store/K.store";

export interface KMarkdownImportState {
    isLoading: boolean;
    insertedCount: number | null;
    error: string | null;
}

export const useKMarkdownImportHelper = () => {
    const _console = useConsoleHelper();
    const { $user } = useAuthStore();
    const { loadTree } = useKLoader();
    const { currentK } = useKStore();

    const [state, setState] = useState<KMarkdownImportState>({
        isLoading: false,
        insertedCount: null,
        error: null,
    });

    const generate = async (markdown: string, parentNodeId: number | null) => {
        const knowledgeId = currentK?.id;
        if (!knowledgeId || knowledgeId < 0) {
            _console.error("No knowledge selected");
            return;
        }

        setState({ isLoading: true, insertedCount: null, error: null });
        try {
            const result = await KService._importMarkdown($user.userToken, knowledgeId, markdown, parentNodeId);
            const nodes = (result.object as any[]) ?? [];
            setState({ isLoading: false, insertedCount: nodes.length, error: null });
            _console.success(`Imported ${nodes.length} nodes as draft`);
            await loadTree();
        } catch (err: any) {
            const msg = err?.message ?? "Import failed";
            setState({ isLoading: false, insertedCount: null, error: msg });
            _console.error(msg);
        }
    };

    const reset = () => setState({ isLoading: false, insertedCount: null, error: null });

    return { state, generate, reset };
};
