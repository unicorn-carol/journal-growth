import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, message } from 'antd'
import {
  commitImport,
  createImport,
  getImport,
  simulateImport,
} from '@/services/importService'
import { useMock } from '@/services/api'
import type { ImportJob } from '@/types/import'
import './ImportPage.css'

type Step = 1 | 2 | 3

export function ImportPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>(1)
  const [job, setJob] = useState<ImportJob | null>(null)
  const [busy, setBusy] = useState<null | 'file' | 'simulate' | 'commit'>(null)

  useEffect(() => {
    if (!job || job.status !== 'parsing') return
    let cancelled = false
    const timer = window.setInterval(async () => {
      try {
        const next = await getImport(job.id)
        if (cancelled) return
        setJob(next)
        if (next.status === 'preview') {
          setStep(2)
          window.clearInterval(timer)
        }
        if (next.status === 'failed') {
          window.clearInterval(timer)
          message.error(next.error_message || '解析失败')
        }
      } catch {
        window.clearInterval(timer)
      }
    }, 300)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [job])

  const startWithFile = async (file: File) => {
    setBusy('file')
    try {
      const created = await createImport(file)
      setJob(created)
      if (created.status === 'preview') {
        setStep(2)
        message.success(`已解析 ${created.filename}`)
      } else if (created.status === 'failed') {
        setStep(1)
        message.error(created.error_message || '解析失败')
      } else {
        setStep(1)
        message.success(`已上传 ${created.filename}`)
      }
    } catch (e) {
      message.error((e as Error).message || '上传失败')
    } finally {
      setBusy(null)
    }
  }

  const onSimulate = async () => {
    setBusy('simulate')
    try {
      const created = await simulateImport()
      setJob(created)
      setStep(1)
    } catch (e) {
      message.error((e as Error).message || '模拟失败')
    } finally {
      setBusy(null)
    }
  }

  const onCommit = async () => {
    if (!job) return
    setBusy('commit')
    try {
      const result = await commitImport(job.id)
      setStep(3)
      setJob({ ...job, status: 'committed' })
      message.success(`已入库 ${result.created_entry_ids.length} 篇`)
      if (result.failed.length) {
        message.warning(`${result.failed.length} 篇失败`)
      }
    } catch (e) {
      message.error((e as Error).message || '确认导入失败')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="import-page">
      <h2 className="page-title">日记导入</h2>
      <p className="page-sub">从飞书导出 Markdown / docx 后上传。直连飞书 API 后置。</p>

      <div className="template-bar">
        <span className="template-label">导入模板（推荐先按模板整理再上传）</span>
        <Button href="/templates/journal-import-template.md" download>
          下载 Markdown 模板
        </Button>
        <Button href="/templates/journal-import-template.docx" download>
          下载 Word 模板
        </Button>
      </div>
      <ul className="template-tips">
        <li>每篇以一级标题（MD 的 <code># 标题</code>）或单独一行标题开头</li>
        <li>标题下一行写 <code>日期：YYYY-MM-DD</code> 或 <code>日期：YYYY年M月D日</code></li>
        <li>其后为正文；篇与篇之间空行，或用 <code>---</code> 分隔</li>
      </ul>

      <div className="wizard-steps">
        <span className={step === 1 ? 'on' : undefined}>1 上传</span>
        <span className={step === 2 ? 'on' : undefined}>2 预览拆篇</span>
        <span className={step === 3 ? 'on' : undefined}>3 入库</span>
      </div>

      {step === 1 ? (
        <div
          className="upload-box"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            const file = e.dataTransfer.files?.[0]
            if (file) void startWithFile(file)
          }}
        >
          <div className="upload-title">拖入或选择文件</div>
          支持 .md / .docx / 含多篇 Markdown 的 zip
          <div className="upload-actions">
            <Button
              type="primary"
              disabled={busy !== null}
              loading={busy === 'file'}
              onClick={() => inputRef.current?.click()}
            >
              选择文件
            </Button>
            {useMock ? (
              <Button disabled={busy !== null} loading={busy === 'simulate'} onClick={onSimulate}>
                模拟上传样例
              </Button>
            ) : null}
          </div>
          {job?.status === 'parsing' ? (
            <div className="upload-status">正在解析 {job.filename}…</div>
          ) : null}
          {job?.status === 'failed' ? (
            <div className="upload-error">{job.error_message || '解析失败'}</div>
          ) : null}
          <input
            ref={inputRef}
            type="file"
            accept=".md,.docx,.zip,text/markdown"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void startWithFile(file)
              e.target.value = ''
            }}
          />
        </div>
      ) : null}

      {step === 2 && job?.preview ? (
        <div className="preview-panel">
          <div className="preview-head">
            <strong>{job.filename}</strong>
            <span>共 {job.preview.entry_count} 篇</span>
          </div>
          {job.preview.entries.map((row) => (
            <div key={row.temp_id} className="preview-card">
              <div className="preview-meta">
                {row.event_date}
                {row.date_inferred ? ' · 日期推断' : ''}
              </div>
              <div className="preview-title">{row.title}</div>
              <div className="preview-excerpt">{row.excerpt}</div>
            </div>
          ))}
          <div className="preview-actions">
            <Button disabled={busy !== null} onClick={() => setStep(1)}>
              重新上传
            </Button>
            <Button type="primary" loading={busy === 'commit'} onClick={onCommit}>
              确认导入
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="result-panel">
          <div className="upload-title">入库完成</div>
          <p>日记已写入列表。可到日记页查看新增条目。</p>
          <div className="upload-actions">
            <Button onClick={() => { setJob(null); setStep(1) }}>再导一份</Button>
            <Button type="primary" onClick={() => navigate('/diary')}>
              去日记页
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
