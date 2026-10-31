/** Which confirmation the section Save / Discard bar plays after the user acts */
export type SectionFeedbackKind = "saved" | "discarded";

export interface SectionFeedback {
    kind: SectionFeedbackKind;
    /** Changes on every confirmation so the same kind can replay */
    key: number;
}
