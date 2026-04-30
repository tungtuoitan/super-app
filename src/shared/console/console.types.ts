
export type ConsoleMessageType = "error" | "warning" | "info" | "success" | "special-success";

export interface ConsoleMessage {
    id: string;
    type: ConsoleMessageType;
    message: string;
    timestamp: Date;
}
