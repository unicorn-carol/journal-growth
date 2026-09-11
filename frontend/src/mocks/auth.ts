import type {
  LoginData,
  LoginRequest,
  LoginSendCodeData,
  RegisterData,
  RegisterRequest,
  ResendVerificationData,
  VerifyEmailData,
} from '@/types/auth'
import type { UserDTO } from '@/types/api'

type MockUser = UserDTO & { password: string }

const users: MockUser[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'carol@mail.com',
    email_verified: true,
    display_name: 'Carol',
    created_at: '2026-08-01T02:00:00Z',
    password: 'password123',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'pending@mail.com',
    email_verified: false,
    display_name: 'Pending',
    created_at: '2026-08-15T02:00:00Z',
    password: 'password123',
  },
]

const tokens = new Map<string, string>([['verify-ok', 'pending@mail.com']])
/** email -> latest login OTP */
const loginCodes = new Map<string, string>()

function delay(ms = 180) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const mockAuthAccounts = {
  verified: { email: 'carol@mail.com', password: 'password123' },
  unverified: { email: 'pending@mail.com', password: 'password123' },
  loginCode: '123456',
}

export async function mockSendLoginCode(email: string): Promise<LoginSendCodeData> {
  await delay()
  const normalized = email.trim().toLowerCase()
  const user = users.find((u) => u.email === normalized)
  if (!user) {
    const err = new Error('用户不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  loginCodes.set(normalized, mockAuthAccounts.loginCode)
  console.info(`[Mock] 登录验证码 ${mockAuthAccounts.loginCode} → ${normalized}`)
  return { sent: true, delivery: 'dev_print' }
}

export async function mockLogin(body: LoginRequest): Promise<LoginData> {
  await delay()
  const email = body.email.trim().toLowerCase()
  const user = users.find((u) => u.email === email)
  if (!user || user.password !== body.password) {
    const err = new Error('邮箱或密码错误') as Error & { code: number }
    err.code = 40101
    throw err
  }
  const expected = loginCodes.get(email)
  if (!expected || body.code.trim() !== expected) {
    const err = new Error('验证码错误或已过期') as Error & { code: number }
    err.code = 40001
    throw err
  }
  if (!user.email_verified) {
    const err = new Error('邮箱未验证') as Error & { code: number }
    err.code = 40301
    throw err
  }
  loginCodes.delete(email)
  const { password: _pw, ...safe } = user
  return {
    access_token: `mock-token-${safe.id}`,
    token_type: 'bearer',
    expires_in: 604800,
    user: safe,
  }
}

export async function mockRegister(body: RegisterRequest): Promise<RegisterData> {
  await delay()
  const email = body.email.trim().toLowerCase()
  if (body.password.length < 8) {
    const err = new Error('密码至少 8 位') as Error & { code: number }
    err.code = 40001
    throw err
  }
  if (users.some((u) => u.email === email)) {
    const err = new Error('邮箱已注册') as Error & { code: number }
    err.code = 40901
    throw err
  }
  const id = crypto.randomUUID()
  users.push({
    id,
    email,
    email_verified: false,
    display_name: email.split('@')[0] || 'User',
    created_at: new Date().toISOString(),
    password: body.password,
  })
  const token = `verify-${id.slice(0, 8)}`
  tokens.set(token, email)
  console.info(`[Mock] 验证链接: /verify-email?token=${token}`)
  return {
    user_id: id,
    email,
    email_verified: false,
    verification_delivery: 'dev_print',
  }
}

export async function mockVerifyEmail(token: string): Promise<VerifyEmailData> {
  await delay()
  const email = tokens.get(token)
  if (!email) {
    const err = new Error('验证链接无效或已过期') as Error & { code: number }
    err.code = 40001
    throw err
  }
  const user = users.find((u) => u.email === email)
  if (!user) {
    const err = new Error('验证链接无效或已过期') as Error & { code: number }
    err.code = 40001
    throw err
  }
  user.email_verified = true
  return { email: user.email, email_verified: true }
}

export async function mockResendVerification(
  email: string,
): Promise<ResendVerificationData> {
  await delay()
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user) {
    const err = new Error('用户不存在') as Error & { code: number }
    err.code = 40401
    throw err
  }
  const token = `verify-resend-${user.id.slice(0, 8)}`
  tokens.set(token, user.email)
  console.info(`[Mock] 重发验证链接: /verify-email?token=${token}`)
  return { sent: true, verification_delivery: 'dev_print' }
}

export async function mockMe(token: string | null): Promise<UserDTO> {
  await delay()
  if (!token?.startsWith('mock-token-')) {
    const err = new Error('未登录或 token 无效') as Error & { code: number }
    err.code = 40101
    throw err
  }
  const id = token.replace('mock-token-', '')
  const user = users.find((u) => u.id === id)
  if (!user) {
    const err = new Error('未登录或 token 无效') as Error & { code: number }
    err.code = 40101
    throw err
  }
  const { password: _pw, ...safe } = user
  return safe
}

export async function mockChangePassword(
  token: string | null,
  body: { current_password: string; new_password: string },
): Promise<{ ok: true }> {
  await delay()
  if (!token?.startsWith('mock-token-')) {
    const err = new Error('未登录或 token 无效') as Error & { code: number }
    err.code = 40101
    throw err
  }
  const id = token.replace('mock-token-', '')
  const user = users.find((u) => u.id === id)
  if (!user) {
    const err = new Error('未登录或 token 无效') as Error & { code: number }
    err.code = 40101
    throw err
  }
  if (user.password !== body.current_password) {
    const err = new Error('当前密码不正确') as Error & { code: number }
    err.code = 40001
    throw err
  }
  if (body.new_password.length < 8) {
    const err = new Error('新密码至少 8 位') as Error & { code: number }
    err.code = 40001
    throw err
  }
  user.password = body.new_password
  return { ok: true }
}

export async function mockLogout(): Promise<void> {
  await delay(40)
}
