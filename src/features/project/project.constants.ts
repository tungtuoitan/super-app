/**
 * Project Feature Constants
 * Status colors, priorities, filter defaults
 */

export const projectConstants = {
    // Status and Priority colors (GitHub-style)
    optionColor: {
        projectStatus: {
            colors: {
                paused: { bg: "#805f52", text: "#ffffff" },
                active: { bg: "#0969da", text: "#ffffff" },
                completed: { bg: "#1a7f64", text: "#ffffff" },
                dropped: { bg: "#57606a", text: "#ffffff" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#57606a", text: "#ffffff" },
        } as const,
        timelinePro: {
            colors: {
                paused:    { bg: "#805f52", text: "#E5E7EB" },
                active:    { bg: "#1E3A8A", text: "#E5E7EB" },
                completed: { bg: "#1F5E4B", text: "#E5E7EB" },
                dropped:   { bg: "#374151", text: "#E5E7EB" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#374151", text: "#E5E7EB" },
        } as const,
        taskStatus: {
            colors: {
                open: { bg: "#1f6f43", text: "#ffffff" },
                in_progress: { bg: "#FCCC3E", text: "#1a1a1a" },
                background_progress: { bg: "#534514", text: "#ffffff" },
                paused: { bg: "#575757", text: "#ffffff" },
                completed: { bg: "#6f42c1", text: "#ffffff" },
                on_hold: { bg: "#475363", text: "#ffffff" },
                cancelled: { bg: "#78716c", text: "#ffffff" },
                failed: { bg: "#a63636", text: "#ffffff" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#4b5563", text: "#ffffff" },
        } as const,
        timelineTask: {
            colors: {
                open: { bg: "#09331c", text: "#E5E7EB" },
                in_progress: { bg: "#6e560b", text: "#E5E7EB" },
                background_progress: { bg: "#251f0c", text: "#ffffff" },
                paused: { bg: "#464646", text: "#ffffff" },
                completed: { bg: "#311a5e", text: "#E5E7EB" },
                on_hold: { bg: "#2B2F45", text: "#E5E7EB" },
                cancelled: { bg: "#3d3730", text: "#E5E7EB" },
                failed: { bg: "#4A2E3A", text: "#E5E7EB" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#2b3038", text: "#E5E7EB" },
        } as const,
        taskPriority: {
            colors: {
                low: { bg: "#6e7681", text: "#ffffff" },
                medium: { bg: "#d29922", text: "#ffffff" },
                high: { bg: "#da3633", text: "#ffffff" },
                urgent: { bg: "rgb(255, 0, 0)", text: "#ffffff" },
            } as Record<string, { bg: string; text: string }>,
            default: { bg: "#6e7681", text: "#ffffff" },
        } as const,
    },
    optionOrder: {
        projectStatuses: {
            Paused: 1,
            Active: 2,
            Completed: 3,
            Dropped: 4,
        } as Record<string, number>,
        taskStatuses: {
            Open: 1,
            "In Progress": 2,
            "Bg Progress": 3,
            "Paused": 4,
            Completed: 5,
            "On Hold": 6,
            Cancelled: 7,
            Failed: 8,
        } as Record<string, number>,
        taskPriorities: {
            Low: 1,
            Medium: 2,
            High: 3,
            Urgent: 4,
        } as Record<string, number>,
    },
    filters: {
        views: {
            noteGrid: "noteGrid",
            wsGrid: "wsGrid",
            workspace: "workspace",
            k: "k",
            projectGrid: "projectGrid",
        } as const,
        defaults: {
            noteGrid: { statusCode: "active", deletedAt: "null" },
            wsGrid: { statusCode: "active", deletedAt: "null" },
            workspace: { statusCode: "active", deletedAt: "null" },
            k: { statusCode: "active", deletedAt: "null" },
            projectGrid: { statusCode: "active" },
            taskGrid: { status: "open,in_progress,background_progress,paused", priority: "low,medium,high" },
        } as const,
        taskDefaults: {
            status: "open,in_progress,background_progress,paused",
            priority: "low,medium,high",
        } as const,
        taskGroups: [
            { key: "status", label: "Status", standardRegistryType: "task_status" },
            { key: "priority", label: "Priority", standardRegistryType: "task_priority" },
        ] as const,
        groups: {
            noteGrid: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "noteStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "radio", defaultValue: "null" },
                { key: "createdAt", label: "Created Date", type: "dateRange", defaultValue: "" },
            ],
            wsGrid: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "workspaceStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "radio", defaultValue: "null" },
                { key: "createdAt", label: "Created Date", type: "dateRange", defaultValue: "" },
            ],
            workspace: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "noteStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "checkbox", defaultValue: "null" },
            ],
            k: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "noteStatus", defaultValue: "active" },
                { key: "deletedAt", label: "Deleted Status", type: "checkbox", defaultValue: "null" },
            ],
            projectGrid: [
                { key: "statusCode", label: "Status", type: "checkbox", standardRegistryType: "project_status", defaultValue: "active" },
            ],
            taskGrid: [
                { key: "status", label: "Status", type: "checkbox", standardRegistryType: "task_status", defaultValue: "open,in_progress" },
                { key: "priority", label: "Priority", type: "checkbox", standardRegistryType: "task_priority", defaultValue: "low,medium,high" },
            ],
        } as const,
    },
} as const;
