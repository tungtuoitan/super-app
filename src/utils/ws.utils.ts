/**
 * Workspace Utilities
 * Helper functions for workspace data transformation and manipulation
 */

import { WsDTO } from "@/features/workspace/service/ws.service";
import {Ws} from "@/features/workspace/types/workspace.types";

/**
 * Transform WsDTO from API to Ws domain model
 * Converts string dates to Date objects
 *
 * @param dto - Workspace DTO from API
 * @returns Ws domain model
 */
export const transformAWs = (dto: WsDTO): Ws => {
    return {
        id: dto.id,
        name: dto.name,
        description: dto.description,
        createdAt: new Date(dto.createdAt),
        updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
        deletedAt: dto.deletedAt ? new Date(dto.deletedAt) : null,
        userId: dto.userId,
    };
};

/**
 * Transform array of WsDTOs from API to Ws domain models
 *
 * @param dtos - Array of WsDTOs from API
 * @returns Array of Ws domain models with transformed dates
 */
export const transformWs = (dtos: WsDTO[]): Ws[] => {
    return dtos.map(transformAWs);
};
