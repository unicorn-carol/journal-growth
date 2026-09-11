# 开发计划

> 设计阶段与开发阶段的衔接文件。所有开发进度以本文件为准。  
> 项目：漫长游记 `journal-growth` · 与 PRD / api-contracts / Pencil 原型对齐  
> **本期不含** P07 情绪图谱（后置）

## 一、功能清单总览

| 序号 | 功能名称 | 一句话描述 | 对应页面 | 优先级 | 状态 |
|------|---------|-----------|---------|--------|------|
| F01 | 注册与邮箱验证 | 邮箱密码注册、验证链接、重发 | P02 / P02b | MVP | 待开发 |
| F02 | 登录与会话 | 已验证账号登录、JWT、退出 | P01 / P10 | MVP | 待开发 |
| F03 | 日记三栏工作台 | 列表筛选、新建、编辑、保存删除 | P03 | MVP | 待开发 |
| F04 | 能量划线 | 选区 M01：专注度♡ × 能量消耗⚡ | P03 / M01 | MVP | 待开发 |
| F05 | 话题情绪划线 | 选区 M02：思考/情绪标签 | P03 / M02 | MVP | 待开发 |
| F06 | AI 标签建议 | 保存后建议；采纳/忽略；无 Key 时 Mock | P03 / M03 | MVP | 待开发 |
| F07 | 自我认知 | 话题横筛 + 时间线摘录 + 下钻 | P06 | MVP | 已完成 |
| F08 | 美好时光 | 四象限散点、切片列表、象限观察 | P08 | MVP | 已完成 |
| F09 | 文件导入 | md/docx/zip 上传→预览→入库 | P09 | MVP | 已完成 |
| F10 | 账号与标签词库 | 改密、标签增删改、默认种子 | P10 | MVP | 待开发 |
| F11 | 情绪图谱 | 日/周/月情绪可视化 | P07 | V1.1 | 后置 |

## 二、数据契约摘要

> 完整数据契约见 PRD.md「数据契约确认清单」；统一响应与接口见 `docs/api-contracts.md`（唯一权威源）。

核心实体：User、EmailVerificationToken、Tag、Entry、EntryTag、Highlight、HighlightTag、AiTagSuggestion、ImportJob、QuadrantNote。

## 二点五、外部服务与测试权限清单

> **开发硬门禁**：与 PRD A5-3 一致；状态不得为「待确认」。真实 Key 不写入 docs。

| 服务 | 用途 | 配置项字段 | MVP 必需 | Tester 完整联调权限 | 缺失时策略 | 状态 |
|------|------|------------|----------|--------------------|------------|------|
| DeepSeek LLM | 篇级多标签建议 | `LLM_API_KEY`, `LLM_BASE_URL=https://api.deepseek.com`, `LLM_MODEL=deepseek-v4-pro` | 否（可 Mock） | 有 Key 时可真调 | Mock，`source: mock`，仅降级验收 | **已确认：Key 后补 / MVP Mock** |
| 邮件 | 注册验证 / 重发 | `MAIL_DEV_PRINT=true`；上线阿里云邮件推送相关配置 | 开发：打印即可 | 开发用日志链接 | 开发打印链接；上线前必须真实邮件 | **已确认** |
| 本地上传 | 导入文件 | `UPLOAD_DIR` | 是 | 本地目录可写 | 阻塞导入联调 | **已确认：本地** |
| PostgreSQL | 业务库 | `DATABASE_URL` | 是 | 可连本地/测试库 | 阻塞启动 | **已确认** |

## 三、前端开发清单

### 前端技术选型

| 层级 | 默认选择 | 说明 |
|------|----------|------|
| 框架 | React | 桌面 Web App |
| 语言 | TypeScript | 组件、service、DTO 类型化 |
| 构建工具 | Vite | 开发、代理、构建 |
| 路由 | react-router | 鉴权守卫 |
| 状态管理 | Zustand | 登录态、壳层 UI |
| 请求库 | Axios | 统一实例与错误处理 |
| 组件库 | Ant Design | 多巴胺主题覆盖 token |
| 工程化 | ESLint + Prettier + type-check + build | 自动验收 |
| Mock | `frontend/src/mocks/` + `VITE_USE_MOCK` | 字段必须为 api-contracts 子集 |

| 序号 | 页面名称 | 涉及功能 | Mock 数据来源 | 状态 |
|------|---------|---------|--------------|------|
| P01 | 登录 | F02 | auth.login | 待开发 |
| P02 | 注册 | F01 | auth.register | 待开发 |
| P02b | 邮箱验证结果 | F01 | auth.verify-email | 待开发 |
| P03 | 日记工作台 | F03–F06 | entries / highlights / ai | 待开发 |
| P06 | 自我认知 | F07 | insights.self-awareness | 已完成 |
| P08 | 美好时光 | F08 | insights.good-times / quadrant-notes | 已完成 |
| P09 | 导入 | F09 | imports | 已完成 |
| P10 | 我的 | F02、F10 | auth.me / tags / change-password | 待开发 |

