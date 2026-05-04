import { useRef, useLayoutEffect, forwardRef } from "react";

interface KAutoResizeTextareaProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    rows?: number;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const KAutoResizeTextarea = forwardRef<HTMLTextAreaElement, KAutoResizeTextareaProps>(
    ({ value, onChange, placeholder, className, style, rows = 5, onKeyDown }, forwardedRef) => {
        const localRef = useRef<HTMLTextAreaElement>(null);

        useLayoutEffect(() => {
            const el = localRef.current;
            if (!el) return;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
        }, [value]);

        return (
            <textarea
                ref={(el) => {
                    (localRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                    if (typeof forwardedRef === "function") forwardedRef(el);
                    else if (forwardedRef) forwardedRef.current = el;
                }}
                rows={rows}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={style}
                onKeyDown={onKeyDown}
                className={`resize-none overflow-hidden bg-transparent placeholder:opacity-20 outline-none w-full ${className}`}
            />
        );
    }
);
