/**
 * ProjectDetail Type Definitions
 */

export type TabType = "general" | "taskList" | "kanban" | "timeline";

export interface TabConfig {
    id: TabType;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
}
