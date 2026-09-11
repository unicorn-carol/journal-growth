# 接口契约

> 前端 Mock 和后端实现的唯一对齐依据。任何变更必须同步更新本文件。  
> 项目：漫长游记 `journal-growth` · 与 PRD 定稿一致（本期不含 P07 情绪图谱接口）

## 通用约定

### 统一响应格式

成功：

```json
{"code": 200, "message": "success", "data": {}}
```

错误：

```json
{"code": 40001, "message": "参数校验失败", "data": null}
```

分页：

```json
{"code": 200, "message": "success", "data": {"items": [], "total": 100, "page": 1, "page_size": 20}}
```

### HTTP 与业务码

| HTTP | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限 / 邮箱未验证 |
| 404 | 不存在 |
| 409 | 冲突 |
| 500 | 服务器错误 |

| code | 含义 |
|------|------|
| 40001 | 参数校验失败 |
| 40101 | 未登录或 token 无效 |
| 40301 | 邮箱未验证 |
| 40401 | 资源不存在或不属于当前用户 |
| 40901 | 邮箱已注册 |
| 42201 | AI 暂不可用（若仍返回 Mock 建议则用 200 + `source: "mock"`） |

### 鉴权

除注明「公开」的接口外，请求头：

```http
Authorization: Bearer <access_token>
```

### 时间与 ID

- ID：UUID 字符串  
- 时间：ISO 8601 UTC，如 `2026-08-29T13:14:00Z`  
- 日期：`YYYY-MM-DD`

---

## 接口清单

### GET /api/health

**公开。** 基础设施探活。

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"status": "ok"}}
```

---

## 认证与账号

### POST /api/auth/register

**公开。**

**请求体：**

```json
{"email": "carol@mail.com", "password": "string_min_8"}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "carol@mail.com",
    "email_verified": false,
    "verification_delivery": "dev_print"
  }
}
```

`verification_delivery`：`dev_print` | `email`。开发期链接打印到后端日志。

**响应（失败 409）：**

```json
{"code": 40901, "message": "邮箱已注册", "data": null}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "密码至少 8 位", "data": null}
```

---

### POST /api/auth/login

**公开。**

**请求体：**

```json
{"email": "carol@mail.com", "password": "string", "code": "string"}
```

`code`：登录验证码（邮箱 OTP / 开发 Mock 码）。发送验证码见 `POST /api/auth/login/send-code`。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "access_token": "string",
    "token_type": "bearer",
    "expires_in": 604800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "carol@mail.com",
      "email_verified": true,
      "display_name": "Carol"
    }
  }
}
```

**响应（失败 401）：**

```json
{"code": 40101, "message": "邮箱或密码错误", "data": null}
```

**响应（失败 400 · 验证码错误）：**

```json
{"code": 40001, "message": "验证码错误或已过期", "data": null}
```

**响应（失败 403）：**

```json
{"code": 40301, "message": "邮箱未验证", "data": null}
```

---

### POST /api/auth/login/send-code

**公开。** 向已注册邮箱发送登录验证码（开发期可打印 / Mock）。

**请求体：**

```json
{"email": "carol@mail.com"}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sent": true,
    "delivery": "dev_print"
  }
}
```

**响应（失败 404）：**

```json
{"code": 40401, "message": "用户不存在", "data": null}
```

---

### POST /api/auth/logout

**鉴权。** 服务端可作废会话（若使用会话表）；纯 JWT 时可空操作。

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"ok": true}}
```

---

### GET /api/auth/me

**鉴权。**

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "carol@mail.com",
    "email_verified": true,
    "display_name": "Carol",
    "created_at": "2026-08-01T02:00:00Z"
  }
}
```

**响应（失败 401）：**

```json
{"code": 40101, "message": "未登录或 token 无效", "data": null}
```

---

### POST /api/auth/verify-email

**公开。**

**请求体：**

```json
{"token": "string"}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "email": "carol@mail.com",
    "email_verified": true
  }
}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "验证链接无效或已过期", "data": null}
```

---

### POST /api/auth/resend-verification

**公开或鉴权均可；MVP 用邮箱定位。**

