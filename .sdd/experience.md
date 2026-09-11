# 项目经验

> 当前项目长期有效的经验。  
> Developer / Tester / Bugfix 在任务完成后维护本文件。

---

## Harness 系统经验摘要

新项目开始时，Developer / Tester / Bugfix 需要同时参考：

- 当前项目经验：`.sdd/experience.md`
- 系统级经验：`<Harness 根目录>/memory/harness-experience.md`

---

（项目经验将在开发过程中追加）

## 2026-09-07｜T-001

- Vite 8 下 `__dirname` 会告警，改用 `import.meta.url` + `fileURLToPath`。
- 脚手架任务里登录页也要尽量对齐原型文案，避免 Tester 高保真文案校验 FAIL；完整 Mock 逻辑仍留给 T-002。

## 2026-09-07｜T-002

- 登录未验证必须用业务码 `40301` 分支，不能 setSession。
- 注册契约只有 email+password；验证码仅前端 Mock 校验（123456），不写入 API body。
- 登录需「密码后再校验登录验证码」：先 `send-code`，再带 `code` 调 login；Mock 码 123456。

## 2026-09-07｜T-003

- 日记三栏在壳层 main 内再拆 mid|editor，避免改动全局侧栏结构。
- 能量卡只根据 `highlights.kind === 'energy'` 显示，与篇级情绪标签无关。
- 划选浮层按钮需 `white-space: nowrap` + `position: fixed`，否则在编辑区内容宽度下会被挤成竖排溢出。

## 2026-09-07｜T-004

- 自我认知横筛用 `GET /tags?kind=thinking`，时间线用 `GET /insights/self-awareness`；二者字段均对齐契约子集。
- 下钻参数 `entry_id` + 可选 `highlight_id`；日记页用 `mark[data-hl-id]` 滚动定位。
- 页面文案必须与原型一致；禁止加 AI「是否改变」类结论。

## 2026-09-07｜T-005

- 美好时光散点由含 energy 高亮的日记派生；象限 split 默认 2.5/2.5。
- 观察记录按 `quadrant` 过滤；编辑走 PATCH，无则 POST。
- 四宫格高度用 `minmax(180px, 216px)` 预留缓冲，避免标题/散点挤切。

## 2026-09-07｜T-006

- 标签词库独立 `tagService` + 可变 Mock store；自我认知横筛复用同一数据源。
- 导入 Mock：`parsing` 后短延迟切 `preview`；`commit` 调用 `mockCreateEntry` 写入日记列表。
- 真实 .md/.docx/.zip 在 Mock 阶段由前端 `importParse` 解析（docx 用 JSZip 抽段落）；「模拟上传」仍用固定样例。服务端解析在后续 imports 联调任务。
- `logout` 必须清 session 并跳转 `/login`，Mock/真接口同一路径。
- 象限观察列表展示 `updated_at`/`created_at`；导入页提供 `/templates/*.md|docx` 模板下载。
- 思考/情绪默认枚举以 PRD 为准（16+14）；标注浮窗与「我的」共用词库并支持 + 新增。

## 2026-09-07｜T-007

- pycore 仅 TOML 内置 loader：项目用 `DotEnvConfigLoader` 注册到 `ConfigManager`，禁止 `use_env=True`。
- mypy 必须 `follow_imports=skip` / exclude `pycore/`，否则框架噪音会污染业务门禁。
- 启动：`cd backend && PYTHONPATH=.. $PY -m uvicorn src.main:app --host 127.0.0.1 --port 8099`。
- pycore 依赖 `loguru`，需写入项目依赖并装进 `.venv`。

## 2026-09-07｜T-008

- 本机无 brew/docker 时可用 conda env 装 PostgreSQL 16；`listen_addresses=127.0.0.1`，避免 localhost 解析失败。
- `DATABASE_URL` 用 `postgresql+asyncpg://postgres@127.0.0.1:5432/journal_growth`（trust 时可无密码）。
- `session.py` 用项目 `get_settings()`，不要直接依赖 pycore `get_config`。
- 建表验证：`cd backend && PYTHONPATH=.. $PY scripts/init_db.py`，对照 `information_schema.tables`。

## 2026-09-07｜T-009

- 统一错误体用 `AppError` + `exception_handler`，避免 FastAPI `HTTPException.detail` 包成 `{"detail":...}`。
- 鉴权只做路由级 `Depends(get_current_user)`；探针路由 `GET /api/auth/probe` 便于基础设施验收。
- JWT：`python-jose` HS256，`sub`=user UUID；业务码 `40101`。

## 2026-09-07｜T-010

- `VITE_USE_MOCK=false` 时用 `shouldMock(feature)` 渐进切真接口：仅 `auth` 真实，其余仍 Mock，避免日记/标签未实现时整站挂掉。
- 登录 OTP / 验证链接：`MAIL_DEV_PRINT` 打到后端日志；前端勿再写死 Mock 文案。
- asyncpg + pytest 多 event loop：engine 用 `NullPool`，测试避免在 lifespan 里 `dispose` 跨 loop。
- axios 对 `/auth/login` 的 401 不要清 session / 跳转，否则错误密码会误伤。
- 密码哈希直接用 `bcrypt`，禁止 passlib。

## 2026-09-08｜T-011

- 词库删除与划线取消选择是两条路径：列表侧用右键 + usage 确认；划线侧保持取消选择即可。
- 系统默认标签色在 `list_tags` 时按 icon 色系回写，避免老用户仍看到旧配色。
- `GET /api/tags/{id}/usage` 的 `content_count` = 篇级 ∪ 划线所属日记去重。

