import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dropdown, Input, Modal, message } from 'antd'
import type { MenuProps } from 'antd'
import { changePassword, logout } from '@/services/authService'
import {
  createTag,
  deleteTag,
  getTagUsage,
  listTags,
  updateTag,
} from '@/services/tagService'
import { useAuthStore } from '@/stores/useAuthStore'
import { colorForTag, tagPillStyle } from '@/utils/tagColors'
import type { TagDTO } from '@/types/insight'
import type { TagKind } from '@/types/entry'
import './SettingsPage.css'

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [thinking, setThinking] = useState<TagDTO[]>([])
  const [emotion, setEmotion] = useState<TagDTO[]>([])
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [tagModal, setTagModal] = useState<{
    kind: TagKind
    mode: 'create' | 'edit'
    tag?: TagDTO
  } | null>(null)
  const [tagName, setTagName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [t, e] = await Promise.all([listTags('thinking'), listTags('emotion')])
        if (cancelled) return
        setThinking(t)
        setEmotion(e)
      } catch (err) {
        if (!cancelled) message.error((err as Error).message || '加载标签失败')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reloadTags = async () => {
    const [t, e] = await Promise.all([listTags('thinking'), listTags('emotion')])
    setThinking(t)
    setEmotion(e)
  }

  const onChangePassword = async () => {
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      message.success('密码已更新')
      setCurrentPassword('')
      setNewPassword('')
    } catch (e) {
      message.error((e as Error).message || '修改失败')
    }
  }

  const onLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const openCreate = (kind: TagKind) => {
    setTagModal({ kind, mode: 'create' })
    setTagName('')
  }

  const openEdit = (tag: TagDTO) => {
    setTagModal({ kind: tag.kind, mode: 'edit', tag })
    setTagName(tag.name)
  }

  const saveTag = async () => {
    if (!tagModal) return
    const name = tagName.trim()
    if (!name) {
      message.warning('请输入标签名')
      return
    }
    setSaving(true)
    try {
      if (tagModal.mode === 'create') {
        await createTag({ kind: tagModal.kind, name })
      } else if (tagModal.tag) {
        await updateTag(tagModal.tag.id, { name })
      }
      setTagModal(null)
      await reloadTags()
      message.success('标签已保存')
    } catch (e) {
      message.error((e as Error).message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const confirmRemove = async (tag: TagDTO) => {
    try {
      const usage = await getTagUsage(tag.id)
      const n = usage.content_count
      const hl = usage.highlight_count
      const detail =
        n > 0
          ? `「${tag.name}」已关联 ${n} 条内容${hl > 0 ? `（含 ${hl} 处划线标注）` : ''}。删除后将从历史日记与划线中解除关联，是否继续？`
          : `确定删除标签「${tag.name}」？当前没有关联内容。`

      Modal.confirm({
        title: '删除标签',
        content: detail,
        okText: '确认删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        centered: true,
        onOk: async () => {
          await deleteTag(tag.id)
          await reloadTags()
          message.success('标签已删除')
        },
      })
    } catch (e) {
      message.error((e as Error).message || '无法获取关联信息')
    }
  }

  const menuFor = (tag: TagDTO): MenuProps => ({
    items: [
      {
        key: 'edit',
        label: '编辑',
        onClick: () => openEdit(tag),
      },
      {
        key: 'delete',
        label: '删除',
        danger: true,
        onClick: () => {
          void confirmRemove(tag)
        },
      },
    ],
  })

  const renderPill = (tag: TagDTO) => {
    const color = colorForTag(tag.name, tag.color, tag.kind)
    return (
      <Dropdown key={tag.id} menu={menuFor(tag)} trigger={['contextMenu']}>
        <button
          type="button"
          className={`lexicon-pill lexicon-pill--${tag.kind}`}
          style={tagPillStyle(color, tag.kind)}
          title="右键可编辑或删除"
        >
          <span className="lexicon-dot" style={{ background: color }} aria-hidden />
          {tag.name}
        </button>
      </Dropdown>
    )
  }

  return (
    <div className="settings-page">
      <header className="settings-hero">
        <div>
          <h2 className="page-title">我的</h2>
          <p className="page-sub">账号、密码与个人标签词库。</p>
        </div>
      </header>

      <div className="settings-grid account-grid">
        <section className="panel account-panel">
          <div className="panel-head">
            <h5>账号</h5>
          </div>
          <div className="field">
            <label>邮箱</label>
            <input value={user?.email ?? ''} readOnly />
          </div>
          <div className="field">
            <label>验证状态</label>
            <div className={`status-chip${user?.email_verified ? ' ok' : ''}`}>
              {user?.email_verified ? '已验证' : '未验证'}
            </div>
          </div>
          <button type="button" className="btn-soft" onClick={onLogout}>
            退出登录
          </button>
        </section>

        <section className="panel account-panel">
          <div className="panel-head">
            <h5>修改密码</h5>
          </div>
          <div className="field">
            <label>当前密码</label>
            <Input.Password
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>新密码</label>
            <Input.Password
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <button type="button" className="btn-soft primary" onClick={onChangePassword}>
            更新密码
          </button>
        </section>
      </div>

      <section className="panel lexicon-panel">
        <div className="panel-head">
          <div>
            <h5>标签词库</h5>
            <p className="panel-hint">右键标签可编辑或删除；删除前会提示历史关联数量。</p>
          </div>
        </div>

        <div className="lexicon-block">
          <div className="lexicon-label">
            <span className="lexicon-kicker thinking">思考类</span>
            <span className="lexicon-count">{thinking.length}</span>
          </div>
          <div className="tag-row">
            {thinking.map(renderPill)}
            <button
              type="button"
              className="lexicon-pill add"
              onClick={() => openCreate('thinking')}
            >
              + 新增
            </button>
          </div>
        </div>

        <div className="lexicon-block">
          <div className="lexicon-label">
            <span className="lexicon-kicker emotion">情绪类</span>
            <span className="lexicon-count">{emotion.length}</span>
          </div>
          <div className="tag-row">
            {emotion.map(renderPill)}
            <button
              type="button"
              className="lexicon-pill add"
              onClick={() => openCreate('emotion')}
            >
              + 新增
            </button>
          </div>
        </div>
      </section>

      <Modal
        title={tagModal?.mode === 'create' ? '新增标签' : '编辑标签'}
        open={!!tagModal}
        onCancel={() => setTagModal(null)}
        onOk={saveTag}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        centered
      >
        <Input
          placeholder="标签名称"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onPressEnter={saveTag}
          autoFocus
        />
      </Modal>
    </div>
  )
}