**请求体：**

```json
{"email": "carol@mail.com"}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sent": true,
    "verification_delivery": "dev_print"
  }
}
```

**响应（失败 404）：**

```json
{"code": 40401, "message": "用户不存在", "data": null}
```

---

### POST /api/auth/change-password

**鉴权。**

**请求体：**

```json
{
  "current_password": "string",
  "new_password": "string_min_8"
}
```

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"ok": true}}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "当前密码不正确", "data": null}
```

---

## 标签词库

### GET /api/tags

**鉴权。** Query：`kind` = `thinking` | `emotion` | 省略=全部。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "11111111-1111-1111-1111-111111111111",
        "kind": "thinking",
        "name": "工作状态",
        "color": "#5EC8C0",
        "shape": null,
        "sort_order": 10,
        "is_system_default": true
      },
      {
        "id": "22222222-2222-2222-2222-222222222222",
        "kind": "emotion",
        "name": "平静",
        "color": "#5EC8C0",
        "shape": "calm_wave",
        "sort_order": 1,
        "is_system_default": true
      }
    ]
  }
}
```

`shape` 枚举（情绪可选）：`calm_wave` | `anxious_fuzz` | `low_mud` | `joy_blob` | null。

---

### POST /api/tags

**鉴权。**

**请求体：**

```json
{"kind": "thinking", "name": "自定义话题", "color": "#E85D4C", "shape": null}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "33333333-3333-3333-3333-333333333333",
    "kind": "thinking",
    "name": "自定义话题",
    "color": "#E85D4C",
    "shape": null,
    "sort_order": 100,
    "is_system_default": false
  }
}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "同名标签已存在", "data": null}
```

---

### PATCH /api/tags/{tag_id}

**鉴权。**

**请求体（均可选）：**

```json
{"name": "工作状态", "color": "#5EC8C0", "shape": "calm_wave", "sort_order": 10}
```

**响应（成功 200）：** 同创建返回的 tag 对象。

**响应（失败 404）：**

```json
{"code": 40401, "message": "标签不存在", "data": null}
```

---

### DELETE /api/tags/{tag_id}

**鉴权。** 软删或硬删均可；若仍被引用，MVP 允许删除并解除关联。前端在词库删除前应先调 usage 提示关联数。

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"ok": true}}
```

---

### GET /api/tags/{tag_id}/usage

**鉴权。** 返回该标签当前关联规模，供词库删除确认弹窗使用。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "entry_count": 2,
    "highlight_count": 5,
    "content_count": 3
  }
}
```

- `entry_count`：篇级 `entry_tags` 条数  
- `highlight_count`：划线 `highlight_tags` 条数  
- `content_count`：去重后的关联日记篇数（篇级 ∪ 划线所属日记）

---

## 日记 Entry

### EntryDTO

```json
{
  "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "title": "关于工作节奏",
  "body": "今天开完会后有点空。",
  "event_date": "2026-08-29",
  "tags": [
    {"id": "11111111-1111-1111-1111-111111111111", "kind": "thinking", "name": "工作状态"},
    {"id": "22222222-2222-2222-2222-222222222222", "kind": "emotion", "name": "平静"}
  ],
  "excerpt": "今天开完会后有点空。",
  "created_at": "2026-08-29T10:00:00Z",
  "updated_at": "2026-08-29T13:14:00Z"
}
```

`body`：字符串；可为纯文本，或受限 HTML（换行/`<br>`/`<div>`、`<strong>`、`<span style="color:…">`、高亮 `<mark data-hl-id>`）。列表 `excerpt` 取纯文本前 80 字。

能量字段 `engagement` / `drain`：`number`，范围 **0–5，步进 0.5**（如 `3.5` 表示三颗半）。

---

### GET /api/entries

**鉴权。** Query：

| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 默认 1 |
| page_size | int | 默认 20，最大 50 |
| tag_ids | string | 逗号分隔；多选 AND |
| q | string | MVP 可忽略（全文搜索后置） |
| event_date_from | date | 可选 |
| event_date_to | date | 可选 |

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "title": "关于工作节奏",
        "excerpt": "今天开完会后有点空。",
        "event_date": "2026-08-29",
        "tags": [
          {"id": "11111111-1111-1111-1111-111111111111", "kind": "thinking", "name": "工作状态"}
        ],
        "updated_at": "2026-08-29T13:14:00Z"
      }
    ],
    "total": 3,
    "page": 1,
    "page_size": 20
  }
}
```

---

### GET /api/entries/{entry_id}

**鉴权。**

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "title": "关于工作节奏",
    "body": "今天开完会后有点空。对着文档改了两小时。把这些碎片留下。",
    "event_date": "2026-08-29",
    "tags": [
      {"id": "11111111-1111-1111-1111-111111111111", "kind": "thinking", "name": "工作状态"},
      {"id": "22222222-2222-2222-2222-222222222222", "kind": "emotion", "name": "平静"}
    ],
    "highlights": [
      {
        "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "kind": "energy",
        "quote_text": "对着文档改了两小时",
        "start_offset": 12,
        "end_offset": 22,
        "engagement": 4,
        "drain": 3,
        "tags": []
      },
      {
        "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "kind": "topic_emotion",
        "quote_text": "把这些碎片留下",
        "start_offset": 23,
        "end_offset": 30,
        "engagement": null,
        "drain": null,
        "tags": [
          {"id": "11111111-1111-1111-1111-111111111111", "kind": "thinking", "name": "工作状态"},
          {"id": "22222222-2222-2222-2222-222222222222", "kind": "emotion", "name": "平静"}
        ]
      }
    ],
    "ai_suggestion": {
      "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "status": "pending",
      "source": "mock",
      "suggested_tags": [
        {"id": "11111111-1111-1111-1111-111111111112", "kind": "thinking", "name": "自我认知"},
        {"id": "22222222-2222-2222-2222-222222222223", "kind": "emotion", "name": "疲惫"}
      ]
    },
    "created_at": "2026-08-29T10:00:00Z",
    "updated_at": "2026-08-29T13:14:00Z"
  }
}
```

无待处理建议时 `ai_suggestion` 为 `null`。无能量划线时前端不展示底部能量卡。

**响应（失败 404）：**

```json
{"code": 40401, "message": "日记不存在", "data": null}
```

---

### POST /api/entries

**鉴权。**

**请求体：**

```json
{
  "title": "关于工作节奏",
  "body": "今天开完会后有点空。",
  "event_date": "2026-08-29",
  "tag_ids": ["11111111-1111-1111-1111-111111111111"]
}
```

`title` 可空字符串；服务端可默认「无标题」。`event_date` 缺省为当天（用户时区按服务端日期或客户端传入，MVP 以客户端传入为准）。

**响应（成功 200）：** 完整 Entry 详情（`highlights` 为空数组，`ai_suggestion` 可为 pending 异步后出现）。

---

### PATCH /api/entries/{entry_id}

**鉴权。**

**请求体（均可选）：**

```json
{
  "title": "关于工作节奏",
  "body": "更新后的正文",
  "event_date": "2026-08-29",
  "tag_ids": ["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]
}
```

传 `tag_ids` 时整表替换篇级标签。

**响应（成功 200）：** 完整 Entry 详情。

**响应（失败 404）：**

```json
{"code": 40401, "message": "日记不存在", "data": null}
```

---

### DELETE /api/entries/{entry_id}

