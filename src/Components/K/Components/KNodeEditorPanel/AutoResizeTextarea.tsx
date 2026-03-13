import { useRef, useLayoutEffect } from "react";

interface AutoResizeTextareaProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function AutoResizeTextarea({ value, onChange, placeholder, className, onKeyDown }: AutoResizeTextareaProps) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        if (!ref.current) return;
        ref.current.style.height = "auto";
        ref.current.style.height = ref.current.scrollHeight + "px";
    }, [value]);

    return (
        <textarea
            ref={ref}
            rows={5}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            onKeyDown={onKeyDown}
            className={`resize-none overflow-hidden bg-transparent placeholder:opacity-20 outline-none w-full ${className}`}
        />
    );
}
