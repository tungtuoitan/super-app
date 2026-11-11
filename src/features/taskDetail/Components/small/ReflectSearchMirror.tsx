/**
 * ReflectSearchMirror — the same text as a Reflect cell, invisible, with the search matches painted behind
 * the real textarea (a textarea cannot highlight part of its text).
 */

import { cn } from "@/lib/utils";
import { REFLECT_CELL_TEXT } from "../../task.constants";
import { splitBySearch } from "../../utils/taskReflect.utils";

export function ReflectSearchMirror({ text, search }: { text: string; search: string }) {
    return (
        <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-transparent", REFLECT_CELL_TEXT)}>
            {splitBySearch(text, search).map((part, i) =>
                part.isMatch ? (
                    <mark key={i} className="rounded-sm bg-yellow-300/70 text-transparent">
                        {part.text}
                    </mark>
                ) : (
                    <span key={i}>{part.text}</span>
                ),
            )}
        </div>
    );
}
