// Strip "DRAFT" keyword from an answer and determine if the question should be drafted.
// Rules: empty answer → draft; answer contains "DRAFT" → draft + remove "DRAFT".
export function resolveDraft(raw: string): { cleanedAnswer: string; shouldBeDraft: boolean } {
    const hasDraftKeyword = raw.includes("DRAFT");
    const cleanedAnswer   = hasDraftKeyword ? raw.replace(/DRAFT/g, "").trim() : raw;
    return { cleanedAnswer, shouldBeDraft: !cleanedAnswer || hasDraftKeyword };
}

export const toEventNodeId = (nodeId: number): number | null => nodeId === 0 ? null : nodeId;
