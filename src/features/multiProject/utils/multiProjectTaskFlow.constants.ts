/**
 * MultiProject Task Flow Constants
 * CSS and layout constants for the TaskFlow canvas.
 */

export const TASK_FLOW_CSS = `
.react-flow__connection-line { stroke: hsl(var(--primary)); stroke-width: 1.5; }

/* Reconnect anchor handles — only shown when edge is selected */
.react-flow__edgeanchor {
    fill: hsl(var(--primary));
    stroke: hsl(var(--background));
    stroke-width: 2;
    r: 5;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s, r 0.15s;
    cursor: grab;
}
.react-flow__edge.selected .react-flow__edgeanchor {
    opacity: 1;
    pointer-events: all;
}
.react-flow__edge.selected .react-flow__edgeanchor:hover { r: 7; }

/* MiniMap viewport indicator — yellow border around current view */
.minimap-yellow-frame .react-flow__minimap-mask {
    stroke: #facc15 !important;
    stroke-width: 2px !important;
}

/* Multi-selection bounding box (drag-select & ctrl+click) */
.react-flow__nodesselection-rect {
    background: rgba(59, 130, 246, 0.06) !important;
    border: 1.5px solid rgba(59, 130, 246, 0.4) !important;
    border-radius: 12px !important;
    pointer-events: none !important;
}
/* Drag selection rectangle */
.react-flow__selection {
    background: rgba(59, 130, 246, 0.06) !important;
    border: 1.5px solid rgba(59, 130, 246, 0.4) !important;
    border-radius: 4px !important;
}

/* In-progress task — rotating conic border */
@keyframes taskflow-rotate {
    0%   { --angle: 0deg; }
    100% { --angle: 360deg; }
}
@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}
.taskflow-inprogress {
    position: relative;
}
.taskflow-inprogress::before {
    content: '';
    position: absolute;
    inset: -1.5px;
    border-radius: inherit;
    background: conic-gradient(
        from var(--angle),
        transparent 0%,
        rgba(250, 204, 21, 0.6) 10%,
        transparent 20%
    );
    animation: taskflow-rotate 3s linear infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    padding: 1.5px;
    pointer-events: none;
    z-index: 1;
}
.taskflow-bgprogress {
    position: relative;
}
.taskflow-bgprogress::before {
    content: '';
    position: absolute;
    inset: -1.5px;
    border-radius: inherit;
    background: conic-gradient(
        from var(--angle),
        transparent 0%,
        rgba(56, 189, 248, 0.55) 10%,
        transparent 20%
    );
    animation: taskflow-rotate 5s linear infinite;
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    padding: 1.5px;
    pointer-events: none;
    z-index: 1;
}
`;

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 1;
export const PAN_SPEED = 0.8;
