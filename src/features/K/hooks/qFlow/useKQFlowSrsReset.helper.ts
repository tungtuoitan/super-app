import { useEffect, useRef, useState } from "react";
import { KTestService } from "@/features/K/service/kTest.service";
import type { KQuestion } from "@/features/K/types/kTest.type";

export function useKQFlowSrsReset(
    nodeId: number | null,
    activeQuestions: KQuestion[],
    loadQuestions: () => Promise<void>,
) {
    const [resetConfirm, setResetConfirm] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleResetClick = () => {
        if (resetLoading) return;
        if (!resetConfirm) {
            setResetConfirm(true);
            resetConfirmTimerRef.current = setTimeout(() => setResetConfirm(false), 3000);
        } else {
            if (resetConfirmTimerRef.current) clearTimeout(resetConfirmTimerRef.current);
            setResetConfirm(false);
            void (async () => {
                if (!nodeId) return;
                const ids = activeQuestions.map(q => q.id);
                if (ids.length === 0) return;
                setResetLoading(true);
                try {
                    await KTestService._updateQuestions(nodeId, {
                        addQuestions: [],
                        updateQuestions: [],
                        deleteQuestionIds: [],
                        restoreQuestionIds: [],
                        resetSrsQuestionIds: ids,
                    });
                    await loadQuestions();
                } catch { /* silent */ }
                finally { setResetLoading(false); }
            })();
        }
    };

    // Clean up auto-cancel timer on unmount
    useEffect(() => () => {
        if (resetConfirmTimerRef.current) clearTimeout(resetConfirmTimerRef.current);
    }, []);

    return { resetConfirm, resetLoading, handleResetClick };
}
