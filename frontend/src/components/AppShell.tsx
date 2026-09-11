import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import './AppShell.css'

const NAV_ITEMS = [
  { to: '/diary', label: '日记', lane: 'diary' },
  { to: '/self-awareness', label: '自我认知', lane: 'topic' },
  { to: '/good-times', label: '美好时光', lane: 'energy' },
  { to: '/import', label: '导入', lane: 'import' },
] as const

export function AppShell() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="app-frame">
      <div className="app-shell">
        <aside className="sidebar">
          <button
            type="button"
            className="side-head"
            onClick={() => navigate('/settings')}
            title={user?.email ?? '我的'}
          >
            <span className="avatar" aria-hidden />
            <span className="side-brand">
              <span className="side-title">漫长游记</span>
              <span className="side-sub">{user?.email ?? '点击进入我的'}</span>
            </span>
          </button>

          <nav className="side-nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item nav-item--${item.lane}${isActive ? ' is-active' : ''}`
                }
              >
                <span className={`nav-dot nav-dot--${item.lane}`} aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="main-pane">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
