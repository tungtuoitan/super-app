
/**
 * Standard API response wrapper
 * Matches backend ResultOptions DTO
 */
export interface ResultOptions<T = any> {
    success: boolean;
    message?: string;
    object?: T; // Single object result
    data?: T[]; // Array result
    totalCount?: number; // Total count for pagination
    status?: number;
    reference?: string;
    reference2?: string;
    reference3?: string;
    reference4?: string;
    reference5?: string;
}
