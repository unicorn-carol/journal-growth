import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Form, Input, Space, message } from 'antd'
import { login, resendVerification, sendLoginCode } from '@/services/authService'
import { useMock } from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { mockAuthAccounts } from '@/mocks/auth'

type LoginForm = {
  email: string
  password: string
  code: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [form] = Form.useForm<LoginForm>()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [codeReady, setCodeReady] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const onSendCode = async () => {
    try {
      const email = await form.validateFields(['email'])
      const password = form.getFieldValue('password')
      if (!password) {
        message.warning('请先输入密码，再获取验证码')
        return
      }
      setSending(true)
      await sendLoginCode(email.email)
      setCodeReady(true)
      message.success(
        useMock
          ? `验证码已发送（开发：${mockAuthAccounts.loginCode}）`
          : '验证码已发送，请查看后端终端日志',
      )
    } catch (e) {
      if ((e as { errorFields?: unknown }).errorFields) return
      const err = e as Error
      message.error(err.message || '发送失败')
    } finally {
      setSending(false)
    }
  }

  const onFinish = async (values: LoginForm) => {
    if (!codeReady) {
      message.warning('请先获取并填写验证码')
      return
    }
    setLoading(true)
    setUnverifiedEmail(null)
    try {
      const data = await login({
        email: values.email,
        password: values.password,
        code: values.code,
      })
      setSession(data.access_token, data.user)
      navigate('/diary', { replace: true })
    } catch (e) {
      const err = e as Error & { code?: number }
      if (err.code === 40301) {
        setUnverifiedEmail(values.email.trim())
        return
      }
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const onResend = async () => {
    if (!unverifiedEmail) return
    setResending(true)
    try {
      await resendVerification(unverifiedEmail)
      message.success(
        useMock
          ? '已重发验证邮件（请查看浏览器控制台验证链接）'
          : '已重发验证邮件（请查看后端终端日志中的验证链接）',
      )
    } catch (e) {
      const err = e as Error
      message.error(err.message || '重发失败')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="avatar" aria-hidden />
          <div>
            <div className="side-title">漫长游记</div>
            <div className="side-sub">把漫长的自己慢慢写清楚</div>
          </div>
        </div>
        <h1>登录</h1>

        {unverifiedEmail ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="邮箱未验证"
            description={
              <div>
                <p style={{ margin: '0 0 8px' }}>
                  账号 {unverifiedEmail} 尚未完成邮箱验证，无法进入主站。
                </p>
                <Button size="small" loading={resending} onClick={onResend}>
                  重发验证邮件
                </Button>
                {useMock ? (
                  <Button size="small" type="link" href={`/verify-email?token=verify-ok`}>
                    打开示例验证页
                  </Button>
                ) : null}
              </div>
            }
          />
        ) : null}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          initialValues={
            useMock
              ? {
                  email: mockAuthAccounts.verified.email,
                  password: mockAuthAccounts.verified.password,
                }
              : undefined
          }
        >
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ required: true, message: '请输入邮箱' }]}
          >
            <Input placeholder="you@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              placeholder="••••••••"
              autoComplete="current-password"
              onChange={() => setCodeReady(false)}
            />
          </Form.Item>
          <Form.Item
            label="验证码"
            name="code"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input placeholder="6 位验证码" maxLength={6} />
              <Button onClick={onSendCode} loading={sending}>
                发送
              </Button>
            </Space.Compact>
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            进入日记
          </Button>
        </Form>

        <p className="auth-hint">
          流程：填写邮箱密码 → 点「发送」获取验证码 → 填入后登录
          {useMock ? (
            <>
              <br />
              开发账号：{mockAuthAccounts.verified.email} / password123 / 验证码{' '}
              {mockAuthAccounts.loginCode}
              <br />
              未验证：{mockAuthAccounts.unverified.email} / password123
            </>
          ) : (
            <>
              <br />
              验证码与邮箱验证链接会打印在后端终端（MAIL_DEV_PRINT）。
            </>
          )}
        </p>
        <p className="auth-switch">
          <Link to="/register">还没有账号？去注册</Link>
        </p>
      </div>
    </div>
  )
}
