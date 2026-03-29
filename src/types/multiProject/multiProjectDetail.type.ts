export type TabType = "taskList" | "kanban" | "proTimeline" | "timeline" | "taskFlow";

export interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}
