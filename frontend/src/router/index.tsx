import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { VerifyEmailPage } from '@/pages/VerifyEmailPage'
import { DiaryWorkspacePage } from '@/pages/DiaryWorkspacePage'
import { SelfAwarenessPage } from '@/pages/SelfAwarenessPage'
import { GoodTimesPage } from '@/pages/GoodTimesPage'
import { ImportPage } from '@/pages/ImportPage'
import { SettingsPage } from '@/pages/SettingsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/diary" replace /> },
      { path: 'diary', element: <DiaryWorkspacePage /> },
      { path: 'self-awareness', element: <SelfAwarenessPage /> },
      { path: 'good-times', element: <GoodTimesPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
