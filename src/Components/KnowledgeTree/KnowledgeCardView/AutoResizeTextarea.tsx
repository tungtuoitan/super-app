import { useRef, useEffect } from "react";

export function AutoResizeTextarea({ value, onChange, placeholder, className, onKeyDown }: {
    value: string; onChange: (v: string) => void;
    placeholder?: string; className?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    useEffect(() => {
        if (!ref.current) return;
        ref.current.style.height = "auto";
        ref.current.style.height = ref.current.scrollHeight + "px";
    }, [value]);
    return (
        <textarea ref={ref} rows={1} value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder} onKeyDown={onKeyDown}
            className={`resize-none overflow-hidden bg-transparent outline-none w-full ${className}`}
        />
    );
}
