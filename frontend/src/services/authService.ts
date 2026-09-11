import api, { shouldMock, toApiError } from '@/services/api'
import {
  mockLogin,
  mockMe,
  mockRegister,
  mockResendVerification,
  mockSendLoginCode,
  mockVerifyEmail,
  mockChangePassword,
  mockLogout,
} from '@/mocks/auth'
import { useAuthStore } from '@/stores/useAuthStore'
import type {
  LoginData,
  LoginRequest,
  LoginSendCodeData,
  MeResponse,
  RegisterData,
  RegisterRequest,
  ResendVerificationData,
  VerifyEmailData,
} from '@/types/auth'
import type { UserDTO } from '@/types/api'

const mockAuth = () => shouldMock('auth')

export async function login(body: LoginRequest): Promise<LoginData> {
  if (mockAuth()) return mockLogin(body)
  try {
    const { data } = await api.post('/auth/login', body)
    return data.data as LoginData
  } catch (e) {
    throw toApiError(e)
  }
}

export async function sendLoginCode(email: string): Promise<LoginSendCodeData> {
  if (mockAuth()) return mockSendLoginCode(email)
  try {
    const { data } = await api.post('/auth/login/send-code', { email })
    return data.data as LoginSendCodeData
  } catch (e) {
    throw toApiError(e)
  }
}

export async function register(body: RegisterRequest): Promise<RegisterData> {
  if (mockAuth()) return mockRegister(body)
  try {
    const { data } = await api.post('/auth/register', body)
    return data.data as RegisterData
  } catch (e) {
    throw toApiError(e)
  }
}

export async function verifyEmail(token: string): Promise<VerifyEmailData> {
  if (mockAuth()) return mockVerifyEmail(token)
  try {
    const { data } = await api.post('/auth/verify-email', { token })
    return data.data as VerifyEmailData
  } catch (e) {
    throw toApiError(e)
  }
}

export async function resendVerification(
  email: string,
): Promise<ResendVerificationData> {
  if (mockAuth()) return mockResendVerification(email)
  try {
    const { data } = await api.post('/auth/resend-verification', { email })
    return data.data as ResendVerificationData
  } catch (e) {
    throw toApiError(e)
  }
}

export async function fetchMe(): Promise<UserDTO> {
  if (mockAuth()) return mockMe(useAuthStore.getState().token)
  try {
    const { data } = await api.get<MeResponse>('/auth/me')
    return data.data
  } catch (e) {
    throw toApiError(e)
  }
}

export async function logout(): Promise<void> {
  if (mockAuth()) {
    await mockLogout()
    useAuthStore.getState().clearSession()
    return
  }
  try {
    await api.post('/auth/logout')
  } catch (e) {
    // still clear local session
    void e
  } finally {
    useAuthStore.getState().clearSession()
  }
}

export async function changePassword(body: {
  current_password: string
  new_password: string
}): Promise<{ ok: true }> {
  if (mockAuth()) {
    return mockChangePassword(useAuthStore.getState().token, body)
  }
  try {
    const { data } = await api.post('/auth/change-password', body)
    return data.data as { ok: true }
  } catch (e) {
    throw toApiError(e)
  }
}
