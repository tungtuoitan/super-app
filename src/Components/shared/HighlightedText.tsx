/**
 * Highlighted Text Component
 * Highlights matching characters in text (VS Code style)
 */

import React from "react";

interface HighlightedTextProps {
    text: string;
    matchIndices: number[];
    className?: string;
    highlightClassName?: string;
}

export function HighlightedText({ text, matchIndices, className = "", highlightClassName = "text-blue-400 font-semibold" }: HighlightedTextProps) {
    if (matchIndices.length === 0) {
        return <span className={className}>{text}</span>;
    }

    const matchSet = new Set(matchIndices);
    const parts: React.ReactNode[] = [];
    let currentSegment = "";
    let isHighlighted = false;

    for (let i = 0; i < text.length; i++) {
        const shouldHighlight = matchSet.has(i);

        if (shouldHighlight !== isHighlighted) {
            // Segment boundary - push current segment
            if (currentSegment) {
                parts.push(
                    isHighlighted ? (
                        <span key={`h-${i}`} className={highlightClassName}>
                            {currentSegment}
                        </span>
                    ) : (
                        <span key={`n-${i}`}>{currentSegment}</span>
                    )
                );
            }
            currentSegment = text[i];
            isHighlighted = shouldHighlight;
        } else {
            currentSegment += text[i];
        }
    }

    // Push final segment
    if (currentSegment) {
        parts.push(
            isHighlighted ? (
                <span key={`h-end`} className={highlightClassName}>
                    {currentSegment}
                </span>
            ) : (
                <span key={`n-end`}>{currentSegment}</span>
            )
        );
    }

    return <span className={className}>{parts}</span>;
}
