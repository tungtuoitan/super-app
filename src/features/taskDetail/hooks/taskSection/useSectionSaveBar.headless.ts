import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { SAVED_TOAST } from "../../task.constants";
import type { SectionFeedbackKind } from "../../types/sectionFeedback.types";

export interface SaveBarSideRefs {
    wrap: RefObject<HTMLSpanElement>;
    idle: RefObject<HTMLSpanElement>;
    done: RefObject<HTMLSpanElement>;
    /** Check path (saved) or undo icon (discarded) */
    mark: RefObject<SVGPathElement | SVGSVGElement>;
    label: RefObject<HTMLSpanElement>;
}

export interface SaveBarRefs {
    root: RefObject<HTMLDivElement>;
    save: SaveBarSideRefs;
    discard: SaveBarSideRefs;
}

const GAP_PX = 4;
/** Confirmation pill: mark (h-4 / w-4) + gap + label + horizontal padding, in px */
const MARK_PX = 16;
const MARK_GAP_PX = 6;
const PILL_PAD_PX = 28;

/**
 * Turns the Save / Discard pair into a quiet confirmation, as ONE object (Web Animations API).
 * Runs when `feedback` becomes non-null: the other button folds away, the pressed one widens into
 * its place and swaps its label for "Saved" (check draws) or "Discarded" (undo icon turns back),
 * then the bar dissolves. Everything touched is restored when `feedback` returns to null.
 * Reduced motion → plain fades.
 */
export function useSectionSaveBarHeadless(refs: SaveBarRefs, feedback: { kind: SectionFeedbackKind; key: number } | null, onDone: () => void) {
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const kind = feedback?.kind ?? null;
    const key = feedback?.key ?? null;

    useEffect(() => {
        if (kind === null) return;
        const active = kind === "saved" ? refs.save : refs.discard;
        const other = kind === "saved" ? refs.discard : refs.save;
        const rootEl = refs.root.current;
        if (!rootEl || !active.wrap.current || !other.wrap.current) return;

        const activeWrap = active.wrap.current;
        // The pressed button itself (its fill is light in dark mode) must fade out, or its edge shows around the pill
        const activeButton = activeWrap.firstElementChild;
        const otherWrapWidth = other.wrap.current.offsetWidth;
        const activeWidth = activeWrap.offsetWidth;
        const rootWidth = rootEl.offsetWidth;
        // The bar ends as a compact pill pinned to its right edge: left padding + just enough width for the label
        const padLeft = rootWidth - activeWidth - otherWrapWidth - GAP_PX;
        const pillWidth = Math.max(activeWidth, Math.ceil(active.label.current?.offsetWidth ?? 0) + MARK_PX + MARK_GAP_PX + PILL_PAD_PX);
        const finalRootWidth = padLeft + pillWidth;
        rootEl.style.width = `${rootWidth}px`;
        rootEl.style.overflow = "hidden";
        rootEl.style.pointerEvents = "none";
        activeWrap.style.flex = "0 0 auto";

        const animations: Animation[] = [];
        const play = (el: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
            if (!el) return null;
            const animation = el.animate(keyframes, { fill: "both", ...options });
            animations.push(animation);
            return animation;
        };

        const reduced = SAVED_TOAST.honorReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const spring = CSS.supports("animation-timing-function", SAVED_TOAST.spring) ? SAVED_TOAST.spring : SAVED_TOAST.springFallback;
        const out = "cubic-bezier(0.22, 1, 0.36, 1)";
        const { holdMs, dissolveMs } = SAVED_TOAST;
        const gapSide = kind === "saved" ? "marginLeft" : "marginRight";

        let dissolve: Animation | null;
        if (reduced) {
            active.mark.current?.style.setProperty("stroke-dashoffset", "0");
            play(other.wrap.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 140 });
            play(active.idle.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 140 });
            play(activeButton, [{ opacity: 1 }, { opacity: 0 }], { duration: 140 });
            play(active.done.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 140 });
            active.label.current?.style.setProperty("opacity", "1");
            dissolve = play(rootEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, delay: holdMs - 160, fill: "forwards" });
        } else {
            // The bar contracts around the pressed button while the other one folds away (width, gap, a trace of blur)
            play(rootEl, [{ width: `${rootWidth}px` }, { width: `${finalRootWidth}px` }], { duration: 320, easing: out });
            play(activeWrap, [{ width: `${activeWidth}px` }, { width: `${pillWidth}px` }], { duration: 320, easing: out });
            play(other.wrap.current, [
                { width: `${otherWrapWidth}px`, [gapSide]: "0px", opacity: 1, filter: "blur(0px)" },
                { width: "0px", [gapSide]: `-${GAP_PX}px`, opacity: 0, filter: "blur(2px)" },
            ], { duration: 320, easing: out });
            // The pressed button's label lifts away while the confirmation settles into the same button
            play(active.idle.current, [{ opacity: 1, transform: "translateY(0)", filter: "blur(0px)" }, { opacity: 0, transform: "translateY(-5px)", filter: "blur(2px)" }], { duration: 160, easing: "ease-in" });
            play(activeButton, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-in" });
            play(active.done.current, [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "scale(1)" }], { duration: 420, delay: 60, easing: spring });
            play(active.label.current, [{ opacity: 0, transform: "translateY(5px)", filter: "blur(3px)" }, { opacity: 1, transform: "translateY(0)", filter: "blur(0px)" }], { duration: 340, delay: 140, easing: out });
            if (kind === "saved") {
                play(active.mark.current, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 240, delay: 200, easing: "cubic-bezier(0.33, 1, 0.68, 1)" });
            } else {
                play(active.mark.current, [{ opacity: 0, transform: "rotate(-70deg)" }, { opacity: 1, transform: "rotate(0deg)" }], { duration: 320, delay: 160, easing: out });
            }
            dissolve = play(
                rootEl,
                [{ opacity: 1, filter: "blur(0px)", transform: "scale(1)" }, { opacity: 0, filter: "blur(6px)", transform: "scale(1.03)" }],
                { duration: dissolveMs, delay: holdMs, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" },
            );
        }

        dissolve?.finished.then(() => onDoneRef.current()).catch(() => { /* cancelled */ });
        return () => {
            animations.forEach((a) => a.cancel());
            rootEl.style.width = "";
            rootEl.style.overflow = "";
            rootEl.style.pointerEvents = "";
            activeWrap.style.flex = "";
            active.mark.current?.style.removeProperty("stroke-dashoffset");
        };
    }, [kind, key]);
}
