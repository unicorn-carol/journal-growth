# 漫长游记 · 本地启动说明

产品名：**漫长游记**（`journal-growth`）  
默认验收路径走**真实后端**（`VITE_USE_MOCK=false`），不以 Mock 为主。

## 环境要求

| 项 | 说明 |
|----|------|
| Python | 3.11+（项目 `.venv`） |
| Node.js | 18+（前端 Vite） |
| PostgreSQL | 本地库 `journal_growth`（可用 conda env `journal-pg`） |
| 可选 | DeepSeek `LLM_API_KEY`（缺失时 AI 建议降级为 `source=mock`） |

## 端口约定

| 角色 | 前端 | 后端 |
|------|------|------|
| 用户门禁验收 | `http://127.0.0.1:5175` | `http://127.0.0.1:8003` |
| Agent / 开发备选 | `http://127.0.0.1:5199` | `http://127.0.0.1:8099` |

Vite 通过 `/api` 代理到 `VITE_BACKEND_PROXY_TARGET`。

## 配置

### 后端 `backend/.env`

可从 `backend/.env.example` 复制，至少配置：

```bash
DATABASE_URL=postgresql+asyncpg://postgres@127.0.0.1:5432/journal_growth
JWT_SECRET=<长随机串>
HOST=127.0.0.1
PORT=8099
MAIL_DEV_PRINT=true
FRONTEND_PUBLIC_URL=http://127.0.0.1:5175
UPLOAD_DIR=backend/data/uploads
# 可选
LLM_API_KEY=
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
```

真实 Key **不要**写入文档或 `.sdd/`。

### 前端 `frontend/.env`

```bash
VITE_API_BASE_URL=/api
VITE_USE_MOCK=false
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:8003
```

## 启动步骤

在项目根 `Projects_Repo/journal-growth/` 下：

### 1. 数据库

确保 Postgres 已启动，且存在库 `journal_growth`：

```bash
export PATH="$(conda info --base)/envs/journal-pg/bin:$PATH"
pg_isready -h 127.0.0.1 -p 5432
# 若库不存在：createdb -h 127.0.0.1 -U postgres journal_growth
```

后端启动时会 `init_db` 建表；首次可选手动：

```bash
cd backend
export DATABASE_URL="postgresql+asyncpg://postgres@127.0.0.1:5432/journal_growth"
PYTHONPATH=.. ../.venv/bin/python -m scripts.init_db
```

### 2. 后端（用户门禁示例：8003）

```bash
cd backend
export PATH="$(conda info --base)/envs/journal-pg/bin:$PATH"
export DATABASE_URL="postgresql+asyncpg://postgres@127.0.0.1:5432/journal_growth"
PYTHONPATH=.. ../.venv/bin/python -m uvicorn src.main:app --host 127.0.0.1 --port 8003
```

健康检查：`curl http://127.0.0.1:8003/api/health` → `status: ok`

### 3. 前端（5175）

```bash
cd frontend
npm install   # 首次
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

打开：http://127.0.0.1:5175

## 主流程走查（验收）

1. **注册 / 验证 / 登录**  
   - 注册后看后端日志 `[MAIL_DEV_PRINT] verification link`，打开链接完成验证。  
   - 登录：先发登录验证码（日志打印），再带码登录。  
   - 注册页本地码 `123456` 仅前端 Mock 校验，不进 API。
2. **日记** — 新建、保存、软删；能量划线（♡×⚡）；话题/情绪划线。  
3. **AI 标签建议** — 保存后出现建议条，可采纳/忽略（无 Key 时为 Mock 源）。  
4. **自我认知** — 话题横筛 + 时间线；点击下钻到日记。  
5. **美好时光** — 四象限散点与切片；保存象限观察后刷新仍在。  
6. **导入** — 上传 `.md` / `.docx` / 含 md 的 zip → 预览 → 确认入库。

侧栏导航仅：**日记 / 自我认知 / 美好时光 / 导入**（无情绪图谱）。

## 测试

```bash
cd backend
export DATABASE_URL="postgresql+asyncpg://postgres@127.0.0.1:5432/journal_growth"
PYTHONPATH=.. ../.venv/bin/python -m pytest tests -q
../.venv/bin/ruff check src tests
../.venv/bin/mypy src

cd ../frontend
npx tsc --noEmit
```

## 说明

- 渐进切真：`frontend/src/services/api.ts` 的 `REAL_FEATURES`（auth/tags/entries/highlights/ai/self-awareness/good-times/imports）。  
- 上传文件目录：`UPLOAD_DIR`（默认 `backend/data/uploads`）。  
- 更完整契约见 `docs/api-contracts.md`、产品说明见 `docs/PRD.md`。
