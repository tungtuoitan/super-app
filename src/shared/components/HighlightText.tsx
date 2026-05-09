/**
 * HighlightText — highlights matching substring, diacritic-insensitive.
 * "bat" matches "Bát", "duong" matches "đường", etc.
 */

import React from "react";
import { removeDiacritics } from "@/shared";

interface HighlightTextProps {
    text: string;
    highlight: string;
    className?: string;
}

export function HighlightText({ text, highlight, className = "" }: HighlightTextProps) {
    if (!highlight || !highlight.trim()) {
        return <span className={className}>{text}</span>;
    }

    const nfcText         = text.normalize("NFC");
    const normalizedText  = removeDiacritics(nfcText).toLowerCase();
    const normalizedQuery = removeDiacritics(highlight.trim()).toLowerCase();

    if (!normalizedQuery) return <span className={className}>{nfcText}</span>;

    const parts: React.ReactNode[] = [];
    let i = 0;

    while (i < nfcText.length) {
        const matchIdx = normalizedText.indexOf(normalizedQuery, i);
        if (matchIdx === -1) {
            parts.push(nfcText.slice(i));
            break;
        }
        if (matchIdx > i) parts.push(nfcText.slice(i, matchIdx));
        parts.push(
            <mark
                key={matchIdx}
                className="bg-yellow-400/80 text-black rounded-sm px-0.5"
                style={{ backgroundColor: "rgb(250 204 21 / 0.8)" }}
            >
                {nfcText.slice(matchIdx, matchIdx + normalizedQuery.length)}
            </mark>,
        );
        i = matchIdx + normalizedQuery.length;
    }

    return <span className={className}>{parts.length ? parts : nfcText}</span>;
}
