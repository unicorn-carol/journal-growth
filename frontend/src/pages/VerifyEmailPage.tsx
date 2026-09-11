import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Spin } from 'antd'
import { verifyEmail } from '@/services/authService'

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const pending = params.get('pending') === '1'
  const emailHint = params.get('email')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'fail'>(
    token ? 'loading' : pending ? 'idle' : 'fail',
  )
  const [email, setEmail] = useState(emailHint ?? '')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await verifyEmail(token)
        if (cancelled) return
        setEmail(data.email)
        setStatus('ok')
      } catch (e) {
        if (cancelled) return
        const err = e as Error
        setError(err.message || '验证失败')
        setStatus('fail')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="avatar" aria-hidden />
          <div>
            <div className="side-title">漫长游记</div>
            <div className="side-sub">邮箱验证</div>
          </div>
        </div>
        <h1>邮箱验证</h1>

        {status === 'loading' ? <Spin tip="正在验证…" /> : null}

        {status === 'idle' && pending ? (
          <Alert
            type="info"
            showIcon
            message="验证邮件已发送"
            description={
              <div>
                <p style={{ margin: '0 0 8px' }}>
                  {email ? `已向 ${email} 发送验证链接。` : '请查收验证邮件。'}
                  开发环境下验证链接会打印在后端终端日志（MAIL_DEV_PRINT）。
                </p>
                <Link to="/login">返回登录</Link>
              </div>
            }
          />
        ) : null}

        {status === 'ok' ? (
          <Alert
            type="success"
            showIcon
            message="验证成功"
            description={
              <div>
                <p style={{ margin: '0 0 12px' }}>{email} 已完成验证，可以登录。</p>
                <Link to="/login">
                  <Button type="primary">去登录</Button>
                </Link>
              </div>
            }
          />
        ) : null}

        {status === 'fail' ? (
          <Alert
            type="error"
            showIcon
            message="验证失败"
            description={
              <div>
                <p style={{ margin: '0 0 12px' }}>
                  {error || '验证链接无效或已过期'}
                </p>
                <Link to="/login">返回登录并重发验证邮件</Link>
              </div>
            }
          />
        ) : null}
      </div>
    </div>
  )
}
