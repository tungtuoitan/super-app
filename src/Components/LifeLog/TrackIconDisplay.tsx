/**
 * TrackIconDisplay - renders a track icon: custom image (base64/path) or default Shell icon with track color
 */

import { Shell } from "lucide-react";

const SIZE = {
    sm: { img: "w-5 h-5",  icon: "w-3.5 h-3.5", wrap: "w-5 h-5"  },
    md: { img: "w-7 h-7",  icon: "w-5 h-5",      wrap: "w-7 h-7"  },
    lg: { img: "w-9 h-9",  icon: "w-6 h-6",      wrap: "w-9 h-9"  },
};

const isImageIcon = (v: string) => v.startsWith("/") || v.startsWith("data:image");

interface TrackIconDisplayProps {
    value?: string;
    trackColor?: string;
    size?: "sm" | "md" | "lg";
}

export function TrackIconDisplay({ value = "", trackColor, size = "md" }: TrackIconDisplayProps) {
    const s = SIZE[size];
    if (value && isImageIcon(value)) {
        return (
            <img
                src={value}
                alt=""
                className={`${s.img} object-cover rounded-md flex-shrink-0`}
                draggable={false}
            />
        );
    }
    return (
        <span
            className={`${s.wrap} inline-flex items-center justify-center rounded-md flex-shrink-0`}
            style={trackColor
                ? { backgroundColor: trackColor, color: "white" }
                : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }
            }
        >
            <Shell className={s.icon} />
        </span>
    );
}
