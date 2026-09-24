# 风格契约 · 漫长游记

> 气质：柔软、粘土、个人成长、情绪可辨、安静
> 来源：现有界面 `frontend/src/styles/tokens.css` 与 `theme.tsx`
> 交互契约：`harness-core/skills/uxd-antdesign/SKILL.md`（不在本文重复）

本文是颜色和形状的唯一说明。`tokens.css` 与 `ConfigProvider` 必须使用同一组数值。

## 颜色

- 主色 colorPrimary：`#7C6FF0`（话题 / 主操作）
- 语义色：success / info `#7EC8A3`，warning `#F5D56B`，error `#E87A7A`
- 文字：`#3A342E` / 次文案 `#8A8176`
- 表面 layout：`#F4EFE6`；container：`#FFFDF9`；导航底：`#EFE6D8`
- 分类色只用于标签和能量点，不作页面底色，也不作主按钮。同一类共用一色：
  - 情绪：喜悦 `#F2C14E`，安稳 `#6FBF8A`，愤怒 `#E15B5B`，紧绷 `#9B84D6`，低落 `#7E9CC8`，触动 `#E8896A`
  - 话题：关系 `#E8896A`，事业 `#7E9CC8`，自我 `#9B84D6`，生活 `#6FBF8A`
  - 能量点：专注 `#E87A7A`，消耗 `#F0A06A`

## 字体

- 正文：14px / 400，`Noto Sans SC, PingFang SC, sans-serif`
- 标题：可用 Nunito + Noto Sans SC，字重 700–800，仅标题
- 行动按钮字重：700

## 形状与密度

- 行动按钮圆角：胶囊 `999px`，高度 `36px`
- 输入、Select、DatePicker：圆角 `16px`（`--radius-sm`），高度 `36px`
- 卡片表面：`28px`（`--radius-lg`）；大面板 `32px`（`--radius-xl`）
- 标签芯片：胶囊，高度 `28px`
- 间距档：8 / 16 / 24 / 32

按钮与输入同高。禁止再出现 14px、22px 与 16px 混用在同一类控件上。`--radius-md: 22px` 只用于内凹槽，不用于输入框。

## 阴影与动效

- 表面：粘土外投影 + 内高光（`--clay-out` / `--clay-out-sm` / `--clay-out-lg`）
- 按下：`--clay-press`；悬停抬起：`--clay-hover`
- 时长 `300ms`，缓动 `--ease-bounce`
- 必须尊重 `prefers-reduced-motion`：关闭位移

## 签名

侧栏与日记卡片的粘土表面：暖奶油渐变、柔和双层阴影、按下有轻微回弹。主操作保持淡紫胶囊。

## 不采用

- 后台默认蓝 `#1677FF`、6px 小圆角、无阴影扁平卡片
- 粉色主题
- 同一屏两个主按钮
- 绕过 Ant Design、只用 `.clay-btn` 充当会提交的按钮（该类只作视觉补充；提交、删除、加载中的按钮用 `Button`）
