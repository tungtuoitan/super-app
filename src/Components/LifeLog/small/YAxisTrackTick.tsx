/**
 * YAxisTrackTick - Custom Y-axis tick with icon + name for frequency chart
 */

import { resolveTrackColor } from "@/utils/lifeLog.utils";
import { TrackIconDisplay } from "./TrackIconDisplay";
import type { FreqTrack } from "@/types/lifeLog.types";

function TrackIconDisplaySvg({ size }: { size: number }) {
    return (
        <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 11a2 2 0 1 1-4 0 4 4 0 0 1 4-4" />
            <path d="M6 6a2 2 0 0 0-2 2v1a8 8 0 0 0 8 8 8 8 0 0 0 8-8v-2a2 2 0 0 0-2-2h-1a2 2 0 0 1-2-2 2 2 0 0 0-2-2H9a2 2 0 0 0-2 2A2 2 0 0 1 5 6H4" />
        </svg>
    );
}

export function YAxisTrackTick(props: any) {
    const { x, y, payload, freqData } = props;
    const info = freqData[payload?.value];
    if (!info) return null;
    const track = info.track;
    const color = resolveTrackColor(track.color, info.trackIdx);
    const iconSize = 16;
    const gap = 4;
    const maxNameWidth = 56;
    const totalWidth = iconSize + gap + maxNameWidth;

    return (
        <g transform={`translate(${x - totalWidth - 4},${y - iconSize / 2})`}>
            <rect x={0} y={0} width={iconSize} height={iconSize} rx={3} fill={color} />
            <foreignObject x={0} y={0} width={iconSize} height={iconSize} style={{ overflow: "visible" }}>
                <div
                    style={{
                        width: iconSize, height: iconSize,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "white", fontSize: 10,
                    }}
                >
                    <TrackIconDisplaySvg size={iconSize} />
                </div>
            </foreignObject>
            <text
                x={iconSize + gap}
                y={iconSize / 2 + 1}
                dominantBaseline="middle"
                fill="#9ca3af"
                fontSize={10}
                style={{ maxWidth: maxNameWidth }}
            >
                {track.name.length > 9 ? track.name.slice(0, 8) + "…" : track.name}
            </text>
        </g>
    );
}