### 前端自动验收标准

- [ ] 所有 MVP 页面 UI 与 Pencil 原型一致（侧栏无「情绪图谱」）
- [ ] 所有页面使用 Mock 数据可正常交互
- [ ] Mock 数据格式与 api-contracts.md 完全一致
- [ ] Agent/Tester 自动验收通过

> 前端 Mock 完成后触发用户门禁验收 UI/UX；确认后进入后端基础设施。  
> 业务任务完成时须将对应前端切到 `VITE_USE_MOCK=false` 真实联调。

## 四、后端开发清单

### Python 环境
- **Python 指令**：`/Users/yinjiasheng/.local/bin/python3.11`（项目内 `.venv` 优先）
- **虚拟环境**：`.venv`
- [x] Agent 已确认 Python 指令（3.11.15）

| 序号 | 功能名称 | 依赖 | 对应接口 | 状态 |
|------|---------|------|---------|------|
| B00 | 基础设施 | 无 | GET /api/health | 已完成 |
| B01 | 认证注册验证 | B00 | /api/auth/* | 待开发 |
| B02 | 标签词库 | B01 | /api/tags | 待开发 |
| B03 | 日记 CRUD | B01 B02 | /api/entries | 待开发 |
| B04 | 划线 Highlight | B03 | /api/entries/{id}/highlights, /api/highlights/* | 待开发 |
| B05 | AI 标签建议 | B03 | /api/entries/{id}/ai-tag-suggestions* | 待开发 |
| B06 | 自我认知洞察 | B03 B04 | GET /api/insights/self-awareness | 已完成 |
| B07 | 美好时光 + 观察 | B04 | /api/insights/good-times*, quadrant-notes* | 已完成 |
| B08 | 文件导入 | B03 | /api/imports* | 已完成 |

### 后端任务验收规则

- 基础设施基于 pycore：禁止重写 config.py、server.py、logger.py；DB 从 `pycore/integrations/db/` 模板扩展
- 基础设施自动连续执行，无用户门禁：ruff/mypy、单测、`GET /api/health` 200
- 业务任务 = 真实 API + 前端切真实 + 联调；页面不得残留该功能 `[Mock]` 文案
- LLM Key 缺失时 AI 任务仅可 Mock/降级验收，不得宣称 DeepSeek 真调通过
- `.env` 字段：`DATABASE_URL` / `JWT_SECRET` / `LLM_*` / `MAIL_DEV_PRINT` / `UPLOAD_DIR` / `CORS_ORIGINS`

## 五、功能详情（开发时逐个展开）

### B00 基础设施（pycore + health + Postgres + JWT）

**分层思路**
1. `config/settings.py`：`AppSettings` + `DotEnvConfigLoader` 注册到 `ConfigManager`（读 `backend/.env`，`use_env=False`）
2. `main.py`：`APIServer(APIConfig(...))`，CORS 含 5199/5175，挂载业务路由；startup `init_db` / shutdown `close_db`
3. `api/routes/health.py`：`GET /api/health` → `{code:200,data:{status:ok}}`
4. `db/models.py` + `db/session.py`：PostgreSQL ORM；`scripts/init_db.py` 建表
5. `api/deps.py`：路由级 `get_current_user`（JWT，非全局 Middleware）
6. `backend/tests/`：探活、CORS、init_db、鉴权探针

**验收**：ruff / mypy / pytest；真实 Postgres init_db；短时 uvicorn + curl `/api/health`

## 六、开发顺序建议

**阶段1：前端 MVP（Mock，用户先验收 UI/UX）**

1. 壳层布局 + 路由守卫 + P01/P02/P02b  
2. P03 三栏 + M01/M02/M03  
3. P06、P08、P09、P10  
4. 用户门禁：对照 `docs/prototypes/journal_growth.pen`

**阶段2：后端基础设施（自动，无用户门禁）**

1. FastAPI + pycore + Postgres + JWT 骨架 + health  
2. Agent 自动验收

**阶段3：逐功能闭环（每功能用户门禁）**

1. B01 认证 → 前端切真实  
2. B02 标签 → B03 日记 → B04 划线 → B05 AI（Mock 可先）  
3. B06 自我认知 → B07 美好时光 → B08 导入  

**阶段4：E2E 回归**

1. 注册验证 → 写日记划线 → AI 建议 → 洞察下钻 → 导入  
2. 用户门禁全流程通过
