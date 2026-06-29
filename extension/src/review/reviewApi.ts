const KNOWLEDGE_ID = 1;

export const REVIEW_TOKEN_KEY = "sa_review_token";

export interface KDailySessionQuestion {
    id: number;
    question: string;
    answer: string | null;
    context?: string | null;
    nodeName?: string | null;
    previewIntervalSeconds: Record<number, number>;
}

export async function getReviewToken(): Promise<string | null> {
    const r = await chrome.storage.local.get(REVIEW_TOKEN_KEY);
    return (r[REVIEW_TOKEN_KEY] as string) ?? null;
}

export async function saveReviewToken(token: string): Promise<void> {
    await chrome.storage.local.set({ [REVIEW_TOKEN_KEY]: token.trim() });
}

// Delegates to background service worker to avoid CORS (content scripts run in page origin)
export async function fetchQuestions(): Promise<KDailySessionQuestion[]> {
    try {
        const resp = await chrome.runtime.sendMessage({ type: "SA_REVIEW_FETCH" });
        console.log("[SA-Review] fetchQuestions response:", resp);
        return Array.isArray(resp) ? resp : [];
    } catch (e) {
        console.error("[SA-Review] fetchQuestions sendMessage error:", e);
        return [];
    }
}

export function submitAnswer(questionId: number, selfScore: number, responseTimeMs: number): void {
    chrome.runtime.sendMessage({
        type: "SA_REVIEW_SUBMIT",
        questionId,
        selfScore,
        responseTimeMs,
    }).catch(() => {});
}

export function markDraft(questionId: number): void {
    chrome.runtime.sendMessage({
        type: "SA_REVIEW_MARK_DRAFT",
        questionId,
    }).catch(() => {});
}

