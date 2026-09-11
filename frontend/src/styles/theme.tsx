import { ConfigProvider } from 'antd'
import type { ThemeConfig } from 'antd'

export const appTheme: ThemeConfig = {
  token: {
    colorPrimary: '#7C6FF0',
    colorInfo: '#7EC8A3',
    colorSuccess: '#7EC8A3',
    colorWarning: '#F5D56B',
    colorError: '#E87A7A',
    colorText: '#3A342E',
    colorTextSecondary: '#8A8176',
    colorBgBase: '#F4EFE6',
    colorBgContainer: '#FFFDF9',
    colorBorder: '#E8DFD2',
    borderRadius: 16,
    fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
  },
  components: {
    Button: {
      borderRadius: 999,
      controlHeight: 36,
    },
    Input: {
      borderRadius: 16,
      controlHeight: 40,
    },
    DatePicker: {
      borderRadius: 999,
      controlHeight: 36,
    },
    Calendar: {
      fullBg: 'transparent',
      itemActiveBg: '#DDD6FE',
    },
    Select: {
      borderRadius: 14,
      controlHeight: 34,
    },
  },
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return <ConfigProvider theme={appTheme}>{children}</ConfigProvider>
}
