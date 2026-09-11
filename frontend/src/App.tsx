import { RouterProvider } from 'react-router-dom'
import { AppThemeProvider } from '@/styles/theme'
import { router } from '@/router'
import '@/styles/tokens.css'
import '@/styles/clay.css'
import '@/styles/clay-picker.css'
import '@/components/icons/clay-icons.css'
import '@/components/AppShell.css'
import { mockReady } from '@/mocks'

void mockReady

export default function App() {
  return (
    <AppThemeProvider>
      <RouterProvider router={router} />
    </AppThemeProvider>
  )
}
