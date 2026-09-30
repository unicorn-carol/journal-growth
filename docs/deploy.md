# 漫长游记 · PaaS 部署（Railway）

个人正式使用推荐：**Railway** 单 Web 服务 + 托管 PostgreSQL。  
同一域名托管 Vite 静态前端，FastAPI 提供 `/api/*`（见仓库根 `Dockerfile`）。

## 架构

```text
Browser  ──►  Railway Web (Docker)
                ├─ static: frontend/dist  (SPA)
                └─ /api/* → FastAPI + JWT
                     └─ Railway Postgres
```

## 一、创建项目

1. 打开 [https://railway.app](https://railway.app)，用 GitHub 登录
2. **New Project** → **Deploy from GitHub repo** → 选择 `unicorn-carol/journal-growth`
3. 若未自动识别 Docker：Settings → Build → Builder = Dockerfile（仓库已有 `railway.toml`）

## 二、添加 Postgres

> **常见误区**：Postgres 不是在 `journal-growth` 服务的 **Settings** 里添加的，而是在**整个 Project 的画布**上添加第二个服务。

1. 回到 Project 总览（能看到 `journal-growth` 卡片/方块的那一页；左上角 Project 名 → 不要停在单个服务的 Settings 里）。
2. 在画布上添加数据库，任选一种方式：
   - 右上角 **Create** / **+ New**（有的界面是 **Add Service**）→ **Database** → **PostgreSQL**；或
   - 快捷键 **⌘K / Ctrl+K** → 搜索 **PostgreSQL** → 添加；或
   - [PostgreSQL 模板](https://railway.com/template/postgres) → **Deploy to Railway** → 选当前 Project。
3. 等待 Postgres 服务部署完成（画布上会出现 **Postgres** / **PostgreSQL** 方块，与 `journal-growth` 并列）。
4. 把数据库连到 Web 服务：
   - 点开 **journal-growth**（GitHub 那个）→ **Variables**
   - **New Variable** → **Add Reference**（或 **Reference Variable**）
   - 选择 **Postgres 服务** → 变量 **`DATABASE_URL`** → 保存  
   （等价做法：在 Postgres 的 Variables 里复制 `DATABASE_URL`，到 Web 服务里新建同名变量粘贴；同一 Project 内优先用 Reference，避免密码不一致。）

应用启动时会把 `postgresql://` 自动改成 `postgresql+asyncpg://`。

## 三、必填环境变量（Web 服务）

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | 长随机串（勿用示例值） |
| `DATABASE_URL` | 来自 Postgres 插件（引用即可） |
| `FRONTEND_PUBLIC_URL` | 你的公开 URL，如 `https://xxx.up.railway.app`（自定义域名则填该域名） |
| `CORS_ORIGINS` | JSON 数组，至少含公开 URL，例：`["https://xxx.up.railway.app"]` |

建议一并设置：

| 变量 | 建议值 |
|------|--------|
| `HOST` | `0.0.0.0`（镜像默认已有） |
| `DEBUG` | `false` |
| `STATIC_DIR` | `/app/frontend/dist`（镜像默认已有） |
| `MAIL_DEV_PRINT` | `true`（个人用：验证链接打在 **Deploy Logs**） |
| `UPLOAD_DIR` | `/app/backend/data/uploads` |
| `LLM_API_KEY` | 可选；不填则 AI 标签建议走 Mock |

生成 `JWT_SECRET` 示例：

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

## 三.b 部署失败排查

| 现象 | 常见原因 | 处理 |
|------|----------|------|
| **Build failed** | Docker 里 `pip install -e .` 失败 | 使用最新 `main`（已修复 setuptools 包发现） |
| **Crashed** | `CORS_ORIGINS` 不是 JSON 数组 | 用 `["https://你的域名.up.railway.app"]`；或只填单个 URL（新版本已兼容） |
| **Crashed** | 连不上 Postgres | 画布上 Postgres 已 Running；Web 的 `DATABASE_URL` 为 **Reference** 指向 Postgres |
| **Crashed** | 启动日志 `ValidationError` / `JWT_SECRET` | 在 Web Variables 补 `JWT_SECRET` |
| 域名 502 | 公网端口与进程不一致 | Generate Domain 端口填 **Railway 注入的 `PORT`**（Variables 里可见，常见为 `8000` 或平台分配值） |

查看日志：**Deployments** → 失败记录 → **View Logs**（Build 失败看构建段；Crashed 看 **Deploy / Runtime** 段末尾）。

## 四、域名与首次访问

1. Web 服务 → **Settings** → **Networking** → **Generate Domain**
2. 端口填 **Variables 里 Railway 提供的 `PORT`**（与容器监听一致；本镜像默认 `8000`，若平台注入别的值以平台为准）
3. 把生成的 `https://….up.railway.app` 填回 `FRONTEND_PUBLIC_URL` 与 `CORS_ORIGINS`，再 Redeploy 一次  
   `CORS_ORIGINS` 示例（整段复制，替换域名）：  
   `["https://journal-growth-production.up.railway.app"]`
3. 打开站点 → 注册账号
4. 打开 Railway **Deploy Logs**，复制邮件验证链接（`MAIL_DEV_PRINT=true` 时不会真发信）完成验证后登录

健康检查：`GET https://你的域名/api/health` 应返回成功 JSON。

## 五、自定义域名（可选）

Railway 绑定域名后，更新 `FRONTEND_PUBLIC_URL` / `CORS_ORIGINS` 为新 origin 并 Redeploy。

## 六、数据与备份

- 日记数据在 Postgres；重要内容请在 Railway 做定期备份或导出
- 上传文件在容器磁盘（`UPLOAD_DIR`）；容器重建可能丢失，个人 MVP 可接受；长期可再迁对象存储

## 七、本地用 Docker 验证（可选）

本机需安装 Docker。示例：

```bash
docker build -t journal-growth .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL='postgresql://USER:PASS@host.docker.internal:5432/journal_growth' \
  -e JWT_SECRET='local-test-secret' \
  -e FRONTEND_PUBLIC_URL='http://127.0.0.1:8000' \
  -e CORS_ORIGINS='["http://127.0.0.1:8000"]' \
  journal-growth
```

## 说明

- 未接真实邮件时，验证码 / 验证链接只在日志中；上线对外再接 SMTP / 阿里云邮件推送
- 勿把含真实密钥的 `.env` 提交进 Git
