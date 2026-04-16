export interface Project {
    id: number;
    name: string;
    description?: string | null;
    status: string;
    startDate?: Date | null;
    endDate?: Date | null;
    createdAt: Date;
    updatedAt?: Date | null;
    deletedAt?: Date | null;
    workspaceId?: number | null;
    image?: string | null;
}
