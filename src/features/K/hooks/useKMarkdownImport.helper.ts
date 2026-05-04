import { useState } from "react";
import { useAuthStore } from "@/shared";
import { KService } from "../service/k.service";
import { useConsoleHelper } from "@/shared";
import { useKStore } from "../store/useK.store";
import type { KMdParsed } from "../types/kMarkdownImport.type";
import { useKLoader } from "./kTree/useK.loader";

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

    const generate = async (parsed: KMdParsed, parentNodeId: number) => {
        const knowledgeId = currentK?.id;
        if (!knowledgeId || knowledgeId < 0) {
            _console.error("No knowledge selected");
            return;
        }

        setState({ isLoading: true, insertedCount: null, error: null });
        try {
            await KService._importTestMarkdown($user.userToken, knowledgeId, {
                parentNodeId,
                tests: parsed.tests,
                orphanQuestions: parsed.orphanQuestions,
                existingTestAdditions: [],
            });
            const count = parsed.tests.reduce((acc, t) => acc + t.questions.length, 0) + parsed.orphanQuestions.length;
            setState({ isLoading: false, insertedCount: count, error: null });
            _console.success(`Imported ${count} questions`);
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
