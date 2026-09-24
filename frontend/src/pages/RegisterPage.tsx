import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Form, Input, message } from 'antd'
import { register } from '@/services/authService'

type RegisterForm = {
  email: string
  code: string
  password: string
  confirm: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [form] = Form.useForm<RegisterForm>()

  const sendCode = async () => {
    const email = form.getFieldValue('email')
    if (!email) {
      message.warning('请先填写邮箱')
      return
    }
    setSending(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
      form.setFieldValue('code', '123456')
      message.success('验证码已发送（注册页本地校验码：123456）')
    } finally {
      setSending(false)
    }
  }

  const onFinish = async (values: RegisterForm) => {
    if (values.code !== '123456') {
      message.error('验证码错误')
      return
    }
    if (values.password !== values.confirm) {
      message.error('两次密码不一致')
      return
    }
    setLoading(true)
    try {
      const data = await register({
        email: values.email,
        password: values.password,
      })
      message.success('注册成功，请查收验证邮件')
      navigate(`/verify-email?email=${encodeURIComponent(data.email)}&pending=1`)
    } catch (e) {
      const err = e as Error
      message.error(err.message || '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="avatar" aria-hidden />
          <div>
            <div className="side-title">漫长游记</div>
            <div className="side-sub">注册后可多端同步</div>
          </div>
        </div>
        <h1>注册</h1>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input placeholder="you@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="验证码"
            name="code"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <div className="code-row">
              <Input placeholder="6 位验证码" />
              <Button onClick={sendCode} loading={sending}>
                发送验证码
              </Button>
            </div>
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 8, message: '至少 8 位' },
            ]}
          >
            <Input.Password placeholder="至少 8 位" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            label="确认密码"
            name="confirm"
            rules={[{ required: true, message: '请再次输入密码' }]}
          >
            <Input.Password placeholder="再次输入密码" autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            创建账号
          </Button>
        </Form>
        <p className="auth-switch">
          <Link to="/login">已有账号？去登录</Link>
        </p>
      </div>
    </div>
  )
}
