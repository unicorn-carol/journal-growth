import { ConfigProvider } from 'antd'
import type { ThemeConfig } from 'antd'

/**
 * 与 docs/uxd-style.md、tokens.css 同一套数值。
 * 行动按钮：胶囊 36px。输入 / Select / DatePicker：16px 圆角、36px 高。
 */
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
    colorBgLayout: '#F4EFE6',
    colorBgContainer: '#FFFDF9',
    colorBorder: '#E8DFD2',
    borderRadius: 16,
    borderRadiusLG: 28,
    controlHeight: 36,
    fontSize: 14,
    fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
  },
  components: {
    Button: {
      borderRadius: 999,
      controlHeight: 36,
      fontWeight: 700,
      primaryShadow: '4px 4px 10px rgba(58, 52, 46, 0.12)',
    },
    Input: {
      borderRadius: 16,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 16,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 16,
      controlHeight: 36,
    },
  },
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return <ConfigProvider theme={appTheme}>{children}</ConfigProvider>
}
