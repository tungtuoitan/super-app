/**
 * Centralized API Client
 * Base HTTP client with interceptors and error handling
 * Provides centralized request/response handling with authentication and error management
 */

import { API_CONFIG } from '../../config/api.config';
import type { ApiRequestConfig } from '../../types';

/**
 * Custom API Error class for better error handling
 * Provides structured error information for API failures
 */
export class ApiError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/**
 * API Client class for handling HTTP requests
 * Singleton pattern with centralized configuration and error handling
 */
class ApiClient {
    private baseURL: string;
    private defaultHeaders: Record<string, string>;

    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.defaultHeaders = API_CONFIG.headers;
    }

    /**
     * Build full URL with query parameters
     * @param endpoint API endpoint path
     * @param params Optional query parameters
     * @returns Complete URL with query string
     */
    private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
        const url = `${this.baseURL}${endpoint}`;

        if (!params) return url;

        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            searchParams.append(key, String(value));
        });

        return `${url}?${searchParams.toString()}`;
    }

    /**
     * Generic request method
     * @param endpoint API endpoint path
     * @param config Request configuration options
     * @returns Promise resolving to typed response data
     */
    async request<T>(endpoint: string, config: ApiRequestConfig = {}): Promise<T> {
        const { method = 'GET', headers = {}, body, params } = config;

        const url = this.buildUrl(endpoint, params);

        const requestHeaders = {
            ...this.defaultHeaders,
            ...headers,
        };

        // Get auth token from localStorage if available
        const token = localStorage.getItem('userToken');
        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        const options: RequestInit = {
            method,
            headers: requestHeaders,
        };

        if (body) {
            if (body instanceof FormData) {
                // Remove Content-Type for FormData - browser will set it with boundary
                delete requestHeaders['Content-Type'];
                options.body = body;
            } else {
                options.body = JSON.stringify(body);
            }
        }

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                // Handle 401 Unauthorized - dispatch event to trigger logout
                if (response.status === 401) {
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }

                throw new ApiError(
                    response.status,
                    response.statusText,
                    `API request failed: ${response.statusText}`
                );
            }

            const data = await response.json();
            return data as T;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            console.error('Network Error:', error);
            throw new Error(`Network error: ${error}`);
        }
    }

    /**
     * Convenience methods for HTTP verbs
     */
    
    get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'POST', body, headers });
    }

    put<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>(endpoint, { method: 'PUT', body });
    }

    delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
