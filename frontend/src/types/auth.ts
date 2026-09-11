import type { ApiSuccess, UserDTO } from '@/types/api'

export type LoginRequest = {
  email: string
  password: string
  code: string
}

export type LoginSendCodeRequest = {
  email: string
}

export type LoginSendCodeData = {
  sent: boolean
  delivery: 'dev_print' | 'email'
}

export type RegisterRequest = {
  email: string
  password: string
}

export type LoginData = {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: UserDTO
}

export type RegisterData = {
  user_id: string
  email: string
  email_verified: boolean
  verification_delivery: 'dev_print' | 'email'
}

export type VerifyEmailData = {
  email: string
  email_verified: boolean
}

export type ResendVerificationData = {
  sent: boolean
  verification_delivery: 'dev_print' | 'email'
}

export type LoginResponse = ApiSuccess<LoginData>
export type LoginSendCodeResponse = ApiSuccess<LoginSendCodeData>
export type RegisterResponse = ApiSuccess<RegisterData>
export type VerifyEmailResponse = ApiSuccess<VerifyEmailData>
export type ResendVerificationResponse = ApiSuccess<ResendVerificationData>
export type MeResponse = ApiSuccess<UserDTO>
