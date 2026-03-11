/**
 * HighlightText - Highlights matching text in a string
 * Used for search result highlighting in tree nodes
 */

import React from "react";

interface HighlightTextProps {
    text: string;
    highlight: string;
    className?: string;
}

/**
 * Highlights matching portions of text with a yellow background
 * Case-insensitive matching
 */
export function KHighlightText({ text, highlight, className = "" }: HighlightTextProps) {
    // If no highlight text, return original text
    if (!highlight || !highlight.trim()) {
        return <span className={className}>{text}</span>;
    }

    // Escape special regex characters in highlight text
    const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedHighlight = escapeRegex(highlight.trim());

    // Split text by matching parts (case-insensitive)
    const regex = new RegExp(`(${escapedHighlight})`, "gi");
    const parts = text?.split(regex) || [];

    return (
        <span className={className}>
            {parts.map((part, index) => {
                // Check if this part matches the highlight text (case-insensitive)
                const isMatch = part.toLowerCase() === highlight.toLowerCase();

                return isMatch ? (
                    <mark
                        key={index}
                        className="bg-yellow-400/80 text-black rounded-sm px-0.5"
                        style={{
                            backgroundColor: "rgb(250 204 21 / 0.8)", // yellow-400/80
                        }}
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                );
            })}
        </span>
    );
}