## 2026-09-08｜T-012

- entries 渐进切真：`REAL_FEATURES` 加入 `entries`；highlights / AI 仍 Mock，刷新后本地划线会丢，下一任务再闭环。
- 列表 `excerpt` 在 service 层剥 HTML 取前 80 字；软删用 `deleted_at`，列表/详情均过滤。
- 传 `tag_ids` 时篇级标签整表替换；筛选多标签为 AND。

## 2026-09-08｜T-013

- entries 切真后 highlights 若仍 Mock，mock store 找不到 entry_id 会导致「保存无效」；本任务将 highlights 一并切真实。
- 中栏列表省略：grid 列用 `minmax(0,1fr)` + `.entry-body { min-width:0 }`，否则 nowrap 无法截断中文长串。
- 话题划线创建时同步 merge 到篇级 `entry_tags`，列表才能看到标签。

## 2026-09-08｜UI 色系分层（多巴胺扁平色块）

- 三套视觉车道需同时落在 token + 组件形态：能量=暖珊瑚扁平块；话题/思考=冷靛紫青 + 左侧色条方 chip；情绪=饱和圆 pill。不要用同一套软 pill 覆盖三类。
- 系统默认标签色改色后，依赖 `list_tags` 的 `_sync_system_default_colors` 回写；前后端 `default_tags` / `tagColors` 必须同表，否则老用户仍见旧色。
- 正文高亮：`hl-energy` 用 focus 底边条，`hl-topic` 用 topic 紫底边条，避免再和情绪 calm 青绿抢语义。

## 2026-09-08｜Claymorphism 适配（Mooda 色 + flomo 布局）

- 主题色保持奶油纸色 + 靛紫主色，**禁止粉色主题**；粘土阴影用 CSS 变量 `--clay-out / --clay-inset / --clay-press`。
- Mooda：情绪用糖果黄/薄荷绿/柔蓝/薰衣草紫/珊瑚；能量暖珊瑚；话题靛紫。
- flomo：壳层留白 + 侧栏/主区清晰分区；卡片大圆角 + 内外阴影，不用单侧粗边框。
- 交互：`cubic-bezier(0.34,1.56,0.64,1)` + squash/stretch；`prefers-reduced-motion` 关闭形变。
- 参考图存 `.sdd/tmp/visual-refs/ref-mooda-blobs.png`、`ref-flomo-layout.png`。

## 2026-09-08｜粘土图标组件

- 能量/中栏图标统一走 `components/icons/ClayIcons.tsx`（渐变填充 + soft drop shadow + 高光），不要再回退到 unicode ♡⚡「日」「#」。
- HalfRating 半档用同色 SVG 叠加 + `overflow:hidden` 裁 50%，保持点击左半/右半逻辑不变。

## 2026-09-08｜T-014

- 无 `LLM_API_KEY` 时必须 `source=mock` 仍 200；报告标注降级验收。
- DeepSeek 调用用 httpx `trust_env=False`，避免代理环境变量干扰。
- 保存日记后前端再请求建议；建议失败不阻断保存成功提示。
- AI 单测须在 fixture 清空 `llm_api_key`，否则本地 `.env` 有 Key 会断言 `source=mock` 失败。

## 2026-09-09｜T-015

- 自我认知渐进切真用独立 feature `self-awareness`，不要把整个 `insights` 一次切真（美好时光仍 Mock）。
- 逻辑：优先匹配当前筛选的 `topic_emotion` 划线；若本篇在该筛选下没有命中划线，再用篇级 thinking 标签做正文摘要回退（避免划线只挂「自我认知」、篇级有「工作状态」时默认筛工作状态空白）。
- 「全部」下：划线已覆盖的思考标签不再重复；篇级仍有未覆盖标签（如工作状态）时，额外出一条正文摘要卡片。

## 2026-09-09｜T-016

- 美好时光切真用独立 feature `good-times`（含 quadrant-notes），勿与 `self-awareness` 混用同一 `insights` 开关。
- good-times：先取最近 N 篇「含 energy 高亮」的日记，再展开这些日记上的全部 energy 点；`points` 全量，`slices` 按 quadrant 过滤。

## 2026-09-09｜T-017

- 导入切真 feature 名用 `imports`；上传后服务端同步解析，可直接返回 `preview`/`failed`，前端需兼容（不必只等 polling）。
- 文件落盘 `UPLOAD_DIR`（相对路径相对项目根）；解析逻辑与前端 `importParse` 对齐（`---` / `# 标题` / 日期行）。
- 需依赖 `python-multipart` 才能收 multipart 上传。

## 2026-09-09｜T-018

- 最终回归只复查全链路与 `docs/startup.md`，不替代各任务首次联调。
- 用户门禁默认：FE `5175` → BE `8003`；`VITE_USE_MOCK=false`。
- 导航门禁：`AppShell` 不得出现「情绪图谱」。

## 2026-09-11｜PaaS deploy

- 生产用单容器同域：Vite `dist` + FastAPI；`VITE_API_BASE_URL=/api`，避免跨域。
- 配置仍禁止 `ConfigManager(use_env=True)`；PaaS 用显式 allow-list 进程环境覆盖（`_paas_env_overlay`），`.env` 文件优先被覆盖。
- Railway/Render 的 `DATABASE_URL` 常为 `postgresql://`：启动时归一为 `postgresql+asyncpg://`，`sslmode=` → `ssl=`。
- 个人未接邮件时保持 `MAIL_DEV_PRINT=true`，从 Deploy Logs 取验证链接。
