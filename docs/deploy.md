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

1. 同一 Project 内 **New** → **Database** → **PostgreSQL**
2. 打开 Web 服务 → **Variables** → **Add Reference** → 引用 Postgres 的 `DATABASE_URL`  
   （或把 Postgres 的 `DATABASE_URL` 变量共享到 Web 服务）

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

## 四、域名与首次访问

1. Web 服务 → **Settings** → **Networking** → **Generate Domain**
2. 把生成的 `https://….up.railway.app` 填回 `FRONTEND_PUBLIC_URL` 与 `CORS_ORIGINS`，再 Redeploy 一次
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
