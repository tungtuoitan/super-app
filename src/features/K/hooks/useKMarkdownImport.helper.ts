import { useState } from "react";
import { useAuthStore } from "@/store/auth/Auth.store";
import { KService } from "../service/K.service";
import { KTestService } from "../service/kTest.service";
import { useKLoader } from "./useK.loader";
import { useConsoleHelper } from "@/shell/hooks/useConsole.helper";
import { useKStore } from "../store/K.store";
import type { KMdParsed, KExistingTestAddition } from "../types/kMarkdownImport.type";
import type { KTestSummary } from "../types/kTest.type";

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

    const [existingTests, setExistingTests] = useState<KTestSummary[]>([]);
    const [testsLoading, setTestsLoading] = useState(false);

    const loadTestsForNode = async (nodeId: number) => {
        const knowledgeId = currentK?.id;
        if (!knowledgeId || knowledgeId < 0) return;
        setTestsLoading(true);
        try {
            const tests = await KTestService._getTests(knowledgeId, nodeId);
            setExistingTests(tests);
        } catch {
            setExistingTests([]);
        } finally {
            setTestsLoading(false);
        }
    };

    const clearExistingTests = () => setExistingTests([]);

    const generate = async (
        parsed: KMdParsed,
        parentNodeId: number,
        existingTestAdditions: KExistingTestAddition[],
    ) => {
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
                existingTestAdditions,
            });
            const count = parsed.tests.length + existingTestAdditions.filter(a => a.questions.length > 0).length;
            setState({ isLoading: false, insertedCount: count, error: null });
            _console.success(`Imported ${parsed.tests.length} new tests, updated ${existingTestAdditions.length} existing tests`);
            await loadTree();
        } catch (err: any) {
            const msg = err?.message ?? "Import failed";
            setState({ isLoading: false, insertedCount: null, error: msg });
            _console.error(msg);
        }
    };

    const reset = () => setState({ isLoading: false, insertedCount: null, error: null });

    return { state, generate, reset, existingTests, testsLoading, loadTestsForNode, clearExistingTests };
};
