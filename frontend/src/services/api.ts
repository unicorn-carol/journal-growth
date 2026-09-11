import axios, { type AxiosError } from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    const isCredentialAttempt =
      url.includes('/auth/login') && !url.includes('/auth/login/send-code')
    if (status === 401 && !isCredentialAttempt) {
      useAuthStore.getState().clearSession()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default api

/** Global mock switch from env. */
export const useMock = import.meta.env.VITE_USE_MOCK === 'true'

/**
 * Progressive real-API cutover: when VITE_USE_MOCK=false, only listed
 * features hit the backend; others stay on mocks until their tasks.
 */
const REAL_FEATURES = new Set([
  'auth',
  'tags',
  'entries',
  'highlights',
  'ai',
  'self-awareness',
  'good-times',
  'imports',
])

export function shouldMock(feature: string): boolean {
  if (useMock) return true
  return !REAL_FEATURES.has(feature)
}

export type ApiError = Error & { code?: number }

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { code?: number; message?: string }
      | undefined
    if (data && typeof data.message === 'string') {
      const err = new Error(data.message) as ApiError
      err.code = data.code
      return err
    }
  }
  if (error instanceof Error) return error
  return new Error('请求失败')
}
