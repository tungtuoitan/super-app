import { useRef, useLayoutEffect, forwardRef } from "react";

interface AutoResizeTextareaProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
    ({ value, onChange, placeholder, className, onKeyDown }, forwardedRef) => {
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
                rows={5}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                onKeyDown={onKeyDown}
                className={`resize-none overflow-hidden bg-transparent placeholder:opacity-20 outline-none w-full ${className}`}
            />
        );
    }
);
