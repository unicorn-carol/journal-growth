export type ApiSuccess<T> = {
  code: number
  message: string
  data: T
}

export type ApiError = {
  code: number
  message: string
  data: null
}

export type UserDTO = {
  id: string
  email: string
  email_verified: boolean
  display_name: string
  created_at?: string
}