**鉴权。** 软删除。

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"ok": true}}
```

---

## 划线 Highlight

### POST /api/entries/{entry_id}/highlights

**鉴权。**

**能量请求体：**

```json
{
  "kind": "energy",
  "quote_text": "对着文档改了两小时",
  "start_offset": 12,
  "end_offset": 22,
  "engagement": 4,
  "drain": 3
}
```

**话题/情绪请求体：**

```json
{
  "kind": "topic_emotion",
  "quote_text": "把这些碎片留下",
  "start_offset": 23,
  "end_offset": 30,
  "tag_ids": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    "entry_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "kind": "energy",
    "quote_text": "对着文档改了两小时",
    "start_offset": 12,
    "end_offset": 22,
    "engagement": 4,
    "drain": 3,
    "tags": [],
    "created_at": "2026-08-29T12:00:00Z",
    "updated_at": "2026-08-29T12:00:00Z"
  }
}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "energy 类型必须提供 engagement 与 drain（0-5，步进 0.5）", "data": null}
```

---

### PATCH /api/highlights/{highlight_id}

**鉴权。**

**请求体（按 kind 部分字段）：**

```json
{
  "quote_text": "对着文档改了两小时",
  "start_offset": 12,
  "end_offset": 22,
  "engagement": 5,
  "drain": 2,
  "tag_ids": ["22222222-2222-2222-2222-222222222222"]
}
```

**响应（成功 200）：** 同创建返回的 highlight 对象。

**响应（失败 404）：**

```json
{"code": 40401, "message": "标记不存在", "data": null}
```

---

### DELETE /api/highlights/{highlight_id}

**鉴权。**

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"ok": true}}
```

---

## AI 标签建议

### POST /api/entries/{entry_id}/ai-tag-suggestions

**鉴权。** 手动「重新建议」或保存后服务端内部亦可调用同一逻辑。

**请求体：**

```json
{"force": true}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
    "entry_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "status": "pending",
    "source": "mock",
    "suggested_tags": [
      {"id": "11111111-1111-1111-1111-111111111112", "kind": "thinking", "name": "自我认知"},
      {"id": "22222222-2222-2222-2222-222222222223", "kind": "emotion", "name": "疲惫"}
    ],
    "created_at": "2026-08-29T13:15:00Z"
  }
}
```

`source`：`deepseek` | `mock`。无 Key 时必须 `mock`，仍返回 200。

**响应（失败 404）：**

```json
{"code": 40401, "message": "日记不存在", "data": null}
```

---

### POST /api/entries/{entry_id}/ai-tag-suggestions/{suggestion_id}/accept

**鉴权。** 将建议标签合并进篇级标签（去重），`status=accepted`。

**请求体：**

```json
{"tag_ids": ["11111111-1111-1111-1111-111111111112", "22222222-2222-2222-2222-222222222223"]}
```

省略 `tag_ids` 表示采纳全部建议。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "accepted",
    "tags": [
      {"id": "11111111-1111-1111-1111-111111111111", "kind": "thinking", "name": "工作状态"},
      {"id": "11111111-1111-1111-1111-111111111112", "kind": "thinking", "name": "自我认知"}
    ]
  }
}
```

---

### POST /api/entries/{entry_id}/ai-tag-suggestions/{suggestion_id}/dismiss

**鉴权。**

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"status": "dismissed"}}
```

---

## 洞察

### GET /api/insights/self-awareness

**鉴权。** Query：

| 参数 | 说明 |
|------|------|
| tag_id | 思考类话题 ID；省略或 `all` 表示全部 |
| page / page_size | 分页，默认 20 |

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "filter_tag": {"id": "11111111-1111-1111-1111-111111111111", "name": "工作状态", "kind": "thinking"},
    "items": [
      {
        "entry_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "highlight_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "event_date": "2026-08-29",
        "title": "关于工作节奏",
        "excerpt": "对着文档改了两小时，专注度很高，但身体有点空",
        "tag_names": ["工作状态"]
      }
    ],
    "total": 3,
    "page": 1,
    "page_size": 20
  }
}
```

无划线摘录时可用正文摘要回退；`highlight_id` 可 null。下钻用 `entry_id` + 可选 `highlight_id`。

---

### GET /api/insights/good-times

**鉴权。** Query：

| 参数 | 说明 |
|------|------|
| limit_entries | 默认 10；最近 N 篇「含能量标记」的日记 |
| event_date_from / event_date_to | 与 limit 二选一优先用时间区间（若都传，时间优先） |
| engagement_split | 默认 2.5 |
| drain_split | 默认 2.5 |
| quadrant | 可选过滤：`high_focus_low_drain` \| `high_focus_high_drain` \| `low_focus_low_drain` \| `low_focus_high_drain` |
| sort | `asc` \| `desc`，默认 `desc`（按 event_date） |

象限规则：`engagement >= split` 为高专注；`drain >= split` 为高消耗。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "engagement_split": 2.5,
    "drain_split": 2.5,
    "points": [
      {
        "highlight_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "entry_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "title": "关于工作节奏",
        "quote_text": "对着文档改了两小时",
        "engagement": 4,
        "drain": 3,
        "quadrant": "high_focus_high_drain",
        "event_date": "2026-08-29"
      }
    ],
    "slices": [
      {
        "highlight_id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "entry_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "title": "关于工作节奏",
        "quote_text": "对着文档改了两小时",
        "engagement": 4,
        "drain": 2,
        "quadrant": "high_focus_low_drain",
        "event_date": "2026-08-29"
      }
    ]
  }
}
```

