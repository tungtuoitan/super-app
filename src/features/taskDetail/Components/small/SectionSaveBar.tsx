/**
 * SectionSaveBar — the Save / Discard pair of a section. After the user saves or discards, the same
 * buttons turn into a quiet confirmation (the other button folds away, the pressed one becomes
 * "Saved" or "Discarded") and dissolve. Motion lives in useSectionSaveBarHeadless.
 */

import { useRef } from "react";
import { Save, Undo2, X } from "lucide-react";
import { ShadcnButton } from "@/shared";
import { useSectionSaveBarHeadless } from "../../hooks/taskSection/useSectionSaveBar.headless";
import type { SectionFeedback } from "../../types/sectionFeedback.types";

interface SectionSaveBarProps {
    onSave: () => void;
    onDiscard: () => void;
    /** Non-null while a confirmation plays */
    feedback: SectionFeedback | null;
    onFeedbackDone: () => void;
}

const DONE_LAYER =
    "pointer-events-none absolute inset-0 flex items-center justify-center gap-1.5 rounded-md border border-sa-border bg-background text-[13px] font-medium text-foreground";

export function SectionSaveBar({ onSave, onDiscard, feedback, onFeedbackDone }: SectionSaveBarProps) {
    const root = useRef<HTMLDivElement>(null);
    const saveWrap = useRef<HTMLSpanElement>(null);
    const saveIdle = useRef<HTMLSpanElement>(null);
    const saveDone = useRef<HTMLSpanElement>(null);
    const saveMark = useRef<SVGPathElement>(null);
    const saveLabel = useRef<HTMLSpanElement>(null);
    const discardWrap = useRef<HTMLSpanElement>(null);
    const discardIdle = useRef<HTMLSpanElement>(null);
    const discardDone = useRef<HTMLSpanElement>(null);
    const discardMark = useRef<SVGSVGElement>(null);
    const discardLabel = useRef<HTMLSpanElement>(null);

    useSectionSaveBarHeadless(
        {
            root,
            save: { wrap: saveWrap, idle: saveIdle, done: saveDone, mark: saveMark, label: saveLabel },
            discard: { wrap: discardWrap, idle: discardIdle, done: discardDone, mark: discardMark, label: discardLabel },
        },
        feedback,
        onFeedbackDone,
    );

    return (
        <div ref={root} className="absolute right-0 flex shrink-0 items-center gap-1 bg-background pl-2">
            <span ref={saveWrap} className="relative flex overflow-hidden whitespace-nowrap">
                <ShadcnButton size="sm" onClick={onSave} className="w-full transition-transform duration-100 active:scale-95 [&_svg]:size-3.5">
                    <span ref={saveIdle} className="flex items-center gap-1.5">
                        <Save /> Save
                    </span>
                </ShadcnButton>
                <span ref={saveDone} role="status" aria-live="polite" style={{ opacity: 0 }} className={DONE_LAYER}>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path ref={saveMark} d="M6.5 12.5l3.7 3.7L17.5 8.5" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                    </svg>
                    <span ref={saveLabel} style={{ opacity: 0 }}>Saved</span>
                </span>
            </span>

            <span ref={discardWrap} className="relative flex overflow-hidden whitespace-nowrap">
                <ShadcnButton size="sm" variant="ghost" onClick={onDiscard} className="w-full text-muted-foreground transition-transform duration-100 active:scale-95 [&_svg]:size-3.5">
                    <span ref={discardIdle} className="flex items-center gap-1.5">
                        <X /> Discard
                    </span>
                </ShadcnButton>
                <span ref={discardDone} role="status" aria-live="polite" style={{ opacity: 0 }} className={DONE_LAYER}>
                    <Undo2 ref={discardMark} className="h-3.5 w-3.5" aria-hidden="true" />
                    <span ref={discardLabel} style={{ opacity: 0 }}>Discarded</span>
                </span>
            </span>
        </div>
    );
}
