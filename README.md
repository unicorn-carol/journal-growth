# 漫长游记 (journal-growth)

个人成长日记 Web 应用：长文记录 + 划线标注能量/话题情绪 + AI 标签建议 + 自我认知 / 美好时光回看。

> 视觉方向：多巴胺配色 + 粘土拟态（Claymorphism）；布局参考 Day One 三栏工作台与 flomo 式清晰分区。

## 功能亮点

- **日记工作台**：左导航 · 中列表 · 右正文；划线记录专注度 ♡ / 能量消耗 ⚡ 与话题/情绪标签
- **AI 标签建议**：保存后建议思考类 / 情绪类标签（无 Key 时 Mock 降级）
- **自我认知**：按话题横向筛选 + 时间线摘录，可下钻回日记
- **美好时光**：专注度 × 消耗四象限散点与切片观察
- **导入**：飞书导出的 `.md` / `.docx` / zip 批量入库

本期不做：情绪图谱整页（V1.1 backlog）。

## 技术栈

| 层 | 选型 |
|----|------|
| 前端 | React · TypeScript · Vite · Ant Design · Zustand · React Router |
| 后端 | Python 3.11+ · FastAPI · JWT |
| 数据库 | PostgreSQL |
| AI | DeepSeek（可选） |

## 仓库结构

```text
frontend/     # Vite React 应用
backend/      # FastAPI 服务
pycore/       # 后端脚手架依赖
docs/         # PRD、API 契约、startup、原型说明
.sdd/         # 任务与验收记录（SDD 流程产物）
```

## 本地快速启动

详细步骤见 [`docs/startup.md`](docs/startup.md)。摘要：

1. 准备 PostgreSQL 库 `journal_growth`
2. 复制 `backend/.env.example` → `backend/.env`，填写 `DATABASE_URL`、`JWT_SECRET`
3. 复制 `frontend/.env.example` → `frontend/.env`（默认 `VITE_USE_MOCK=false`）
4. 启动后端（示例端口 `8003`）与前端（示例端口 `5175`）

```bash
# 后端
cd backend
PYTHONPATH=.. ../.venv/bin/python -m uvicorn src.main:app --host 127.0.0.1 --port 8003

# 前端
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5175 --strictPort
```

打开 http://127.0.0.1:5175

开发期邮件验证链接会打印在后端日志（`MAIL_DEV_PRINT=true`）。

## 文档

- 产品需求：[`docs/PRD.md`](docs/PRD.md)
- API 契约：[`docs/api-contracts.md`](docs/api-contracts.md)
- 本地启动：[`docs/startup.md`](docs/startup.md)

## 说明

本仓库为个人作品 / 可自托管源码。请勿提交真实 `.env`、密钥或用户日记数据。上线部署方案另议（同域静态前端 + `/api` 反代 + Postgres）。

## License

Private / personal project — 如需开源协议可再补充。