`points` 为四宫格散点全集（当前范围）；`slices` 为当前 `quadrant` 过滤后的列表（未传 quadrant 时与 points 同序全量）。

---

### GET /api/insights/quadrant-notes

**鉴权。** Query：`quadrant` 可选。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        "quadrant": "high_focus_low_drain",
        "body": "当专注高、消耗低时，我通常在写自己真正在意的事。",
        "created_at": "2026-08-30T01:00:00Z",
        "updated_at": "2026-08-30T01:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/insights/quadrant-notes

**鉴权。**

**请求体：**

```json
{
  "quadrant": "high_focus_low_drain",
  "body": "当专注高、消耗低时，我通常在写自己真正在意的事。"
}
```

**响应（成功 200）：** 单条 note 对象。

**响应（失败 400）：**

```json
{"code": 40001, "message": "quadrant 非法", "data": null}
```

---

### PATCH /api/insights/quadrant-notes/{note_id}

**鉴权。**

**请求体：**

```json
{"body": "更新后的观察", "quadrant": "high_focus_low_drain"}
```

**响应（成功 200）：** 单条 note 对象。

---

### DELETE /api/insights/quadrant-notes/{note_id}

**鉴权。**

**响应（成功 200）：**

```json
{"code": 200, "message": "success", "data": {"ok": true}}
```

---

## 导入

### POST /api/imports

**鉴权。** `multipart/form-data`：字段 `file`（`.md` / `.docx` / `.zip`）。

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "filename": "meeting-notes.md",
    "status": "parsing",
    "created_at": "2026-09-01T08:00:00Z"
  }
}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "不支持的文件类型", "data": null}
```

---

### GET /api/imports/{import_id}

**鉴权。**

**响应（成功 200 · 预览就绪）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "filename": "meeting-notes.md",
    "status": "preview",
    "error_message": null,
    "preview": {
      "entry_count": 3,
      "entries": [
        {
          "temp_id": "t1",
          "title": "关于工作节奏",
          "event_date": "2026-08-29",
          "date_inferred": true,
          "excerpt": "今天开完会后有点空……",
          "body": "# 关于工作节奏\n今天开完会后有点空……"
        }
      ]
    },
    "created_at": "2026-09-01T08:00:00Z"
  }
}
```

`status`：`uploaded` | `parsing` | `preview` | `committed` | `failed`。

**失败示例：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
    "filename": "bad.docx",
    "status": "failed",
    "error_message": "无法解析文档",
    "preview": null,
    "created_at": "2026-09-01T08:00:00Z"
  }
}
```

---

### PATCH /api/imports/{import_id}/preview

**鉴权。** 用户在预览中改正日期/标题。

**请求体：**

```json
{
  "entries": [
    {"temp_id": "t1", "title": "关于工作节奏", "event_date": "2026-08-28"}
  ]
}
```

**响应（成功 200）：** 同 GET 的 import 对象（`status` 仍为 `preview`）。

---

### POST /api/imports/{import_id}/commit

**鉴权。**

**请求体：**

```json
{"confirm": true}
```

**响应（成功 200）：**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "committed",
    "created_entry_ids": [
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaab"
    ],
    "failed": []
  }
}
```

部分失败时：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "committed",
    "created_entry_ids": ["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
    "failed": [{"temp_id": "t2", "reason": "正文为空"}]
  }
}
```

**响应（失败 400）：**

```json
{"code": 40001, "message": "当前状态不可提交", "data": null}
```
