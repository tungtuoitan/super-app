export type KAttachmentType = "code" | "image" | "video" | "file";

export interface KAttachment {
    id: number;
    title: string;
    type: KAttachmentType;
    language?: string | null;
    content?: string | null;
    sortOrder: number;
}
