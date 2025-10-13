import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

class ApiClient {
    private instance: AxiosInstance

    constructor() {
        this.instance = axios.create({
            baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        })

        this.setupInterceptors()
    }

    private setupInterceptors() {
        // Request interceptor
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // Add auth token
                const token = localStorage.getItem('userToken')
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`
                }

                // Log in development
                if (process.env.NODE_ENV === 'development') {
                    console.log('→', config.method?.toUpperCase(), config.url)
                }

                return config
            },
            (error: AxiosError) => {
                return Promise.reject(error)
            }
        )

        // Response interceptor
        this.instance.interceptors.response.use(
            (response: AxiosResponse) => {
                // Log in development
                if (process.env.NODE_ENV === 'development') {
                    console.log('←', response.status, response.config.url)
                }
                return response
            },
            (error: AxiosError) => {
                // Handle common errors
                if (error.response?.status === 401) {
                    // Unauthorized - clear token and redirect
                    // TEMPORARILY DISABLED: User hasn't implemented login yet
                    // localStorage.removeItem('userToken')
                    // window.location.href = '/login'
                    console.warn('401 Unauthorized - Login redirect disabled for development')
                }

                if (error.response?.status === 403) {
                    // Forbidden
                    console.error('Access forbidden')
                }

                if (error.response?.status && error.response?.status >= 500) {
                    // Server error
                    console.error('Server error:', error.response.status)
                }

                return Promise.reject(error)
            }
        )
    }

    // GET request
    async get<T>(url: string, config?: any): Promise<T> {
        const response = await this.instance.get<T>(url, config)
        return response.data
    }

    // POST request
    async post<T>(url: string, data?: any, config?: any): Promise<T> {
        const response = await this.instance.post<T>(url, data, config)
        return response.data
    }

    // PUT request
    async put<T>(url: string, data?: any, config?: any): Promise<T> {
        const response = await this.instance.put<T>(url, data, config)
        return response.data
    }

    // PATCH request
    async patch<T>(url: string, data?: any, config?: any): Promise<T> {
        const response = await this.instance.patch<T>(url, data, config)
        return response.data
    }

    // DELETE request
    async delete<T>(url: string, config?: any): Promise<T> {
        const response = await this.instance.delete<T>(url, config)
        return response.data
    }
}

export const apiClient = new ApiClient()