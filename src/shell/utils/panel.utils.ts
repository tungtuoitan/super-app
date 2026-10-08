/**
 * Bottom panel utils (#1514) — pure functions.
 */

interface ConsoleLike {
    id: string;
    type: string;
}

/** Messages after the last seen one; when the seen id was trimmed away, everything counts as unread */
export function getUnreadConsole(messages: ConsoleLike[], seenId: string | null): { count: number; hasError: boolean } {
    const seenIndex = seenId ? messages.findIndex((m) => m.id === seenId) : -1;
    const unread = messages.slice(seenIndex + 1);
    return { count: unread.length, hasError: unread.some((m) => m.type === "error") };
}
